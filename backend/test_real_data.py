"""
Test script to validate real TLE data and conjunction screening
"""

from app.engine import propagate_objects, screen_conjunctions, calculate_collision_probability
from app.tle_loader import load_tle_group
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

print("=" * 60)
print("NEXORA - Phase 1.5 Reality Check")
print("=" * 60)

# Load small samples for testing
print("\n1. Loading TLE data...")
cosmos_data = load_tle_group("cosmos-2251-debris")
starlink_data = load_tle_group("starlink")

print(f"   Cosmos-2251 debris: {cosmos_data['count']} objects")
print(f"   Starlink: {starlink_data['count']} objects")

# Take small samples
debris_sample = cosmos_data['satellites'][:20]  # First 20 debris objects
starlink_sample = starlink_data['satellites'][:10]  # First 10 Starlink sats

print(f"\n2. Testing with {len(debris_sample)} debris + {len(starlink_sample)} satellites...")

# Propagate
print("\n3. Propagating orbits (2 days, 60s steps)...")
print(f"   Debris sample[0]: {debris_sample[0]['norad_id']} - has keys: {list(debris_sample[0].keys())}")
print(f"   Starlink sample[0]: {starlink_sample[0]['norad_id']} - has keys: {list(starlink_sample[0].keys())}")

debris_states = propagate_objects(debris_sample, days=2.0, step_seconds=60)
starlink_states = propagate_objects(starlink_sample, days=2.0, step_seconds=60)

print(f"   Successfully propagated: {len(debris_states)} debris, {len(starlink_states)} satellites")

if len(debris_states) > 0 and len(starlink_states) > 0:
    # Show sample state
    sample_id = list(starlink_states.keys())[0]
    sample_states = starlink_states[sample_id]
    print(f"\n   Sample: Starlink {sample_id}")
    print(f"   States: {len(sample_states)} time steps")
    print(f"   First position: {sample_states[0].position_km}")
    print(f"   First velocity: {sample_states[0].velocity_km_s} km/s")
    print(f"   Velocity magnitude: {sum(v**2 for v in sample_states[0].velocity_km_s)**0.5:.2f} km/s")

# Screen for conjunctions
print("\n4. Screening for close approaches (threshold: 50 km)...")
events = screen_conjunctions(starlink_states, debris_states, threshold_km=50.0)

print(f"\n   Found {len(events)} conjunction events")

if events:
    print("\n5. Top 5 closest approaches:")
    sorted_events = sorted(events, key=lambda e: e['miss_distance_km'])
    
    for i, event in enumerate(sorted_events[:5], 1):
        print(f"\n   {i}. Miss distance: {event['miss_distance_km']:.3f} km")
        print(f"      Primary: {event['norad_id_primary']}")
        print(f"      Secondary: {event['norad_id_secondary']}")
        print(f"      TCA: {event['tca']}")
        print(f"      Relative velocity: {event['relative_velocity_km_s']:.2f} km/s")
        
        # Calculate Pc
        pc_data = calculate_collision_probability(event)
        print(f"      Pc (Foster): {pc_data['pc_foster']:.2e}")
        print(f"      Pc (Chan): {pc_data['pc_chan']:.2e}")
        print(f"      Risk level: {pc_data['risk_level']}")
else:
    print("\n   No conjunctions found in this sample.")
    print("   Trying wider threshold...")
    
    events_wide = screen_conjunctions(starlink_states, debris_states, threshold_km=100.0)
    print(f"   With 100km threshold: {len(events_wide)} events")
    
    if events_wide:
        closest = min(events_wide, key=lambda e: e['miss_distance_km'])
        print(f"\n   Closest approach: {closest['miss_distance_km']:.1f} km")

print("\n" + "=" * 60)
print("Reality check complete!")
print("=" * 60)
