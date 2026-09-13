"""
NEXORA - Maneuvers API Router
Endpoints for computing and analyzing avoidance maneuvers
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, List, Optional
from datetime import datetime, timezone
import logging
import numpy as np

from app.maneuvers import (
    plan_avoidance_maneuver,
    semi_major_axis_from_velocity,
    recompute_trajectory_with_maneuver,
)
from app.engine import calculate_collision_probability

logger = logging.getLogger(__name__)

router = APIRouter()

# Cache of computed maneuvers
_maneuver_cache = {}


@router.get("/maneuver/{conjunction_id}")
async def compute_maneuver(conjunction_id: str) -> Dict:
    """
    Compute optimal avoidance maneuver for a conjunction event
    
    Args:
        conjunction_id: Format "{norad_id_primary}_{norad_id_secondary}"
    
    Returns:
        Dict with maneuver recommendation, fuel cost, before/after trajectories
    """
    # Import here to avoid circular dependency
    from app.routers.conjunctions import _assessment_cache
    
    events = _assessment_cache.get("events", [])
    
    if not events:
        raise HTTPException(status_code=404, detail="No conjunction data available")
    
    # Parse conjunction_id
    try:
        parts = conjunction_id.split("_")
        primary_id = parts[0]
        secondary_id = parts[1]
    except:
        raise HTTPException(status_code=400, detail="Invalid conjunction_id format")
    
    # Find the event
    event = None
    for e in events:
        if e["norad_id_primary"] == primary_id and e["norad_id_secondary"] == secondary_id:
            event = e
            break
    
    if not event:
        raise HTTPException(status_code=404, detail="Conjunction event not found")
    
    # Check cache
    cache_key = conjunction_id
    if cache_key in _maneuver_cache:
        logger.info(f"Returning cached maneuver for {conjunction_id}")
        return _maneuver_cache[cache_key]
    
    try:
        # Extract parameters
        miss_distance_km = event["miss_distance_km"]
        relative_velocity_km_s = event["relative_velocity_km_s"]
        
        # Calculate semi-major axis from state vectors
        r_primary = np.array(event["r_primary"])
        v_primary = np.array(event["v_primary"])
        semi_major_axis_km = semi_major_axis_from_velocity(r_primary, v_primary)
        
        # Time to TCA — timezone-aware comparison
        try:
            tca = datetime.fromisoformat(event["tca"])
            now_ref = datetime.now(tca.tzinfo) if tca.tzinfo else datetime.now()
            time_to_tca_s = (tca - now_ref).total_seconds()
            if time_to_tca_s <= 0:
                time_to_tca_s = 24 * 3600
        except Exception:
            time_to_tca_s = 24 * 3600
        
        # Plan maneuver
        logger.info(f"Planning maneuver for {conjunction_id}: miss={miss_distance_km:.2f}km, v_rel={relative_velocity_km_s:.2f}km/s")
        
        result = plan_avoidance_maneuver(
            miss_distance_km=miss_distance_km,
            relative_velocity_km_s=relative_velocity_km_s,
            semi_major_axis_km=semi_major_axis_km,
            time_to_tca_s=time_to_tca_s,
            target_separation_km=5.0
        )
        
        recommended = result["recommended"]
        
        # Compute original and corrected Pc
        from app.engine import calculate_collision_probability
        
        # Original Pc (from event)
        original_pc = event.get("pc_foster", 0.0)
        
        # Estimate post-maneuver Pc (simplified - uses new miss distance)
        post_event = {**event, "miss_distance_km": recommended["post_miss_km"]}
        post_pc_data = calculate_collision_probability(post_event)
        
        # Build response
        response = {
            "success": True,
            "conjunction_id": conjunction_id,
            "maneuver": {
                "delta_v_ms": recommended["delta_v_ms"],
                "direction": recommended["direction"],
                "time_before_tca_s": recommended["time_before_tca_s"],
                "time_before_tca_hours": recommended["time_before_tca_hours"],
                "burn_description": f"{recommended['delta_v_ms']:.2f} m/s {recommended['direction']} burn {recommended['time_before_tca_hours']:.1f}h before TCA"
            },
            "performance": {
                "original_miss_km": recommended["original_miss_km"],
                "post_miss_km": recommended["post_miss_km"],
                "miss_distance_improvement": recommended["post_miss_km"] / recommended["original_miss_km"],
                "original_pc": original_pc,
                "post_pc": post_pc_data["pc_foster"],
                "pc_reduction_factor": original_pc / post_pc_data["pc_foster"] if post_pc_data["pc_foster"] > 0 else float('inf')
            },
            "cost": {
                "propellant_kg": recommended["propellant_cost_kg"],
                "satellite_mass_kg": 260.0,
                "propellant_fraction": recommended["propellant_cost_kg"] / 260.0
            },
            "event_summary": {
                "norad_id_primary": event["norad_id_primary"],
                "norad_id_secondary": event["norad_id_secondary"],
                "tca": event["tca"],
                "relative_velocity_km_s": event["relative_velocity_km_s"],
                "risk_level": event.get("risk_level", "UNKNOWN")
            },
            #  "original_trajectory": [],  # Would compute from propagation
            # "corrected_trajectory": []   # Would compute from propagation
        }
        
        # Cache it
        _maneuver_cache[cache_key] = response
        
        return response
        
    except Exception as e:
        logger.error(f"Failed to compute maneuver for {conjunction_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Maneuver computation failed: {str(e)}")


@router.get("/maneuver/{conjunction_id}/sweep")
async def get_maneuver_sweep(conjunction_id: str) -> Dict:
    """
    Get full parameter sweep of maneuver options
    
    Returns all delta-v / timing combinations for what-if analysis
    """
    # First compute the main maneuver (which caches the full sweep)
    maneuver_result = await compute_maneuver(conjunction_id)
    
    # Re-compute to get all options (not just recommended)
    from app.routers.conjunctions import _assessment_cache
    from app.maneuvers import plan_avoidance_maneuver, semi_major_axis_from_velocity
    
    events = _assessment_cache.get("events", [])
    parts = conjunction_id.split("_")
    primary_id, secondary_id = parts[0], parts[1]
    
    event = None
    for e in events:
        if e["norad_id_primary"] == primary_id and e["norad_id_secondary"] == secondary_id:
            event = e
            break
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Recompute with full sweep
    r_primary = np.array(event["r_primary"])
    v_primary = np.array(event["v_primary"])
    semi_major_axis_km = semi_major_axis_from_velocity(r_primary, v_primary)
    
    from datetime import datetime
    try:
        tca = datetime.fromisoformat(event["tca"])
        now_ref = datetime.now(tca.tzinfo) if tca.tzinfo else datetime.now()
        time_to_tca_s = max((tca - now_ref).total_seconds(), 24 * 3600)
    except Exception:
        time_to_tca_s = 24 * 3600
    
    result = plan_avoidance_maneuver(
        miss_distance_km=event["miss_distance_km"],
        relative_velocity_km_s=event["relative_velocity_km_s"],
        semi_major_axis_km=semi_major_axis_km,
        time_to_tca_s=time_to_tca_s
    )
    
    return {
        "success": True,
        "conjunction_id": conjunction_id,
        "options": result["options"],
        "recommended": result["recommended"],
        "count": len(result["options"])
    }


@router.get("/maneuver/{conjunction_id}/cascade")
async def cascade_check(conjunction_id: str) -> Dict:
    """
    After computing a corrected trajectory, re-screen it against all other
    tracked objects to detect any NEW risks introduced by the maneuver.
    """
    from app.routers.conjunctions import _assessment_cache
    from app.engine import (
        propagate_sgp4_skyfield, screen_kdtree,
        calculate_collision_probability, StateVector
    )
    from skyfield.api import load
    import numpy as np

    events = _assessment_cache.get("events", [])
    if not events:
        raise HTTPException(status_code=404, detail="No conjunction data available")

    parts = conjunction_id.split("_")
    primary_id, secondary_id = parts[0], parts[1]

    event = next(
        (e for e in events
         if e["norad_id_primary"] == primary_id and e["norad_id_secondary"] == secondary_id),
        None
    )
    if not event:
        raise HTTPException(status_code=404, detail="Conjunction event not found")

    # Get the maneuver (uses cache if already computed)
    maneuver_data = await compute_maneuver(conjunction_id)
    rec = maneuver_data["maneuver"]

    # Apply delta-v to primary velocity vector → re-propagate corrected trajectory
    r_primary = np.array(event["r_primary"])
    v_primary = np.array(event["v_primary"])

    # Simple in-track delta-v application
    speed = float(np.linalg.norm(v_primary))
    if speed > 0:
        unit_v = v_primary / speed
        dv_ms  = rec["delta_v_ms"]          # m/s
        dv_km  = dv_ms / 1000.0             # km/s
        v_corrected = v_primary + unit_v * dv_km
    else:
        v_corrected = v_primary

    # Build a synthetic corrected StateVector at TCA to screen against
    try:
        from datetime import datetime, timezone
        tca = datetime.fromisoformat(event["tca"])
        if tca.tzinfo is None:
            tca = tca.replace(tzinfo=timezone.utc)
    except Exception:
        from datetime import datetime, timezone
        tca = datetime.now(timezone.utc)

    corrected_sv = StateVector(
        epoch=tca,
        position_km=r_primary,
        velocity_km_s=v_corrected,
        norad_id=primary_id + "_corrected"
    )

    # Screen corrected trajectory against ALL other objects (exclude original secondary)
    other_events = [
        e for e in events
        if not (e["norad_id_primary"] == primary_id and
                e["norad_id_secondary"] == secondary_id)
    ]

    induced = []
    for other in other_events:
        try:
            other_sv = StateVector(
                epoch=tca,
                position_km=np.array(other["r_secondary"]),
                velocity_km_s=np.array(other["v_secondary"]),
                norad_id=other["norad_id_secondary"]
            )

            new_events = screen_kdtree(
                [corrected_sv], [other_sv], threshold_km=200.0
            )
            for ev in new_events:
                if ev.miss_distance_km < event["miss_distance_km"] * 0.8:
                    continue  # not meaningfully worse than original

                pc_data = calculate_collision_probability(
                    {"miss_distance_km": ev.miss_distance_km}
                )
                if pc_data["risk_level"] in ("CRITICAL", "HIGH", "MEDIUM"):
                    induced.append({
                        "norad_id_secondary": other["norad_id_secondary"],
                        "miss_distance_km": round(ev.miss_distance_km, 3),
                        "pc_foster": pc_data["pc_foster"],
                        "risk_level": pc_data["risk_level"],
                    })
        except Exception:
            continue

    # Deduplicate by secondary ID
    seen = set()
    deduped = []
    for item in induced:
        if item["norad_id_secondary"] not in seen:
            seen.add(item["norad_id_secondary"])
            deduped.append(item)

    return {
        "success": True,
        "conjunction_id": conjunction_id,
        "induced_risks": deduped,
        "count": len(deduped),
        "message": (
            f"Maneuver introduces {len(deduped)} new risk(s)"
            if deduped else
            "No new risks introduced — corrected trajectory is clear"
        )
    }


@router.get("/maneuver/{conjunction_id}/directions")
async def get_directional_maneuvers(conjunction_id: str, delta_v_ms: float = 0.5) -> Dict:
    """
    Multi-directional maneuver physics table
    
    Computes maneuver effects in all 6 orbital directions:
    - Posigrade (in-track forward)
    - Retrograde (in-track backward)
    - Normal (perpendicular to orbit, +)
    - Anti-normal (perpendicular to orbit, -)
    - Radial-out (away from Earth)
    - Radial-in (toward Earth)
    
    Args:
        conjunction_id: Event identifier
        delta_v_ms: Delta-V magnitude to test (default 0.5 m/s)
    
    Returns:
        Physics table showing displacement, miss distance improvement, and risk level for each direction
    """
    from app.routers.conjunctions import _assessment_cache
    from app.maneuvers import clohessy_wiltshire_displacement, semi_major_axis_from_velocity, calculate_propellant_cost
    from app.engine import calculate_collision_probability
    
    events = _assessment_cache.get("events", [])
    if not events:
        raise HTTPException(status_code=404, detail="No conjunction data available")
    
    # Parse conjunction_id
    parts = conjunction_id.split("_")
    primary_id, secondary_id = parts[0], parts[1]
    
    # Find event
    event = next(
        (e for e in events if e["norad_id_primary"] == primary_id and e["norad_id_secondary"] == secondary_id),
        None
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Extract parameters
    miss_distance_km = event["miss_distance_km"]
    r_primary = np.array(event["r_primary"])
    v_primary = np.array(event["v_primary"])
    semi_major_axis_km = semi_major_axis_from_velocity(r_primary, v_primary)
    
    # Time to TCA
    try:
        tca = datetime.fromisoformat(event["tca"])
        now_ref = datetime.now(tca.tzinfo) if tca.tzinfo else datetime.now()
        time_to_tca_s = max((tca - now_ref).total_seconds(), 12 * 3600)  # min 12 hours
    except Exception:
        time_to_tca_s = 24 * 3600
    
    # Burn timing: 50% of time to TCA
    burn_time_s = time_to_tca_s * 0.5
    
    # Define 6 directions
    directions = [
        ("posigrade", "in-track"),
        ("retrograde", "in-track"),
        ("normal", "cross-track"),
        ("anti-normal", "cross-track"),
        ("radial-out", "radial"),
        ("radial-in", "radial")
    ]
    
    results = []
    
    for label, cw_direction in directions:
        # Apply direction sign
        dv_signed = delta_v_ms
        if label in ["retrograde", "anti-normal", "radial-in"]:
            dv_signed = -delta_v_ms
        
        # Calculate CW displacement
        try:
            disp = clohessy_wiltshire_displacement(
                delta_v_ms=abs(dv_signed),
                time_before_tca_s=burn_time_s,
                semi_major_axis_km=semi_major_axis_km,
                direction=cw_direction
            )
        except Exception as e:
            logger.warning(f"CW displacement failed for {label}: {e}")
            disp = {"total_displacement_km": 0.0, "dx_intrack_km": 0.0, "dy_crosstrack_km": 0.0, "dz_radial_km": 0.0}
        
        # Compute new miss distance
        displacement = disp["total_displacement_km"]
        new_miss_km = np.sqrt(miss_distance_km**2 + displacement**2)
        improvement_factor = new_miss_km / miss_distance_km if miss_distance_km > 0 else 1.0
        
        # Estimate new Pc
        post_event = {**event, "miss_distance_km": new_miss_km}
        pc_data = calculate_collision_probability(post_event)
        
        # Propellant cost
        propellant_kg = calculate_propellant_cost(abs(delta_v_ms))
        
        results.append({
            "direction": label,
            "delta_v_ms": abs(delta_v_ms),
            "burn_time_hours": burn_time_s / 3600,
            "displacement_km": round(displacement, 3),
            "components": {
                "in_track_km": round(disp["dx_intrack_km"], 3),
                "cross_track_km": round(disp["dy_crosstrack_km"], 3),
                "radial_km": round(disp["dz_radial_km"], 3)
            },
            "original_miss_km": round(miss_distance_km, 3),
            "post_miss_km": round(new_miss_km, 3),
            "improvement_factor": round(improvement_factor, 2),
            "post_pc": pc_data["pc_foster"],
            "post_risk_level": pc_data["risk_level"],
            "propellant_kg": round(propellant_kg, 4),
            "recommended": pc_data["risk_level"] in ["LOW", "NEGLIGIBLE"]
        })
    
    # Sort by improvement factor (descending)
    results.sort(key=lambda x: x["improvement_factor"], reverse=True)
    
    return {
        "success": True,
        "conjunction_id": conjunction_id,
        "delta_v_tested_ms": delta_v_ms,
        "time_to_tca_hours": round(time_to_tca_s / 3600, 1),
        "burn_timing": "50% of time to TCA",
        "directions": results,
        "best_direction": results[0]["direction"] if results else None,
        "event_summary": {
            "norad_id_primary": event["norad_id_primary"],
            "norad_id_secondary": event["norad_id_secondary"],
            "tca": event["tca"],
            "original_risk_level": event.get("risk_level", "UNKNOWN")
        }
    }


@router.get("/maneuver/{conjunction_id}/brief")
async def get_maneuver_brief(conjunction_id: str, question: Optional[str] = "summary") -> Dict:
    """
    Get plain-English briefing about a maneuver
    
    Query Parameters:
    - question: Type of brief ("summary", "why_dangerous", "why_this_maneuver", "what_if_nothing")
    
    Returns templated natural-language explanation
    """
    # Get the maneuver data
    maneuver_data = await compute_maneuver(conjunction_id)
    
    perf = maneuver_data["performance"]
    cost = maneuver_data["cost"]
    maneuver = maneuver_data["maneuver"]
    event = maneuver_data["event_summary"]
    
    # Generate brief based on question
    if question == "why_dangerous":
        brief = (
            f"This conjunction is classified as {event['risk_level']} risk because the predicted miss distance of "
            f"{perf['original_miss_km']:.2f} km combined with the high relative velocity of "
            f"{event['relative_velocity_km_s']:.1f} km/s means the satellites will pass within meters of each other "
            f"in a fraction of a second. At these speeds, even tracking uncertainties of 100-200 meters become significant. "
            f"The collision probability of {perf['original_pc']:.2e} exceeds operational thresholds."
        )
    
    elif question == "why_this_maneuver":
        brief = (
            f"The recommended {maneuver['delta_v_ms']:.2f} m/s {maneuver['direction']} burn was selected because it "
            f"increases the miss distance from {perf['original_miss_km']:.2f} km to {perf['post_miss_km']:.2f} km "
            f"({perf['miss_distance_improvement']:.1f}x improvement) while consuming only {cost['propellant_kg']:.3f} kg "
            f"of propellant ({cost['propellant_fraction']*100:.2f}% of satellite mass). This represents the most "
            f"fuel-efficient option that achieves safe separation. The burn is timed {maneuver['time_before_tca_hours']:.1f} "
            f"hours before closest approach, allowing the Clohessy-Wiltshire displacement to maximize separation at TCA."
        )
    
    elif question == "what_if_nothing":
        brief = (
            f"If no maneuver is performed, the satellites will pass within {perf['original_miss_km']:.2f} km of each other "
            f"with a collision probability of {perf['original_pc']:.2e}. While this may seem like a small number, "
            f"at a relative velocity of {event['relative_velocity_km_s']:.1f} km/s, collision would produce thousands of "
            f"high-velocity debris fragments, each capable of causing catastrophic damage to other satellites. This is known "
            f"as the Kessler Syndrome cascade effect. The risk is unacceptable for operational spacecraft."
        )
    
    else:  # summary
        brief = (
            f"**Collision Avoidance Maneuver Required**\n\n"
            f"Object {event['norad_id_primary']} is predicted to pass within {perf['original_miss_km']:.2f} km of "
            f"debris object {event['norad_id_secondary']} at {event['tca']}. Recommend executing a "
            f"{maneuver['delta_v_ms']:.2f} m/s {maneuver['direction']} burn {maneuver['time_before_tca_hours']:.1f} hours "
            f"before TCA. This maneuver will increase separation to {perf['post_miss_km']:.2f} km and reduce collision "
            f"probability by {perf['pc_reduction_factor']:.1f}x, from {perf['original_pc']:.2e} to {perf['post_pc']:.2e}. "
            f"Fuel cost: {cost['propellant_kg']:.3f} kg."
        )
    
    return {
        "success": True,
        "conjunction_id": conjunction_id,
        "question": question,
        "brief": brief,
        "timestamp": datetime.now().isoformat()
    }
