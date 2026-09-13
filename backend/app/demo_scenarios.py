"""
NEXORA - Demo Scenarios
Pre-configured realistic conjunction scenarios for demonstration and testing
"""

from typing import List, Dict
from datetime import datetime, timedelta, timezone


def get_scenario(name: str) -> List[Dict]:
    """
    Get a pre-configured demonstration scenario
    
    Available scenarios:
    - typical: Typical operations day with moderate activity
    - high_activity: High activity period with multiple events
    - critical: Critical collision alert requiring immediate action
    - quiet: Quiet operations period with minimal risk
    - educational: Step-by-step educational demonstration
    """
    scenarios = {
        "typical": _typical_operations(),
        "high_activity": _high_activity_period(),
        "critical": _critical_collision_alert(),
        "quiet": _quiet_operations(),
        "educational": _educational_demo(),
        "default": _typical_operations(),
    }
    
    return scenarios.get(name, scenarios["default"])


def _typical_operations() -> List[Dict]:
    """
    Typical Operations Day
    Realistic moderate activity with mix of risk levels
    """
    base_time = datetime.now(timezone.utc)
    
    return [
        {
            "tca": (base_time + timedelta(hours=12, minutes=45)).isoformat(),
            "miss_distance_km": 0.82,
            "norad_id_primary": "44714",
            "norad_id_secondary": "22675",
            "relative_velocity_km_s": 14.7,
            "r_primary": [6921.0, 0.0, -200.0],
            "v_primary": [0.0, 7.6, 0.1],
            "r_secondary": [6921.574, 0.246, -199.836],
            "v_secondary": [0.0, -7.22, -0.095],
            "is_demo": True,
            "demo_scenario": "typical",
        },
        {
            "tca": (base_time + timedelta(hours=18, minutes=30)).isoformat(),
            "miss_distance_km": 2.4,
            "norad_id_primary": "44715",
            "norad_id_secondary": "22676",
            "relative_velocity_km_s": 12.3,
            "r_primary": [6925.0, 100.0, -195.0],
            "v_primary": [0.1, 7.5, 0.2],
            "r_secondary": [6926.8, 100.5, -194.2],
            "v_secondary": [0.0, -7.18, -0.1],
            "is_demo": True,
            "demo_scenario": "typical",
        },
        {
            "tca": (base_time + timedelta(hours=24, minutes=15)).isoformat(),
            "miss_distance_km": 4.8,
            "norad_id_primary": "44716",
            "norad_id_secondary": "22677",
            "relative_velocity_km_s": 10.5,
            "r_primary": [6930.0, 200.0, -190.0],
            "v_primary": [0.2, 7.4, 0.15],
            "r_secondary": [6933.1, 200.8, -189.1],
            "v_secondary": [0.1, -7.15, -0.08],
            "is_demo": True,
            "demo_scenario": "typical",
        },
        {
            "tca": (base_time + timedelta(hours=36, minutes=5)).isoformat(),
            "miss_distance_km": 12.3,
            "norad_id_primary": "44717",
            "norad_id_secondary": "22678",
            "relative_velocity_km_s": 8.2,
            "r_primary": [6940.0, 50.0, -180.0],
            "v_primary": [0.05, 7.45, 0.12],
            "r_secondary": [6948.5, 51.2, -179.3],
            "v_secondary": [0.02, -7.12, -0.06],
            "is_demo": True,
            "demo_scenario": "typical",
        },
    ]


