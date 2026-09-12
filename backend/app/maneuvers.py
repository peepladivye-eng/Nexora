"""
NEXORA - Maneuver Planning Module
Clohessy-Wiltshire (CW) equations for optimal collision avoidance maneuvers
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


def orbital_period_from_semi_major_axis(semi_major_axis_km: float) -> float:
    """
    Calculate orbital period from semi-major axis
    
    Args:
        semi_major_axis_km: Semi-major axis in km
    
    Returns:
        Orbital period in seconds
    """
    mu = 398600.4418  # Earth's gravitational parameter (km³/s²)
    period = 2 * np.pi * np.sqrt(semi_major_axis_km**3 / mu)
    return period


def semi_major_axis_from_velocity(position_km: np.ndarray, velocity_km_s: np.ndarray) -> float:
    """
    Calculate semi-major axis from position and velocity vectors
    
    Args:
        position_km: Position vector in ECI (km)
        velocity_km_s: Velocity vector in ECI (km/s)
    
    Returns:
        Semi-major axis in km
    """
    mu = 398600.4418  # Earth's gravitational parameter (km³/s²)
    
    r = np.linalg.norm(position_km)
    v = np.linalg.norm(velocity_km_s)
    
    # Vis-viva equation: v² = μ(2/r - 1/a)
    # Solving for a: a = 1 / (2/r - v²/μ)
    energy = v**2 / 2 - mu / r
    semi_major_axis = -mu / (2 * energy)
    
    return semi_major_axis


def clohessy_wiltshire_displacement(
    delta_v_ms: float,
    time_before_tca_s: float,
    semi_major_axis_km: float,
    direction: str = "in-track"
) -> Dict[str, float]:
    """
    Calculate displacement from a Clohessy-Wiltshire impulsive maneuver
    
    CW equations describe relative motion in a local vertical/local horizontal frame:
    - Radial (z): perpendicular to orbit, towards/away from Earth
    - In-track (x): along velocity vector
    - Cross-track (y): perpendicular to orbital plane
    
    Args:
        delta_v_ms: Delta-V magnitude in m/s
        time_before_tca_s: Time before TCA when burn occurs (seconds)
        semi_major_axis_km: Semi-major axis of the orbit (km)
        direction: Burn direction ("in-track", "radial", or "cross-track")
    
    Returns:
        Dict with displacement components (km) at TCA
    """
    # Convert delta-v to km/s
    delta_v_km_s = delta_v_ms / 1000.0
    
    # Mean motion (rad/s)
    mu = 398600.4418
    n = np.sqrt(mu / semi_major_axis_km**3)
    
    # Time until TCA
    t = time_before_tca_s
    
    # CW propagation depends on burn direction
    if direction == "in-track":
        # In-track burn (along velocity)
        # δx(t) = (4 - 3cos(nt))δv₀/n
        # δz(t) = 2sin(nt)δv₀/n (where z is radial)
        dx = (4 - 3 * np.cos(n * t)) * delta_v_km_s / n
        dz = 2 * np.sin(n * t) * delta_v_km_s / n
        dy = 0
        
    elif direction == "radial":
        # Radial burn (perpendicular to orbit, towards/away from Earth)
        # δz(t) = 4sin(nt) - 3ntδv₀/n
        # δx(t) = -2(1 - cos(nt))δv₀/n
        dz = (4 * np.sin(n * t) - 3 * n * t) * delta_v_km_s / n
        dx = -2 * (1 - np.cos(n * t)) * delta_v_km_s / n
        dy = 0
        
    elif direction == "cross-track":
        # Cross-track burn (perpendicular to orbital plane)
        # δy(t) = cos(nt)δv₀/n
        dy = np.cos(n * t) * delta_v_km_s / n
        dx = 0
        dz = 0
        
    else:
        raise ValueError(f"Unknown direction: {direction}")
    
    return {
        "dx_intrack_km": float(dx),
        "dz_radial_km": float(dz),
        "dy_crosstrack_km": float(dy),
        "total_displacement_km": float(np.sqrt(dx**2 + dy**2 + dz**2))
    }


def plan_avoidance_maneuver(
    miss_distance_km: float,
    relative_velocity_km_s: float,
    semi_major_axis_km: float,
    time_to_tca_s: float,
    target_separation_km: float = 5.0
) -> Dict:
    """
    Plan an optimal avoidance maneuver using CW equations
    
    Strategy: In-track burns are most fuel-efficient for changing miss distance.
    We sweep delta-v and burn timing to find options that increase separation.
    
    Args:
        miss_distance_km: Current predicted miss distance
        relative_velocity_km_s: Relative velocity magnitude
        semi_major_axis_km: Semi-major axis of primary satellite orbit
        time_to_tca_s: Time until TCA
        target_separation_km: Desired miss distance after maneuver
    
    Returns:
        Dict with recommended maneuver parameters and sweep of options
    """
    # Mean motion
    mu = 398600.4418
    n = np.sqrt(mu / semi_major_axis_km**3)
    orbital_period_s = 2 * np.pi / n
    
    # Sweep parameters
    delta_v_range = np.linspace(0.01, 1.0, 20)  # 0.01 to 1.0 m/s
    
    # Burn timing: from 10% to 90% of time to TCA
    # (too early wastes fuel on long propagation, too late doesn't help)
    time_range = np.linspace(0.1 * time_to_tca_s, 0.9 * time_to_tca_s, 20)
    
    options = []
    
    for dv in delta_v_range:
        for t_burn in time_range:
            if t_burn <= 0:
                continue
            
            # Calculate displacement from in-track burn
            disp = clohessy_wiltshire_displacement(
                delta_v_ms=dv,
                time_before_tca_s=t_burn,
                semi_major_axis_km=semi_major_axis_km,
                direction="in-track"
            )
            
            # New miss distance (approximate - assumes displacement adds orthogonally)
            new_miss_km = np.sqrt(miss_distance_km**2 + disp["total_displacement_km"]**2)
            
            # Fuel cost (rocket equation): Δm/m = 1 - exp(-Δv/ve)
            # For typical ion/chemical propulsion: ve ≈ 3000 m/s (Isp ~ 300s)
            # Assuming 260 kg satellite
            satellite_mass_kg = 260.0
            exhaust_velocity_m_s = 3000.0
            propellant_kg = satellite_mass_kg * (1 - np.exp(-dv / exhaust_velocity_m_s))
            
            options.append({
                "delta_v_ms": float(dv),
                "time_before_tca_s": float(t_burn),
                "time_before_tca_hours": float(t_burn / 3600),
                "original_miss_km": float(miss_distance_km),
                "post_miss_km": float(new_miss_km),
                "displacement_km": float(disp["total_displacement_km"]),
                "propellant_cost_kg": float(propellant_kg),
                "direction": "in-track"
            })
    
    # Sort by post-miss distance (descending) then by fuel cost (ascending)
    options.sort(key=lambda x: (-x["post_miss_km"], x["propellant_cost_kg"]))
    
    # Recommended: cheapest option that achieves target separation
    recommended = None
    for opt in sorted(options, key=lambda x: x["propellant_cost_kg"]):
        if opt["post_miss_km"] >= target_separation_km:
            recommended = opt
            break
    
    if recommended is None:
        # If no option achieves target, take the best we can get
        recommended = options[0]
    
    return {
        "recommended": recommended,
        "options": options,
        "target_separation_km": target_separation_km,
        "action_required": miss_distance_km < target_separation_km
    }


def calculate_propellant_cost(delta_v_ms: float, satellite_mass_kg: float = 260.0, isp_seconds: float = 300.0) -> float:
    """
    Calculate propellant mass required for a maneuver using rocket equation
    
    Δm = m₀(1 - e^(-Δv/ve))
    where ve = Isp * g₀
    
    Args:
        delta_v_ms: Delta-V in m/s
        satellite_mass_kg: Satellite wet mass
        isp_seconds: Specific impulse in seconds
    
    Returns:
        Propellant mass in kg
    """
    g0 = 9.80665  # Standard gravity (m/s²)
    exhaust_velocity = isp_seconds * g0
    
    propellant = satellite_mass_kg * (1 - np.exp(-delta_v_ms / exhaust_velocity))
    return float(propellant)


def recompute_trajectory_with_maneuver(
    original_states: List,
    maneuver: Dict,
    tca_time: datetime,
    semi_major_axis_km: float
) -> List[Dict]:
    """
    Recompute trajectory after applying a maneuver
    
    This is a simplified version - in reality would re-propagate with SGP4
    after applying delta-v to the state vector.
    
    Args:
        original_states: List of StateVector objects
        maneuver: Maneuver dict with delta_v_ms, time_before_tca_s, direction
        tca_time: Time of closest approach
        semi_major_axis_km: Orbital semi-major axis
    
    Returns:
        List of trajectory points with lat/lng/alt for visualization
    """
    # Simplified: apply CW displacement to states near TCA
    # In a full implementation, would apply delta-v and re-propagate
    
    corrected_trajectory = []
    
    for state in original_states:
        # Calculate displacement based on time relative to TCA
        time_diff = (tca_time - state.epoch).total_seconds()
        
        if time_diff > 0:  # Before TCA
            # Calculate CW displacement
            disp = clohessy_wiltshire_displacement(
                delta_v_ms=maneuver["delta_v_ms"],
                time_before_tca_s=min(time_diff, maneuver["time_before_tca_s"]),
                semi_major_axis_km=semi_major_axis_km,
                direction=maneuver.get("direction", "in-track")
            )
            
            # Apply displacement (simplified - in reality would transform to ECI)
            # For now, just offset position slightly for visualization
            position_offset = np.array([
                disp["dx_intrack_km"] * 0.1,  # Scale down for visualization
                disp["dy_crosstrack_km"] * 0.1,
                disp["dz_radial_km"] * 0.1
            ])
            
            adjusted_position = state.position_km + position_offset
        else:
            adjusted_position = state.position_km
        
        # Convert ECI to geographic coordinates (simplified)
        # In reality would use proper coordinate transformation
        r = np.linalg.norm(adjusted_position)
        lat = np.arcsin(adjusted_position[2] / r) * 180 / np.pi
        lng = np.arctan2(adjusted_position[1], adjusted_position[0]) * 180 / np.pi
        alt = r - 6371.0  # Subtract Earth radius
        
        corrected_trajectory.append({
            "time": state.epoch.isoformat(),
            "lat": float(lat),
            "lng": float(lng),
            "alt": float(alt)
        })
    
    return corrected_trajectory


if __name__ == "__main__":
    # Test maneuver planning
    print("Testing NEXORA Maneuver Planning...")
    
    # Typical LEO parameters
    miss_distance = 2.5  # km
    relative_velocity = 15.0  # km/s
    semi_major_axis = 6371 + 500  # 500 km altitude
    time_to_tca = 24 * 3600  # 24 hours
    
    print(f"\nScenario:")
    print(f"  Miss distance: {miss_distance} km")
    print(f"  Relative velocity: {relative_velocity} km/s")
    print(f"  Time to TCA: {time_to_tca/3600:.1f} hours")
    
    result = plan_avoidance_maneuver(
        miss_distance_km=miss_distance,
        relative_velocity_km_s=relative_velocity,
        semi_major_axis_km=semi_major_axis,
        time_to_tca_s=time_to_tca
    )
    
    rec = result["recommended"]
    print(f"\nRecommended maneuver:")
    print(f"  Delta-V: {rec['delta_v_ms']:.3f} m/s")
    print(f"  Burn time: {rec['time_before_tca_hours']:.1f} hours before TCA")
    print(f"  Original miss: {rec['original_miss_km']:.2f} km")
    print(f"  Post-maneuver miss: {rec['post_miss_km']:.2f} km")
    print(f"  Propellant cost: {rec['propellant_cost_kg']:.3f} kg")
    print(f"  Improvement: {rec['post_miss_km']/rec['original_miss_km']:.1f}x")
    
    print(f"\nGenerated {len(result['options'])} maneuver options")
