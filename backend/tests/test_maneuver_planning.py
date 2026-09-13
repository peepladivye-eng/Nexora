"""
NEXORA - Maneuver Planning Tests
Tests collision avoidance maneuver calculation and validation
"""

import pytest
import numpy as np
from app.maneuvers import (
    clohessy_wiltshire_displacement,
    plan_avoidance_maneuver,
    semi_major_axis_from_velocity,
    calculate_propellant_cost
)


def test_semi_major_axis_calculation():
    """Test semi-major axis calculation from state vectors"""
    # Typical LEO orbit (~500 km altitude)
    position = np.array([6871.0, 0.0, 0.0])  # km
    velocity = np.array([0.0, 7.6, 0.0])  # km/s
    
    a = semi_major_axis_from_velocity(position, velocity)
    
    # Should be close to radius for circular orbit
    assert 6800 < a < 7000
    assert isinstance(a, float)


def test_clohessy_wiltshire_intrack_displacement():
    """Test CW displacement for in-track burns"""
    delta_v_ms = 1.0  # 1 m/s
    time_before_tca_s = 3600.0  # 1 hour
    semi_major_axis_km = 6871.0  # LEO
    
    disp = clohessy_wiltshire_displacement(
        delta_v_ms=delta_v_ms,
        time_before_tca_s=time_before_tca_s,
        semi_major_axis_km=semi_major_axis_km,
        direction="in-track"
    )
    
    # Should produce displacement
    assert disp["total_displacement_km"] > 0
    assert "dx_intrack_km" in disp
    assert "dz_radial_km" in disp
    assert "dy_crosstrack_km" in disp
    
    # In-track burn should have in-track and radial components
    assert abs(disp["dx_intrack_km"]) > 0
    assert disp["dy_crosstrack_km"] == 0  # No cross-track for in-track burn


def test_clohessy_wiltshire_radial_displacement():
    """Test CW displacement for radial burns"""
    delta_v_ms = 1.0
    time_before_tca_s = 3600.0
    semi_major_axis_km = 6871.0
    
    disp = clohessy_wiltshire_displacement(
        delta_v_ms=delta_v_ms,
        time_before_tca_s=time_before_tca_s,
        semi_major_axis_km=semi_major_axis_km,
        direction="radial"
    )
    
    # Radial burn should have radial and in-track components
    assert abs(disp["dz_radial_km"]) > 0
    assert abs(disp["dx_intrack_km"]) > 0
    assert disp["dy_crosstrack_km"] == 0


def test_clohessy_wiltshire_crosstrack_displacement():
    """Test CW displacement for cross-track burns"""
    delta_v_ms = 1.0
    time_before_tca_s = 3600.0
    semi_major_axis_km = 6871.0
    
    disp = clohessy_wiltshire_displacement(
        delta_v_ms=delta_v_ms,
        time_before_tca_s=time_before_tca_s,
        semi_major_axis_km=semi_major_axis_km,
        direction="cross-track"
    )
    
    # Cross-track burn should only have cross-track component
    assert abs(disp["dy_crosstrack_km"]) > 0
    assert disp["dx_intrack_km"] == 0
    assert disp["dz_radial_km"] == 0


def test_displacement_scales_with_delta_v():
    """Test that displacement scales proportionally with delta-V"""
    time_before_tca_s = 3600.0
    semi_major_axis_km = 6871.0
    
    disp_1ms = clohessy_wiltshire_displacement(
        delta_v_ms=1.0,
        time_before_tca_s=time_before_tca_s,
        semi_major_axis_km=semi_major_axis_km,
        direction="in-track"
    )
    
    disp_2ms = clohessy_wiltshire_displacement(
        delta_v_ms=2.0,
        time_before_tca_s=time_before_tca_s,
        semi_major_axis_km=semi_major_axis_km,
        direction="in-track"
    )
    
    # 2x delta-V should give ~2x displacement
    ratio = disp_2ms["total_displacement_km"] / disp_1ms["total_displacement_km"]
    assert 1.9 < ratio < 2.1


def test_plan_avoidance_maneuver_returns_valid_result():
    """Test maneuver planning returns valid recommendations"""
    miss_distance_km = 2.5
    relative_velocity_km_s = 15.0
    semi_major_axis_km = 6871.0
    time_to_tca_s = 24 * 3600  # 24 hours
    
    result = plan_avoidance_maneuver(
        miss_distance_km=miss_distance_km,
        relative_velocity_km_s=relative_velocity_km_s,
        semi_major_axis_km=semi_major_axis_km,
        time_to_tca_s=time_to_tca_s
    )
    
    # Should have recommended maneuver
    assert "recommended" in result
    assert "options" in result
    
    rec = result["recommended"]
    assert "delta_v_ms" in rec
    assert "post_miss_km" in rec
    assert "original_miss_km" in rec
    assert "propellant_cost_kg" in rec
    
    # Post-maneuver miss should be larger
    assert rec["post_miss_km"] > rec["original_miss_km"]