def _high_activity_period() -> List[Dict]:
    """
    High Activity Period
    Multiple high-risk events requiring coordinated response
    """
    base_time = datetime.now(timezone.utc)
    
    return [
        {
            "tca": (base_time + timedelta(hours=4, minutes=30)).isoformat(),
            "miss_distance_km": 0.45,
            "norad_id_primary": "44714",
            "norad_id_secondary": "22675",
            "relative_velocity_km_s": 15.2,
            "r_primary": [6921.0, 0.0, -200.0],
            "v_primary": [0.0, 7.6, 0.1],
            "r_secondary": [6921.35, 0.15, -199.9],
            "v_secondary": [0.0, -7.25, -0.1],
            "is_demo": True,
            "demo_scenario": "high_activity",
        },
        {
            "tca": (base_time + timedelta(hours=6, minutes=15)).isoformat(),
            "miss_distance_km": 0.68,
            "norad_id_primary": "44715",
            "norad_id_secondary": "22676",
            "relative_velocity_km_s": 14.8,
            "r_primary": [6925.0, 100.0, -195.0],
            "v_primary": [0.1, 7.5, 0.2],
            "r_secondary": [6925.55, 100.3, -194.8],
            "v_secondary": [0.05, -7.20, -0.12],
            "is_demo": True,
            "demo_scenario": "high_activity",
        },
        {
            "tca": (base_time + timedelta(hours=8, minutes=45)).isoformat(),
            "miss_distance_km": 0.95,
            "norad_id_primary": "44716",
            "norad_id_secondary": "22677",
            "relative_velocity_km_s": 13.9,
            "r_primary": [6930.0, 200.0, -190.0],
            "v_primary": [0.2, 7.4, 0.15],
            "r_secondary": [6930.75, 200.4, -189.7],
            "v_secondary": [0.15, -7.18, -0.09],
            "is_demo": True,
            "demo_scenario": "high_activity",
        },
        {
            "tca": (base_time + timedelta(hours=10, minutes=20)).isoformat(),
            "miss_distance_km": 1.2,
            "norad_id_primary": "44717",
            "norad_id_secondary": "22678",
            "relative_velocity_km_s": 13.1,
            "r_primary": [6935.0, 150.0, -185.0],
            "v_primary": [0.15, 7.42, 0.18],
            "r_secondary": [6936.0, 150.5, -184.6],
            "v_secondary": [0.12, -7.16, -0.11],
            "is_demo": True,
            "demo_scenario": "high_activity",
        },
        {
            "tca": (base_time + timedelta(hours=12, minutes=50)).isoformat(),
            "miss_distance_km": 1.8,
            "norad_id_primary": "44718",
            "norad_id_secondary": "22679",
            "relative_velocity_km_s": 12.5,
            "r_primary": [6940.0, 50.0, -180.0],
            "v_primary": [0.05, 7.45, 0.12],
            "r_secondary": [6941.5, 50.7, -179.5],
            "v_secondary": [0.08, -7.14, -0.08],
            "is_demo": True,
            "demo_scenario": "high_activity",
        },
    ]


def _critical_collision_alert() -> List[Dict]:
    """
    Critical Collision Alert
    Emergency scenario requiring immediate action
    """
    base_time = datetime.now(timezone.utc)
    
    return [
        {
            "tca": (base_time + timedelta(hours=2, minutes=15)).isoformat(),
            "miss_distance_km": 0.35,
            "norad_id_primary": "44714",
            "norad_id_secondary": "22675",
            "relative_velocity_km_s": 15.8,
            "r_primary": [6921.0, 0.0, -200.0],
            "v_primary": [0.0, 7.6, 0.1],
            "r_secondary": [6921.28, 0.12, -199.92],
            "v_secondary": [0.0, -7.28, -0.11],
            "is_demo": True,
            "demo_scenario": "critical",
        },
    ]


def _quiet_operations() -> List[Dict]:
    """
    Quiet Operations Period
    Minimal risk, routine monitoring
    """
    base_time = datetime.now(timezone.utc)
    
    return [
        {
            "tca": (base_time + timedelta(hours=48, minutes=30)).isoformat(),
            "miss_distance_km": 25.7,
            "norad_id_primary": "44714",
            "norad_id_secondary": "22675",
            "relative_velocity_km_s": 6.5,
            "r_primary": [6921.0, 0.0, -200.0],
            "v_primary": [0.0, 7.6, 0.1],
            "r_secondary": [6940.2, 8.5, -195.3],
            "v_secondary": [0.1, -7.05, -0.05],
            "is_demo": True,
            "demo_scenario": "quiet",
        },
        {
            "tca": (base_time + timedelta(hours=60, minutes=15)).isoformat(),
            "miss_distance_km": 38.2,
            "norad_id_primary": "44715",
            "norad_id_secondary": "22676",
            "relative_velocity_km_s": 5.3,
            "r_primary": [6925.0, 100.0, -195.0],
            "v_primary": [0.1, 7.5, 0.2],
            "r_secondary": [6955.8, 112.5, -188.4],
            "v_secondary": [0.15, -7.02, -0.03],
            "is_demo": True,
            "demo_scenario": "quiet",
        },
    ]


