"""
NEXORA - Trajectory API Router
Endpoints for propagating and visualizing individual object trajectories
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, List, Optional
from datetime import datetime, timedelta, timezone
import logging
import numpy as np

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/trajectory/{norad_id}")
async def get_object_trajectory(
    norad_id: str,
    duration_minutes: int = 90,
    step_minutes: int = 1
) -> Dict:
    """
    Propagate and return trajectory for a single space object
    
    Args:
        norad_id: NORAD catalog ID
        duration_minutes: Propagation duration (default: 90 minutes, ~1 orbit)
        step_minutes: Time step between trajectory points (default: 1 minute)
    
    Returns:
        Dict with trajectory points (time, ECI position/velocity, lat/lng/alt)
    """
    from app.tle_loader import _tle_cache, load_tle_data
    from app.engine import propagate_sgp4_skyfield
    from skyfield.api import load
    
    # Ensure TLE data is loaded
    if not _tle_cache:
        logger.info("TLE cache empty, loading data...")
        load_tle_data()
    
    # Find satellite in cache
    satellite_obj = None
    for cat in _tle_cache.values():
        for sat in cat["satellites"]:
            if sat["norad_id"] == norad_id:
                satellite_obj = sat
                break
        if satellite_obj:
            break
    
    if not satellite_obj:
        raise HTTPException(status_code=404, detail=f"Object {norad_id} not found in TLE database")
    
    # Load timescale
    ts = load.timescale()
    
    # Propagation time window
    start_time = datetime.now(timezone.utc)
    end_time = start_time + timedelta(minutes=duration_minutes)
    
    # Generate time steps
    times = []
    current = start_time
    while current <= end_time:
        times.append(current)
        current += timedelta(minutes=step_minutes)
    
    # Propagate trajectory
    try:
        states = propagate_sgp4_skyfield(
            satellite=satellite_obj["satellite"],
            epoch_start=start_time,
            epoch_end=end_time,
            step_seconds=step_minutes * 60,
            timescale=ts
        )
    except Exception as e:
        logger.error(f"Propagation failed for {norad_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Propagation failed: {str(e)}")
    
    if not states:
        raise HTTPException(status_code=500, detail="Propagation produced no states")
    
    # Convert to trajectory points
    trajectory_points = []
    
    for state in states:
        r = state.position_km
        v = state.velocity_km_s
        
        # Convert ECI to geographic coordinates
        r_mag = float(np.linalg.norm(r))
        lat = float(np.arcsin(r[2] / r_mag) * 180 / np.pi)
        lng = float(np.arctan2(r[1], r[0]) * 180 / np.pi)
        alt = float(r_mag - 6371.0)  # Subtract Earth radius
        
        trajectory_points.append({
            "time": state.epoch.isoformat(),
            "eci_position_km": [float(r[0]), float(r[1]), float(r[2])],
            "eci_velocity_km_s": [float(v[0]), float(v[1]), float(v[2])],
            "latitude": lat,
            "longitude": lng,
            "altitude_km": alt
        })
    
    # Calculate orbital parameters
    r0 = states[0].position_km
    v0 = states[0].velocity_km_s
    mu = 398600.4418  # Earth's gravitational parameter
    
    r0_mag = float(np.linalg.norm(r0))
    v0_mag = float(np.linalg.norm(v0))
    
    # Semi-major axis from vis-viva equation
    energy = v0_mag**2 / 2 - mu / r0_mag
    semi_major_axis = -mu / (2 * energy) if energy < 0 else None
    
    # Orbital period
    orbital_period_s = 2 * np.pi * np.sqrt(semi_major_axis**3 / mu) if semi_major_axis else None
    
    return {
        "success": True,
        "norad_id": norad_id,
        "object_name": satellite_obj.get("name", "Unknown"),
        "duration_minutes": duration_minutes,
        "step_minutes": step_minutes,
        "num_points": len(trajectory_points),
        "orbital_parameters": {
            "semi_major_axis_km": round(semi_major_axis, 2) if semi_major_axis else None,
            "orbital_period_minutes": round(orbital_period_s / 60, 2) if orbital_period_s else None,
            "altitude_km": round(r0_mag - 6371.0, 2),
            "velocity_km_s": round(v0_mag, 3)
        },
        "trajectory": trajectory_points
    }


@router.get("/trajectory/compare/{norad_id_1}/{norad_id_2}")
async def compare_trajectories(
    norad_id_1: str,
    norad_id_2: str,
    duration_minutes: int = 90
) -> Dict:
    """
    Propagate and compare trajectories for two objects
    
    Useful for visualizing conjunction geometry
    
    Args:
        norad_id_1: First NORAD ID
        norad_id_2: Second NORAD ID
        duration_minutes: Propagation duration
    
    Returns:
        Dict with both trajectories and closest approach info
    """
    # Get both trajectories
    traj_1 = await get_object_trajectory(norad_id_1, duration_minutes)
    traj_2 = await get_object_trajectory(norad_id_2, duration_minutes)
    
    # Find closest approach
    min_distance = float('inf')
    tca_index = 0
    
    points_1 = traj_1["trajectory"]
    points_2 = traj_2["trajectory"]
    
    for i in range(min(len(points_1), len(points_2))):
        r1 = np.array(points_1[i]["eci_position_km"])
        r2 = np.array(points_2[i]["eci_position_km"])
        
        distance = float(np.linalg.norm(r1 - r2))
        
        if distance < min_distance:
            min_distance = distance
            tca_index = i
    
    tca_time = points_1[tca_index]["time"] if tca_index < len(points_1) else None
    
    return {
        "success": True,
        "object_1": {
            "norad_id": norad_id_1,
            "name": traj_1["object_name"],
            "trajectory": points_1
        },
        "object_2": {
            "norad_id": norad_id_2,
            "name": traj_2["object_name"],
            "trajectory": points_2
        },
        "closest_approach": {
            "time": tca_time,
            "distance_km": round(min_distance, 3),
            "index": tca_index
        },
        "duration_minutes": duration_minutes
    }


@router.get("/trajectory/batch")
async def get_batch_trajectories(
    norad_ids: str,
    duration_minutes: int = 90,
    step_minutes: int = 5
) -> Dict:
    """
    Get trajectories for multiple objects in one request
    
    Args:
        norad_ids: Comma-separated list of NORAD IDs
        duration_minutes: Propagation duration
        step_minutes: Time step (default 5 min for performance)
    
    Returns:
        Dict with trajectories for all requested objects
    """
    ids = [id.strip() for id in norad_ids.split(",")]
    
    if len(ids) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 objects per batch request")
    
    results = {}
    errors = []
    
    for norad_id in ids:
        try:
            traj = await get_object_trajectory(norad_id, duration_minutes, step_minutes)
            results[norad_id] = traj
        except Exception as e:
            errors.append({
                "norad_id": norad_id,
                "error": str(e)
            })
    
    return {
        "success": True,
        "requested": len(ids),
        "succeeded": len(results),
        "failed": len(errors),
        "trajectories": results,
        "errors": errors
    }
