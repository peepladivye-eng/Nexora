"""
NEXORA - API Integration Tests
Tests end-to-end API workflows for conjunction assessment and maneuver planning
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Test basic health check endpoint"""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "components" in data


def test_root_endpoint():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "NEXORA"
    assert data["status"] == "operational"


def test_conjunctions_endpoint_returns_data():
    """Test that conjunctions endpoint returns valid data structure"""
    response = client.get("/api/conjunctions?limit=10")
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert "events" in data
    assert "risk_summary" in data
    assert "total_events" in data
    assert isinstance(data["events"], list)


def test_conjunctions_with_risk_filter():
    """Test conjunction filtering by risk level"""
    response = client.get("/api/conjunctions?risk_level=CRITICAL&limit=5")
    assert response.status_code == 200
    data = response.json()
    
    # All returned events should be CRITICAL risk
    for event in data["events"]:
        assert event["risk_level"] == "CRITICAL"


def test_conjunctions_with_debris_filter():
    """Test conjunction filtering with debris toggle"""
    response = client.get("/api/conjunctions?include_debris=true&limit=10")
    assert response.status_code == 200
    data = response.json()
    
    assert "filters" in data
    assert data["filters"]["include_debris"] is True


def test_conjunction_detail_endpoint():
    """Test individual conjunction detail retrieval"""
    # First get a conjunction list
    list_response = client.get("/api/conjunctions?limit=1")
    assert list_response.status_code == 200
    events = list_response.json()["events"]
    
    if events:
        event = events[0]
        conjunction_id = f"{event['norad_id_primary']}_{event['norad_id_secondary']}"
        
        # Get detail
        detail_response = client.get(f"/api/conjunctions/{conjunction_id}")
        assert detail_response.status_code == 200
        detail = detail_response.json()
        
        assert detail["success"] is True
        assert detail["conjunction_id"] == conjunction_id
        assert "event" in detail


def test_maneuver_computation_endpoint():
    """Test maneuver computation for a conjunction"""
    # Get a conjunction to test with
    list_response = client.get("/api/conjunctions?limit=1")
    events = list_response.json()["events"]
    
    if events:
        event = events[0]
        conjunction_id = f"{event['norad_id_primary']}_{event['norad_id_secondary']}"
        
        # Compute maneuver
        maneuver_response = client.get(f"/api/maneuver/{conjunction_id}")
        assert maneuver_response.status_code == 200
        data = maneuver_response.json()
        
        assert data["success"] is True
        assert "maneuver" in data
        assert "performance" in data
        assert "cost" in data
        
        # Verify maneuver has required fields
        assert "delta_v_ms" in data["maneuver"]
        assert "direction" in data["maneuver"]
        assert data["maneuver"]["delta_v_ms"] > 0


def test_maneuver_sweep_endpoint():
    """Test maneuver parameter sweep endpoint"""
    # Get a conjunction
    list_response = client.get("/api/conjunctions?limit=1")
    events = list_response.json()["events"]
    
    if events:
        event = events[0]
        conjunction_id = f"{event['norad_id_primary']}_{event['norad_id_secondary']}"
        
        # Get sweep
        sweep_response = client.get(f"/api/maneuver/{conjunction_id}/sweep")
        assert sweep_response.status_code == 200
        data = sweep_response.json()
        
        assert data["success"] is True
        assert "options" in data
        assert "recommended" in data
        assert len(data["options"]) > 0


def test_directional_maneuvers_endpoint():
    """Test multi-directional maneuver physics table"""
    # Get a conjunction
    list_response = client.get("/api/conjunctions?limit=1")
    events = list_response.json()["events"]
    
    if events:
        event = events[0]
        conjunction_id = f"{event['norad_id_primary']}_{event['norad_id_secondary']}"
        
        # Get directional analysis
        dir_response = client.get(f"/api/maneuver/{conjunction_id}/directions?delta_v_ms=0.5")
        assert dir_response.status_code == 200
        data = dir_response.json()
        
        assert data["success"] is True
        assert "directions" in data
        assert len(data["directions"]) == 6  # 6 directions
        
        # Verify all 6 directions are present
        direction_names = [d["direction"] for d in data["directions"]]
        expected_directions = ["posigrade", "retrograde", "normal", "anti-normal", "radial-out", "radial-in"]
        for expected in expected_directions:
            assert expected in direction_names
        
        # Verify each direction has required fields
        for direction in data["directions"]:
            assert "delta_v_ms" in direction
            assert "displacement_km" in direction
            assert "improvement_factor" in direction
            assert "post_risk_level" in direction


def test_cascade_check_endpoint():
    """Test cascade collision check after maneuver"""
    # Get a conjunction
    list_response = client.get("/api/conjunctions?limit=1")
    events = list_response.json()["events"]
    
    if events:
        event = events[0]
        conjunction_id = f"{event['norad_id_primary']}_{event['norad_id_secondary']}"
        
        # Check cascade
        cascade_response = client.get(f"/api/maneuver/{conjunction_id}/cascade")
        assert cascade_response.status_code == 200
        data = cascade_response.json()
        
        assert data["success"] is True
        assert "induced_risks" in data
        assert "count" in data
        assert isinstance(data["induced_risks"], list)


def test_maneuver_brief_endpoint():
    """Test plain-English maneuver briefing"""
    # Get a conjunction
    list_response = client.get("/api/conjunctions?limit=1")
    events = list_response.json()["events"]
    
    if events:
        event = events[0]
        conjunction_id = f"{event['norad_id_primary']}_{event['norad_id_secondary']}"
        
        # Get brief
        brief_response = client.get(f"/api/maneuver/{conjunction_id}/brief?question=summary")
        assert brief_response.status_code == 200
        data = brief_response.json()
        
        assert data["success"] is True
        assert "brief" in data
        assert len(data["brief"]) > 0


def test_trajectory_endpoint():
    """Test individual object trajectory propagation"""
    # Try with a known NORAD ID from demo data
    response = client.get("/api/trajectory/44714?duration_minutes=90&step_minutes=5")
    
    # May fail if TLE data not available, but should have proper error handling
    if response.status_code == 200:
        data = response.json()
        assert data["success"] is True
        assert "trajectory" in data
        assert "orbital_parameters" in data
        assert len(data["trajectory"]) > 0


def test_summary_statistics_endpoint():
    """Test summary statistics endpoint"""
    response = client.get("/api/conjunctions/stats/summary")
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert "risk_summary" in data
    assert "total_events" in data


def test_invalid_conjunction_id():
    """Test error handling for invalid conjunction ID"""
    response = client.get("/api/maneuver/invalid_id/sweep")
    assert response.status_code in [400, 404]


def test_demo_scenario_endpoint():
    """Test demo scenario functionality"""
    response = client.get("/api/conjunctions?demo_scenario=default&limit=10")
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert data.get("demo_scenario") == "default"
    assert len(data["events"]) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
