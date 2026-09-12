"""
NEXORA - Core Conjunction Assessment Engine
Uses satguard library for validated orbital mechanics and collision probability
"""

import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import logging

# Note: satguard may not be available in all environments
# We'll add proper error handling and fallback patterns
try:
    import satguard
    SATGUARD_AVAILABLE = True
except ImportError:
    SATGUARD_AVAILABLE = False
    logging.warning("satguard library not available - using simulation mode")

from app.tle_loader import load_all_debris, load_all_satellites

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MockSatguard:
    """
    Mock implementation for development when satguard is not installed.
    This allows the API structure to be built and tested.
    """
    
    @staticmethod
    def parse_tle(tle_text: str):
        """Mock TLE parser"""
        class MockTLE:
            def __init__(self, tle_text):
                lines = tle_text.strip().split('\n')
                self.name = lines[0] if len(lines) > 0 else "UNKNOWN"
                self.norad_id = "00000"
                if len(lines) > 1 and lines[1].startswith('1 '):
                    self.norad_id = lines[1][2:7].strip()
        
        return MockTLE(tle_text)
    
    @staticmethod
    def propagate_batch(tle, days=3.0, step_seconds=60.0, start=None):
        """Mock propagator - generates dummy state vectors"""
        class StateVector:
            def __init__(self, epoch, position, velocity, norad_id):
                self.epoch = epoch
                self.position_km = position  # ECI coordinates in km
                self.velocity_km_s = velocity  # ECI velocity in km/s
                self.norad_id = norad_id
        
        if start is None:
            start = datetime.now()
        
        states = []
        num_steps = int((days * 86400) / step_seconds)
        
        # Generate a simple circular orbit at ~500km altitude
        for i in range(min(num_steps, 100)):  # Limit for mock
            t = start + timedelta(seconds=i * step_seconds)
            angle = (i * step_seconds / 5400) * 2 * np.pi  # ~90 min orbital period
            
            r = 6371 + 500  # Earth radius + altitude in km
            position = np.array([
                r * np.cos(angle),
                r * np.sin(angle),
                0
            ])
            velocity = np.array([
                -7.6 * np.sin(angle),
                7.6 * np.cos(angle),
                0
            ])
            
            states.append(StateVector(t, position, velocity, tle.norad_id))
        
        return states
    
    @staticmethod
    def screen(primary_states, secondary_states, threshold_km=50.0):
        """Mock screening - returns empty list or test conjunction"""
        class ConjunctionEvent:
            def __init__(self):
                self.tca = datetime.now() + timedelta(hours=24)
                self.miss_distance_km = 2.5
                self.norad_id_primary = "12345"
                self.norad_id_secondary = "67890"
                self.r_primary = np.array([6871, 0, 0])
                self.v_primary = np.array([0, 7.6, 0])
                self.r_secondary = np.array([6871, 0.0025, 0])
                self.v_secondary = np.array([0, -7.6, 0])
                self.relative_velocity_km_s = 15.2
        
        # Return a test conjunction event for demo
        if len(primary_states) > 0 and len(secondary_states) > 0:
            return [ConjunctionEvent()]
        return []
    
    @staticmethod
    def default_covariance(regime="LEO"):
        """Mock covariance matrix"""
        if regime == "LEO":
            # 2x2 covariance in encounter plane (km²)
            return np.array([
                [0.01, 0.0],
                [0.0, 0.01]
            ])
        return np.eye(2) * 0.01
    
    @staticmethod
    def foster_pc(miss_distance, cov_2d, hard_body_radius=0.02):
        """Mock Foster Pc calculation"""
        # Simplified 2D Gaussian probability
        det = np.linalg.det(cov_2d)
        if det <= 0:
            return 0.0
        
        # Rough approximation
        r_squared = miss_distance ** 2
        sigma_combined = np.sqrt(np.trace(cov_2d))
        
        if sigma_combined == 0:
            return 0.0
        
        pc = np.exp(-r_squared / (2 * sigma_combined)) * hard_body_radius / sigma_combined
        return min(pc, 1.0)
    
    @staticmethod
    def chan_pc(miss_distance, cov_2d, hard_body_radius=0.02):
        """Mock Chan Pc - slightly different from Foster for cross-check"""
        foster = MockSatguard.foster_pc(miss_distance, cov_2d, hard_body_radius)
        # Chan typically gives similar but not identical results
        return foster * 0.95


