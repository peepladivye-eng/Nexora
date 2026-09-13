"""
NEXORA - Risk Calculation Tests
Tests the explainable Conjunction Risk Score calculation
Based on test_risk.py from reference repository
"""

import pytest
from app.engine import calculate_collision_probability, conjunction_risk_score


def test_risk_score_is_bounded():
    """Test that risk scores are between 0 and 100"""
    # High risk scenario
    result = conjunction_risk_score(
        miss_distance_km=0.8,
        relative_velocity_km_s=14.7,
        time_to_tca_hours=4.0
    )
    
    assert 0 <= result["risk_score"] <= 100
    assert result["risk_category"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]


def test_critical_risk_scenario():
    """Test that close, fast, imminent events are marked CRITICAL"""
    result = conjunction_risk_score(
        miss_distance_km=0.5,  # Very close
        relative_velocity_km_s=15.0,  # High velocity
        time_to_tca_hours=2.0  # Imminent
    )
    
    # Should be high risk
    assert result["risk_score"] >= 70
    assert result["risk_category"] in ["HIGH", "CRITICAL"]
    
    # Should have score breakdown
    assert "distance_score" in result
    assert "velocity_score" in result
    assert "urgency_score" in result


def test_low_risk_scenario():
    """Test that distant, slow events are marked LOW"""
    result = conjunction_risk_score(
        miss_distance_km=50.0,  # Far
        relative_velocity_km_s=2.0,  # Slow
        time_to_tca_hours=48.0  # Distant future
    )
    
    assert result["risk_score"] < 40
    assert result["risk_category"] == "LOW"


def test_distance_factor_contribution():
    """Test that miss distance properly affects risk score"""
    # Close approach
    result_close = conjunction_risk_score(
        miss_distance_km=1.0,
        relative_velocity_km_s=10.0,
        time_to_tca_hours=12.0
    )
    
    # Far approach
    result_far = conjunction_risk_score(
        miss_distance_km=20.0,
        relative_velocity_km_s=10.0,
        time_to_tca_hours=12.0
    )
    
    # Close should have higher risk
    assert result_close["risk_score"] > result_far["risk_score"]
    assert result_close["distance_score"] > result_far["distance_score"]


def test_velocity_factor_contribution():
    """Test that relative velocity properly affects risk score"""
    # High velocity
    result_fast = conjunction_risk_score(
        miss_distance_km=5.0,
        relative_velocity_km_s=15.0,
        time_to_tca_hours=12.0
    )
    
    # Low velocity
    result_slow = conjunction_risk_score(
        miss_distance_km=5.0,
        relative_velocity_km_s=3.0,
        time_to_tca_hours=12.0
    )
    
    # Fast should have higher risk
    assert result_fast["risk_score"] > result_slow["risk_score"]
    assert result_fast["velocity_score"] > result_slow["velocity_score"]


def test_urgency_factor_contribution():
    """Test that time to TCA properly affects risk score"""
    # Imminent
    result_soon = conjunction_risk_score(
        miss_distance_km=5.0,
        relative_velocity_km_s=10.0,
        time_to_tca_hours=2.0
    )
    
    # Distant future
    result_later = conjunction_risk_score(
        miss_distance_km=5.0,
        relative_velocity_km_s=10.0,
        time_to_tca_hours=36.0
    )
    
    # Soon should have higher risk
    assert result_soon["risk_score"] > result_later["risk_score"]
    assert result_soon["urgency_score"] > result_later["urgency_score"]


def test_risk_score_components_sum_correctly():
    """Test that distance, velocity, and urgency weights add up"""
    result = conjunction_risk_score(
        miss_distance_km=3.0,
        relative_velocity_km_s=12.0,
        time_to_tca_hours=8.0
    )
    
    # Weights should be 0.5, 0.3, 0.2
    weights = result["weights"]
    assert weights["distance"] == 0.5
    assert weights["velocity"] == 0.3
    assert weights["urgency"] == 0.2
    
    # Manual calculation check
    expected_score = (
        result["distance_score"] * 0.5 +
        result["velocity_score"] * 0.3 +
        result["urgency_score"] * 0.2
    )
    assert abs(result["risk_score"] - expected_score) < 0.1


def test_foster_pc_calculation():
    """Test Foster collision probability calculation"""
    event = {
        "miss_distance_km": 2.0
    }
    result = calculate_collision_probability(event)
    
    # Should have Pc values
    assert "pc_foster" in result
    assert "pc_chan" in result
    assert result["pc_foster"] >= 0
    assert result["pc_foster"] <= 1
    
    # Closer events should have higher Pc
    event_close = {"miss_distance_km": 0.5}
    result_close = calculate_collision_probability(event_close)
    
    assert result_close["pc_foster"] > result["pc_foster"]


def test_debris_uncertainty_multiplier():
    """Test that debris uncertainty multiplier is applied"""
    event = {"miss_distance_km": 2.0}
    
    # Default multiplier
    result_default = calculate_collision_probability(event)
    
    # Higher multiplier
    result_high = calculate_collision_probability(event, debris_uncertainty_multiplier=3.0)
    
    # Should have multiplier field
    assert "uncertainty_multiplier" in result_default
    assert result_default["uncertainty_multiplier"] == 2.0
    assert result_high["uncertainty_multiplier"] == 3.0


def test_risk_level_thresholds():
    """Test risk level categorization thresholds"""
    # Test LOW threshold (0-39)
    result_low = conjunction_risk_score(
        miss_distance_km=30.0,
        relative_velocity_km_s=2.0,
        time_to_tca_hours=48.0
    )
    assert result_low["risk_category"] == "LOW"
    
    # Test boundaries exist
    test_scores = [10, 25, 35, 45, 55, 65, 75, 85, 95]
    for score_target in test_scores:
        # Create scenario that produces approximate score
        # Lower miss distance = higher score
        result = conjunction_risk_score(
            miss_distance_km=max(0.1, 10.0 - (score_target / 10.0)),
            relative_velocity_km_s=10.0,
            time_to_tca_hours=12.0
        )
        assert result["risk_category"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]


def test_edge_cases():
    """Test edge cases and boundary conditions"""
    # Zero miss distance
    result_zero = conjunction_risk_score(
        miss_distance_km=0.0,
        relative_velocity_km_s=10.0,
        time_to_tca_hours=12.0
    )
    assert 0 <= result_zero["risk_score"] <= 100
    
    # Very large miss distance
    result_far = conjunction_risk_score(
        miss_distance_km=1000.0,
        relative_velocity_km_s=10.0,
        time_to_tca_hours=12.0
    )
    assert result_far["risk_score"] < 50
    
    # Very high velocity
    result_fast = conjunction_risk_score(
        miss_distance_km=5.0,
        relative_velocity_km_s=50.0,
        time_to_tca_hours=12.0
    )
    assert 0 <= result_fast["risk_score"] <= 100


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
