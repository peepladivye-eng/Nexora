# NEXORA Test Suite

Comprehensive test suite for the NEXORA Orbital Collision Avoidance System backend.

## Test Structure

```
tests/
├── __init__.py                    # Test package init
├── test_api_integration.py        # End-to-end API tests
├── test_risk_calculation.py       # Risk scoring tests
├── test_maneuver_planning.py      # Maneuver calculation tests
└── test_tle_loader.py            # TLE data loading tests
```

## Test Categories

### Integration Tests (`test_api_integration.py`)
Tests the complete API workflow from request to response:
- Health check endpoints
- Conjunction assessment API
- Maneuver planning API
- Multi-directional maneuver physics
- Cascade collision checking
- Trajectory propagation
- Risk filtering and pagination

### Risk Calculation Tests (`test_risk_calculation.py`)
Tests the explainable Conjunction Risk Score system:
- Risk score bounds (0-100)
- Distance factor contribution (50% weight)
- Velocity factor contribution (30% weight)
- Urgency factor contribution (20% weight)
- Risk categorization (LOW, MEDIUM, HIGH, CRITICAL)
- Foster & Chan Pc calculation
- Debris uncertainty multiplier
- Edge cases and boundary conditions

### Maneuver Planning Tests (`test_maneuver_planning.py`)
Tests collision avoidance maneuver calculations:
- Clohessy-Wiltshire displacement equations
- In-track, radial, and cross-track maneuvers
- Delta-V scaling and timing effects
- Propellant cost calculation (rocket equation)
- Maneuver sweep generation
- Miss distance improvement validation
- Target separation achievement

### TLE Loader Tests (`test_tle_loader.py`)
Tests TLE data management:
- Cache file operations
- TLE text parsing
- NORAD ID extraction
- Cache validity checking
- Statistics generation
- Malformed data handling
- Multiple satellite parsing

## Running Tests

### Install Test Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Run All Tests
```bash
pytest
```

### Run Specific Test File
```bash
pytest tests/test_api_integration.py
pytest tests/test_risk_calculation.py
pytest tests/test_maneuver_planning.py
pytest tests/test_tle_loader.py
```

### Run with Coverage
```bash
pytest --cov=app --cov-report=html
```

### Run Specific Test Function
```bash
pytest tests/test_api_integration.py::test_health_endpoint
pytest tests/test_risk_calculation.py::test_critical_risk_scenario
```

### Run Tests by Marker
```bash
pytest -m integration  # Run integration tests only
pytest -m unit        # Run unit tests only
```

### Verbose Output
```bash
pytest -v  # Verbose
pytest -vv # Very verbose with full diff
```

## Test Coverage Goals

| Module | Target Coverage | Current Status |
|--------|----------------|----------------|
| `app/engine.py` | 80% | ✓ |
| `app/maneuvers.py` | 90% | ✓ |
| `app/tle_loader.py` | 85% | ✓ |
| `app/routers/*` | 75% | ✓ |

## Key Test Scenarios

### Critical Risk Detection
```python
def test_critical_risk_scenario():
    """Close + fast + imminent = CRITICAL"""
    event = {
        "miss_distance_km": 0.5,
        "relative_velocity_km_s": 15.0,
        "time_to_tca_hours": 2.0
    }
    result = calculate_collision_probability(event)
    assert result["risk_score"] >= 70
```

### Maneuver Validation
```python
def test_maneuver_improves_miss_distance():
    """Maneuvers must increase separation"""
    result = plan_avoidance_maneuver(
        miss_distance_km=1.5,
        relative_velocity_km_s=14.0,
        semi_major_axis_km=6871.0,
        time_to_tca_s=12 * 3600
    )
    assert result["recommended"]["post_miss_km"] > 1.5
```

### Multi-Directional Physics
```python
def test_directional_maneuvers_endpoint():
    """6-direction maneuver table"""
    response = client.get(
        f"/api/maneuver/{conj_id}/directions?delta_v_ms=0.5"
    )
    assert len(response.json()["directions"]) == 6
```

## Test Data

### Demo Scenarios
Tests use the demo scenario system for deterministic, reproducible results:
- `default`: Typical conjunction events
- `critical`: High-risk scenarios
- `multi_event`: Multiple simultaneous conjunctions

### Mock TLE Data
Test TLE data is generated with realistic orbital parameters:
- LEO orbits (~500 km altitude)
- Typical Starlink-like parameters
- Valid NORAD IDs for testing

## Continuous Integration

These tests are designed to run in CI/CD pipelines:
- Fast execution (< 30 seconds total)
- No external dependencies required
- Deterministic results
- Clear pass/fail criteria

## Troubleshooting

### Tests Fail with "No conjunction data available"
**Solution**: The test uses demo scenarios. Ensure `_demo_events()` in `engine.py` is working.

### Import Errors
**Solution**: Run tests from the `backend` directory: `cd backend && pytest`

### Skyfield Download Issues
**Solution**: Tests should work offline. If Skyfield tries to download data, check network or run with cached data.

### Cache Permission Errors
**Solution**: Ensure `backend/cache/` directory is writable.

## Contributing

When adding new features, please add corresponding tests:
1. Add test cases to appropriate test file
2. Ensure tests are isolated and repeatable
3. Use descriptive test names (`test_<what>_<expected_behavior>`)
4. Include docstrings explaining what is tested
5. Run full test suite before committing

## Reference

These tests are based on best practices from:
- [Siddhanth17/Nexora](https://github.com/Siddhanth17/Nexora) - Reference implementation
- FastAPI testing documentation
- pytest best practices
- Aerospace software verification standards

## Test Philosophy

**"Tests are documentation that never lies"**

Our tests serve three purposes:
1. **Verification**: Ensure code works correctly
2. **Documentation**: Show how APIs should be used
3. **Regression Prevention**: Catch breaking changes early

Each test should be:
- **Fast**: < 1 second per test
- **Isolated**: No dependencies on other tests
- **Repeatable**: Same input → same output
- **Self-documenting**: Clear what is being tested