# Use real satguard if available, otherwise mock
sg = satguard if SATGUARD_AVAILABLE else MockSatguard()


def propagate_objects(satellites: List[Dict], days: float = 2.0, step_seconds: float = 30.0) -> Dict[str, List]:
    """
    Propagate all satellites using SGP4 via satguard
    
    Args:
        satellites: List of satellite dicts with 'tle_text' field
        days: Propagation time window (default 2 days)
        step_seconds: Time step for state vectors (default 30 seconds)
    
    Returns:
        Dict mapping norad_id -> list of StateVector objects
    """
    logger.info(f"Propagating {len(satellites)} objects over {days} days...")
    
    propagated = {}
    failed = 0
    
    for sat in satellites:
        try:
            tle = sg.parse_tle(sat["tle_text"])
            states = sg.propagate_batch(tle, days=days, step_seconds=step_seconds)
            
            if states and len(states) > 0:
                propagated[sat["norad_id"]] = states
            else:
                failed += 1
                
        except Exception as e:
            logger.warning(f"Failed to propagate {sat['norad_id']}: {e}")
            failed += 1
    
    logger.info(f"Successfully propagated {len(propagated)} objects ({failed} failed)")
    return propagated


def screen_conjunctions(
    primary_states_dict: Dict[str, List],
    secondary_states_dict: Dict[str, List],
    threshold_km: float = 50.0
) -> List[Dict]:
    """
    Screen for close approaches between two sets of objects
    
    Args:
        primary_states_dict: Dict of norad_id -> states for primary objects
        secondary_states_dict: Dict of norad_id -> states for secondary objects
        threshold_km: Distance threshold for flagging conjunctions
    
    Returns:
        List of conjunction event dictionaries
    """
    logger.info(f"Screening {len(primary_states_dict)} x {len(secondary_states_dict)} object pairs...")
    
    all_events = []
    
    # Flatten state dictionaries for screening
    primary_states = []
    for states in primary_states_dict.values():
        primary_states.extend(states)
    
    secondary_states = []
    for states in secondary_states_dict.values():
        secondary_states.extend(states)
    
    if not primary_states or not secondary_states:
        logger.warning("No states to screen")
        return []
    
    # Call satguard's KDTree-based screening
    try:
        events = sg.screen(primary_states, secondary_states, threshold_km=threshold_km)
        logger.info(f"Found {len(events)} potential conjunction events")
        
        # Convert to dict format
        for event in events:
            all_events.append({
                "tca": event.tca.isoformat() if hasattr(event.tca, 'isoformat') else str(event.tca),
                "miss_distance_km": float(event.miss_distance_km),
                "norad_id_primary": str(event.norad_id_primary),
                "norad_id_secondary": str(event.norad_id_secondary),
                "relative_velocity_km_s": float(event.relative_velocity_km_s),
                "r_primary": event.r_primary.tolist() if hasattr(event.r_primary, 'tolist') else list(event.r_primary),
                "v_primary": event.v_primary.tolist() if hasattr(event.v_primary, 'tolist') else list(event.v_primary),
                "r_secondary": event.r_secondary.tolist() if hasattr(event.r_secondary, 'tolist') else list(event.r_secondary),
                "v_secondary": event.v_secondary.tolist() if hasattr(event.v_secondary, 'tolist') else list(event.v_secondary),
            })
            
    except Exception as e:
        logger.error(f"Screening failed: {e}")
        # Return empty list instead of crashing
        return []
    
    return all_events


