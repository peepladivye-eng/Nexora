"""
NEXORA - Conjunctions API Router
Endpoints for querying and analyzing conjunction events
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Dict, Optional
from datetime import datetime
import logging

from app.engine import assess_conjunctions
from app.tle_loader import get_statistics

logger = logging.getLogger(__name__)

router = APIRouter()

_assessment_cache = {
    "events": [],
    "last_updated": None,
    "in_progress": False
}


def _summarise_risk(events: List[Dict]) -> Dict:
    counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for ev in events:
        k = ev.get("risk_level", "LOW")
        if k in counts:
            counts[k] += 1
    return counts


def run_assessment():
    """Background task to run conjunction assessment"""
    global _assessment_cache
    
    try:
        _assessment_cache["in_progress"] = True
        logger.info("Starting background conjunction assessment...")
        
        events = assess_conjunctions()
        
        _assessment_cache["events"] = events
        _assessment_cache["last_updated"] = datetime.now()
        _assessment_cache["in_progress"] = False
        
        logger.info(f"Assessment complete: {len(events)} events cached")
        
    except Exception as e:
        logger.error(f"Assessment failed: {e}")
        _assessment_cache["in_progress"] = False
        raise


@router.get("/conjunctions")
async def get_conjunctions(
    background_tasks: BackgroundTasks,
    risk_level: Optional[str] = None,
    limit: Optional[int] = 100,
    demo_scenario: Optional[str] = None,
) -> Dict:
    """
    Get all flagged conjunction events, sorted by collision probability
    
    Query Parameters:
    - risk_level: Filter by risk level (CRITICAL, HIGH, MEDIUM, LOW)
    - limit: Maximum number of results (default 100)
    
    Returns:
        Dict with events list, metadata, and statistics
    """
    # If demo_scenario specified, return those events immediately without touching cache
    if demo_scenario:
        from app.engine import _demo_events
        demo_evs = _demo_events(demo_scenario)
        return {
            "success": True,
            "count": len(demo_evs),
            "total_events": len(demo_evs),
            "last_updated": datetime.now().isoformat(),
            "in_progress": False,
            "demo_scenario": demo_scenario,
            "risk_summary": _summarise_risk(demo_evs),
            "tle_statistics": {},
            "events": demo_evs,
        }

    # If cache is empty or stale (>1 hour), trigger refresh
    if not _assessment_cache["events"] or \
       (_assessment_cache["last_updated"] and
        (datetime.now() - _assessment_cache["last_updated"]).seconds > 3600):

        if not _assessment_cache["in_progress"]:
            background_tasks.add_task(run_assessment)
            if not _assessment_cache["events"]:
                logger.info("First-time assessment - running synchronously")
                run_assessment()

    events = _assessment_cache["events"]
    
    # Filter by risk level if specified
    if risk_level:
        risk_level = risk_level.upper()
        events = [e for e in events if e["risk_level"] == risk_level]
    
    # Apply limit
    events = events[:limit] if limit else events
    
    # Get TLE statistics
    try:
        tle_stats = get_statistics()
    except Exception as e:
        logger.warning(f"Failed to get TLE stats: {e}")
        tle_stats = {}
    
    risk_counts = _summarise_risk(_assessment_cache["events"])
    
    return {
        "success": True,
        "count": len(events),
        "total_events": len(_assessment_cache["events"]),
        "last_updated": _assessment_cache["last_updated"].isoformat() if _assessment_cache["last_updated"] else None,
        "in_progress": _assessment_cache["in_progress"],
        "risk_summary": risk_counts,
        "tle_statistics": tle_stats,
        "events": events
    }


@router.get("/conjunctions/{conjunction_id}")
async def get_conjunction_detail(conjunction_id: str) -> Dict:
    """
    Get detailed information about a specific conjunction event
    
    conjunction_id format: "{norad_id_primary}_{norad_id_secondary}_{tca_timestamp}"
    """
    events = _assessment_cache["events"]
    
    if not events:
        raise HTTPException(status_code=404, detail="No conjunction data available")
    
    # Parse conjunction_id
    try:
        parts = conjunction_id.split("_")
        primary_id = parts[0]
        secondary_id = parts[1]
        # tca_timestamp = parts[2] if len(parts) > 2 else None
    except:
        raise HTTPException(status_code=400, detail="Invalid conjunction_id format")
    
    # Find matching event
    for event in events:
        if event["norad_id_primary"] == primary_id and event["norad_id_secondary"] == secondary_id:
            return {
                "success": True,
                "event": event,
                "conjunction_id": conjunction_id
            }
    
    raise HTTPException(status_code=404, detail="Conjunction event not found")


@router.post("/conjunctions/refresh")
async def refresh_conjunctions(background_tasks: BackgroundTasks) -> Dict:
    """
    Trigger a fresh conjunction assessment
    
    Returns immediately and runs assessment in background
    """
    if _assessment_cache["in_progress"]:
        return {
            "success": False,
            "message": "Assessment already in progress",
            "in_progress": True
        }
    
    background_tasks.add_task(run_assessment)
    
    return {
        "success": True,
        "message": "Assessment started in background",
        "in_progress": True
    }


@router.get("/conjunctions/stats/summary")
async def get_summary_statistics() -> Dict:
    """
    Get summary statistics without returning all events
    """
    events = _assessment_cache["events"]
    
    risk_counts = {
        "CRITICAL": 0,
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0
    }
    
    highest_pc = 0.0
    closest_approach = float('inf')
    
    for event in events:
        risk_level = event.get("risk_level", "LOW")
        if risk_level in risk_counts:
            risk_counts[risk_level] += 1
        
        pc = event.get("pc_foster", 0.0)
        if pc > highest_pc:
            highest_pc = pc
        
        miss = event.get("miss_distance_km", float('inf'))
        if miss < closest_approach:
            closest_approach = miss
    
    return {
        "success": True,
        "total_events": len(events),
        "last_updated": _assessment_cache["last_updated"].isoformat() if _assessment_cache["last_updated"] else None,
        "risk_summary": risk_counts,
        "highest_pc": highest_pc,
        "closest_approach_km": closest_approach if closest_approach != float('inf') else None,
        "in_progress": _assessment_cache["in_progress"]
    }
