"""
Pytest configuration and fixtures for NEXORA tests
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def test_client():
    """Create a test client for the FastAPI app"""
    from app.main import app
    return TestClient(app)


@pytest.fixture(scope="function")
def sample_conjunction_event():
    """Sample conjunction event for testing"""
    return {
        "tca": "2026-09-14T12:00:00+00:00",
        "miss_distance_km": 2.5,
        "norad_id_primary": "44714",
        "norad_id_secondary": "22675",
        "relative_velocity_km_s": 14.7,
        "r_primary": [6921.0, 0.0, -200.0],
        "v_primary": [0.0, 7.6, 0.1],
        "r_secondary": [6921.574, 0.246, -199.836],
        "v_secondary": [0.0, -7.22, -0.095],
        "risk_level": "HIGH",
        "pc_foster": 0.00015
    }


@pytest.fixture(scope="function")
def sample_tle_text():
    """Sample TLE data for testing"""
    return """STARLINK-1007
1 44713U 19074A   26256.50000000  .00001234  00000-0  12345-4 0  9990
2 44713  53.0000 123.4567 0001234  45.6789 314.5678 15.06395000123456
STARLINK-1008
1 44714U 19074B   26256.50000000  .00001234  00000-0  12345-4 0  9991
2 44714  53.0000 123.4567 0001234  45.6789 314.5678 15.06395000123457"""