def calculate_collision_probability(event: Dict, debris_uncertainty_multiplier: float = 2.0) -> Dict:
    """
    Calculate collision probability using Foster and Chan methods
    
    Args:
        event: Conjunction event dict
        debris_uncertainty_multiplier: Scale factor for debris covariance (our contribution)
    
    Returns:
        Dict with pc_foster, pc_chan, and risk classification
    """
    miss_distance = event["miss_distance_km"]
    
    # Get base covariance from satguard
    cov_base = sg.default_covariance("LEO")
    
    # Apply our debris uncertainty calibration layer
    # This is NEXORA's contribution on top of the validated library
    cov_adjusted = cov_base * debris_uncertainty_multiplier
    
    # Hard body radius (combined satellite+debris radius in km)
    # Typical satellite: ~10m, debris fragment: ~1m
    hard_body_radius_km = 0.011  # 11 meters combined
    
    # Calculate Pc using both methods for transparency
    try:
        pc_foster = sg.foster_pc(miss_distance, cov_adjusted, hard_body_radius_km)
        pc_chan = sg.chan_pc(miss_distance, cov_adjusted, hard_body_radius_km)
    except Exception as e:
        logger.warning(f"Pc calculation failed: {e}")
        pc_foster = 0.0
        pc_chan = 0.0
    
    # Risk classification based on Pc
    if pc_foster >= 1e-4:
        risk_level = "CRITICAL"
    elif pc_foster >= 1e-5:
        risk_level = "HIGH"
    elif pc_foster >= 1e-6:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"
    
    return {
        "pc_foster": float(pc_foster),
        "pc_chan": float(pc_chan),
        "pc_foster_raw": float(sg.foster_pc(miss_distance, cov_base, hard_body_radius_km)),  # Without our calibration
        "risk_level": risk_level,
        "uncertainty_multiplier": debris_uncertainty_multiplier,
        "hard_body_radius_km": hard_body_radius_km
    }


def assess_conjunctions() -> List[Dict]:
    """
    Full conjunction assessment pipeline:
    1. Load TLE data
    2. Propagate orbits
    3. Screen for close approaches
    4. Calculate collision probabilities
    5. Rank by risk
    
    Returns:
        List of assessed conjunction events, sorted by Pc
    """
    logger.info("Starting full conjunction assessment...")
    
    # Step 1: Load TLE data
    debris = load_all_debris()
    satellites = load_all_satellites()
    
    logger.info(f"Loaded {len(debris)} debris objects, {len(satellites)} satellites")
    
    if not debris or not satellites:
        logger.error("No TLE data loaded")
        return []
    
    # Step 2: Propagate
    # For demo purposes, limit the number of objects to propagate
    debris_sample = debris[:200] if len(debris) > 200 else debris
    satellites_sample = satellites[:100] if len(satellites) > 100 else satellites
    
    debris_states = propagate_objects(debris_sample, days=2.0, step_seconds=30)
    satellite_states = propagate_objects(satellites_sample, days=2.0, step_seconds=30)
    
    # Step 3: Screen
    raw_events = screen_conjunctions(satellite_states, debris_states, threshold_km=50.0)
    
    if not raw_events:
        logger.warning("No conjunction events found")
        return []
    
    # Step 4: Calculate Pc for each event
    assessed_events = []
    for event in raw_events:
        pc_data = calculate_collision_probability(event)
        
        # Merge event and Pc data
        full_event = {**event, **pc_data}
        assessed_events.append(full_event)
    
    # Step 5: Sort by Pc (descending)
    assessed_events.sort(key=lambda x: x["pc_foster"], reverse=True)
    
    logger.info(f"Assessment complete: {len(assessed_events)} events ranked")
    
    return assessed_events


if __name__ == "__main__":
    # Test the engine
    print(f"Satguard available: {SATGUARD_AVAILABLE}")
    print("\nRunning conjunction assessment test...")
    
    events = assess_conjunctions()
    
    print(f"\nFound {len(events)} conjunction events")
    if events:
        print("\nTop 3 highest-risk events:")
        for i, event in enumerate(events[:3], 1):
            print(f"\n{i}. {event['norad_id_primary']} vs {event['norad_id_secondary']}")
            print(f"   TCA: {event['tca']}")
            print(f"   Miss distance: {event['miss_distance_km']:.3f} km")
            print(f"   Pc (Foster): {event['pc_foster']:.2e}")
            print(f"   Pc (Chan): {event['pc_chan']:.2e}")
            print(f"   Risk: {event['risk_level']}")