def _educational_demo() -> List[Dict]:
    """
    Educational Demonstration
    Step-by-step walkthrough with varied examples
    """
    base_time = datetime.now(timezone.utc)
    
    return [
        # Example 1: CRITICAL - Very close approach
        {
            "tca": (base_time + timedelta(hours=8, minutes=0)).isoformat(),
            "miss_distance_km": 0.5,
            "norad_id_primary": "44714",
            "norad_id_secondary": "22675",
            "relative_velocity_km_s": 15.0,
            "r_primary": [6921.0, 0.0, -200.0],
            "v_primary": [0.0, 7.6, 0.1],
            "r_secondary": [6921.4, 0.2, -199.88],
            "v_secondary": [0.0, -7.23, -0.095],
            "is_demo": True,
            "demo_scenario": "educational",
        },
        # Example 2: HIGH - Close but manageable
        {
            "tca": (base_time + timedelta(hours=16, minutes=0)).isoformat(),
            "miss_distance_km": 1.5,
            "norad_id_primary": "44715",
            "norad_id_secondary": "22676",
            "relative_velocity_km_s": 13.5,
            "r_primary": [6925.0, 100.0, -195.0],
            "v_primary": [0.1, 7.5, 0.2],
            "r_secondary": [6926.2, 100.6, -194.5],
            "v_secondary": [0.05, -7.19, -0.1],
            "is_demo": True,
            "demo_scenario": "educational",
        },
        # Example 3: MEDIUM - Enhanced monitoring
        {
            "tca": (base_time + timedelta(hours=24, minutes=0)).isoformat(),
            "miss_distance_km": 5.0,
            "norad_id_primary": "44716",
            "norad_id_secondary": "22677",
            "relative_velocity_km_s": 11.0,
            "r_primary": [6930.0, 200.0, -190.0],
            "v_primary": [0.2, 7.4, 0.15],
            "r_secondary": [6934.2, 201.2, -188.8],
            "v_secondary": [0.12, -7.16, -0.08],
            "is_demo": True,
            "demo_scenario": "educational",
        },
        # Example 4: LOW - Routine monitoring
        {
            "tca": (base_time + timedelta(hours=48, minutes=0)).isoformat(),
            "miss_distance_km": 15.0,
            "norad_id_primary": "44717",
            "norad_id_secondary": "22678",
            "relative_velocity_km_s": 8.0,
            "r_primary": [6940.0, 50.0, -180.0],
            "v_primary": [0.05, 7.45, 0.12],
            "r_secondary": [6952.5, 54.8, -176.5],
            "v_secondary": [0.08, -7.11, -0.06],
            "is_demo": True,
            "demo_scenario": "educational",
        },
    ]


def list_scenarios() -> List[Dict]:
    """List all available scenarios with descriptions"""
    return [
        {
            "name": "typical",
            "title": "Typical Operations Day",
            "description": "Realistic moderate activity with mix of risk levels",
            "event_count": 4,
            "max_risk": "CRITICAL",
        },
        {
            "name": "high_activity",
            "title": "High Activity Period",
            "description": "Multiple high-risk events requiring coordinated response",
            "event_count": 5,
            "max_risk": "CRITICAL",
        },
        {
            "name": "critical",
            "title": "Critical Collision Alert",
            "description": "Emergency scenario requiring immediate action",
            "event_count": 1,
            "max_risk": "CRITICAL",
        },
        {
            "name": "quiet",
            "title": "Quiet Operations Period",
            "description": "Minimal risk, routine monitoring",
            "event_count": 2,
            "max_risk": "LOW",
        },
        {
            "name": "educational",
            "title": "Educational Demonstration",
            "description": "Step-by-step walkthrough with varied examples",
            "event_count": 4,
            "max_risk": "CRITICAL",
        },
    ]
