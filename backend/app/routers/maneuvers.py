"""
NEXORA - Maneuvers API Router
Endpoints for computing and analyzing avoidance maneuvers
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, List, Optional
import logging
import numpy as np

from app.maneuvers import (
    plan_avoidance_maneuver,
    semi_major_axis_from_velocity,
    recompute_trajectory_with_maneuver
)

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
        
        # Time to TCA (assume 24 hours for demo - in reality would parse from TCA timestamp)
        from datetime import datetime, timedelta
        try:
            tca = datetime.fromisoformat(event["tca"])
            time_to_tca_s = (tca - datetime.now()).total_seconds()
            if time_to_tca_s <= 0:
                time_to_tca_s = 24 * 3600  # Default to 24h if TCA is in past
        except:
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
        time_to_tca_s = max((tca - datetime.now()).total_seconds(), 24 * 3600)
    except:
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