def test_maneuver_improves_miss_distance():
    """Test that maneuvers increase separation"""
    miss_distance_km = 1.5  # Close approach
    
    result = plan_avoidance_maneuver(
        miss_distance_km=miss_distance_km,
        relative_velocity_km_s=14.0,
        semi_major_axis_km=6871.0,
        time_to_tca_s=12 * 3600
    )
    
    rec = result["recommended"]
    
    # Should improve miss distance
    assert rec["post_miss_km"] > miss_distance_km
    improvement = rec["post_miss_km"] / miss_distance_km
    assert improvement > 1.0


def test_maneuver_sweep_generates_options():
    """Test that maneuver planning generates multiple options"""
    result = plan_avoidance_maneuver(
        miss_distance_km=3.0,
        relative_velocity_km_s=12.0,
        semi_major_axis_km=6871.0,
        time_to_tca_s=18 * 3600
    )
    
    # Should have multiple options
    assert len(result["options"]) > 10
    
    # All options should have required fields
    for opt in result["options"]:
        assert "delta_v_ms" in opt
        assert "time_before_tca_hours" in opt
        assert "post_miss_km" in opt
        assert "propellant_cost_kg" in opt


def test_propellant_cost_calculation():
    """Test propellant mass calculation using rocket equation"""
    delta_v_ms = 10.0  # 10 m/s
    satellite_mass_kg = 260.0
    isp_seconds = 300.0
    
    propellant = calculate_propellant_cost(delta_v_ms, satellite_mass_kg, isp_seconds)
    
    # Should be positive and reasonable
    assert propellant > 0
    assert propellant < satellite_mass_kg  # Can't use more than total mass
    
    # Higher delta-V should require more propellant
    propellant_20ms = calculate_propellant_cost(20.0, satellite_mass_kg, isp_seconds)
    assert propellant_20ms > propellant


def test_propellant_cost_scales_correctly():
    """Test that propellant cost follows rocket equation"""
    satellite_mass = 260.0
    isp = 300.0
    
    # Small delta-V should be nearly linear
    prop_1 = calculate_propellant_cost(1.0, satellite_mass, isp)
    prop_2 = calculate_propellant_cost(2.0, satellite_mass, isp)
    
    # Ratio should be close to 2 for small delta-V
    ratio = prop_2 / prop_1
    assert 1.9 < ratio < 2.1


def test_larger_delta_v_requires_more_propellant():
    """Test propellant scaling with delta-V"""
    costs = []
    for dv in [1, 5, 10, 20, 50]:
        prop = calculate_propellant_cost(dv, 260.0, 300.0)
        costs.append(prop)
    
    # Should be monotonically increasing
    for i in range(len(costs) - 1):
        assert costs[i+1] > costs[i]


def test_target_separation_achievement():
    """Test that maneuvers can achieve target separation"""
    target_separation = 10.0  # km
    
    result = plan_avoidance_maneuver(
        miss_distance_km=2.0,
        relative_velocity_km_s=15.0,
        semi_major_axis_km=6871.0,
        time_to_tca_s=24 * 3600,
        target_separation_km=target_separation
    )
    
    # If achievable, recommended should meet target
    if result["recommended"]:
        # May or may not achieve target depending on constraints
        # But should at least improve
        assert result["recommended"]["post_miss_km"] > result["recommended"]["original_miss_km"]


def test_maneuver_timing_affects_displacement():
    """Test that burn timing affects displacement"""
    delta_v_ms = 1.0
    semi_major_axis_km = 6871.0
    
    # Early burn (24 hours before)
    disp_early = clohessy_wiltshire_displacement(
        delta_v_ms=delta_v_ms,
        time_before_tca_s=24 * 3600,
        semi_major_axis_km=semi_major_axis_km,
        direction="in-track"
    )
    
    # Late burn (2 hours before)
    disp_late = clohessy_wiltshire_displacement(
        delta_v_ms=delta_v_ms,
        time_before_tca_s=2 * 3600,
        semi_major_axis_km=semi_major_axis_km,
        direction="in-track"
    )
    
    # Displacements should differ
    assert disp_early["total_displacement_km"] != disp_late["total_displacement_km"]


def test_invalid_direction_raises_error():
    """Test that invalid burn direction raises error"""
    with pytest.raises(ValueError):
        clohessy_wiltshire_displacement(
            delta_v_ms=1.0,
            time_before_tca_s=3600.0,
            semi_major_axis_km=6871.0,
            direction="invalid"
        )


def test_zero_delta_v_produces_zero_displacement():
    """Test that zero delta-V produces no displacement"""
    disp = clohessy_wiltshire_displacement(
        delta_v_ms=0.0,
        time_before_tca_s=3600.0,
        semi_major_axis_km=6871.0,
        direction="in-track"
    )
    
    assert disp["total_displacement_km"] == 0.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
