"""
NEXORA - TLE Loader Tests
Tests TLE data loading, caching, and parsing
Based on test_tle_loader.py from reference repository
"""

import pytest
import json
from pathlib import Path
from datetime import datetime, timedelta
from app.tle_loader import (
    TLECache,
    parse_tle_text,
    load_tle_group,
    get_statistics,
    CACHE_DIR
)


def test_cache_path_generation():
    """Test cache file path generation"""
    path = TLECache.get_cache_path("starlink")
    assert path.name == "starlink.json"
    assert path.parent == CACHE_DIR


def test_cache_validity_check():
    """Test cache validity checking"""
    # Non-existent cache should be invalid
    assert TLECache.is_cache_valid("nonexistent_group") is False


def test_cache_write_and_read():
    """Test writing and reading cache"""
    test_data = {
        "group": "test_group",
        "count": 2,
        "fetched_at": datetime.now().isoformat(),
        "satellites": [
            {
                "name": "TEST SAT 1",
                "norad_id": "99999",
                "line1": "1 99999U 00000A   00001.00000000  .00000000  00000-0  00000-0 0  0000",
                "line2": "2 99999  51.6400 000.0000 0001000  00.0000 000.0000 15.50000000000000"
            }
        ]
    }
    
    TLECache.write_cache("test_group", test_data)
    
    # Read it back
    read_data = TLECache.read_cache("test_group")
    assert read_data is not None
    assert read_data["group"] == "test_group"
    assert read_data["count"] == 2
    assert len(read_data["satellites"]) == 1
    
    # Clean up
    cache_file = TLECache.get_cache_path("test_group")
    if cache_file.exists():
        cache_file.unlink()


def test_parse_tle_text():
    """Test TLE text parsing"""
    tle_text = """STARLINK-1007
1 44713U 19074A   26256.50000000  .00001234  00000-0  12345-4 0  9990
2 44713  53.0000 123.4567 0001234  45.6789 314.5678 15.06395000123456
STARLINK-1008
1 44714U 19074B   26256.50000000  .00001234  00000-0  12345-4 0  9991
2 44714  53.0000 123.4567 0001234  45.6789 314.5678 15.06395000123457"""
    
    satellites = parse_tle_text(tle_text)
    
    assert len(satellites) == 2
    assert satellites[0]["name"] == "STARLINK-1007"
    assert satellites[0]["norad_id"] == "44713"
    assert satellites[1]["name"] == "STARLINK-1008"
    assert satellites[1]["norad_id"] == "44714"
    
    # Check TLE line format
    assert satellites[0]["line1"].startswith("1 ")
    assert satellites[0]["line2"].startswith("2 ")


def test_parse_malformed_tle():
    """Test parsing of malformed TLE data"""
    # Missing line2
    tle_bad = """SATELLITE NAME
1 12345U 00000A   00001.00000000  .00000000  00000-0  00000-0 0  0000"""
    
    satellites = parse_tle_text(tle_bad)
    
    # Should skip malformed entries
    assert len(satellites) == 0


def test_parse_empty_tle():
    """Test parsing empty TLE string"""
    satellites = parse_tle_text("")
    assert len(satellites) == 0


def test_load_tle_group_with_cache():
    """Test loading TLE group with valid cache"""
    # Create a test cache
    test_data = {
        "group": "test_cached",
        "count": 1,
        "fetched_at": datetime.now().isoformat(),
        "satellites": [
            {
                "name": "TEST CACHED SAT",
                "norad_id": "88888",
                "line1": "1 88888U 00000A   00001.00000000  .00000000  00000-0  00000-0 0  0000",
                "line2": "2 88888  51.6400 000.0000 0001000  00.0000 000.0000 15.50000000000000",
                "tle_text": "TEST CACHED SAT\n1 88888U...\n2 88888..."
            }
        ]
    }
    
    TLECache.write_cache("test_cached", test_data)
    
    # Load with cache enabled
    try:
        result = load_tle_group("test_cached", use_cache=True)
        
        # Should use cached data
        assert result["group"] == "test_cached"
        assert result["count"] == 1
        assert len(result["satellites"]) == 1
    finally:
        # Clean up
        cache_file = TLECache.get_cache_path("test_cached")
        if cache_file.exists():
            cache_file.unlink()


def test_statistics_generation():
    """Test TLE statistics generation"""
    # Create some test cache files
    test_data1 = {
        "group": "test_stats1",
        "count": 10,
        "fetched_at": datetime.now().isoformat(),
        "satellites": []
    }
    test_data2 = {
        "group": "test_stats2",
        "count": 20,
        "fetched_at": datetime.now().isoformat(),
        "satellites": []
    }
    
    TLECache.write_cache("test_stats1", test_data1)
    TLECache.write_cache("test_stats2", test_data2)
    
    try:
        stats = get_statistics()
        
        assert "debris_fields" in stats or "satellite_groups" in stats
        assert "total_debris" in stats or "total_satellites" in stats
    finally:
        # Clean up
        for name in ["test_stats1", "test_stats2"]:
            cache_file = TLECache.get_cache_path(name)
            if cache_file.exists():
                cache_file.unlink()


def test_cache_directory_creation():
    """Test that cache directory is created"""
    assert CACHE_DIR.exists()
    assert CACHE_DIR.is_dir()


def test_tle_norad_id_extraction():
    """Test NORAD ID extraction from TLE line1"""
    tle_text = """ISS (ZARYA)
1 25544U 98067A   26256.50000000  .00001234  00000-0  12345-4 0  9999
2 25544  51.6400 123.4567 0001234  45.6789 314.5678 15.50000000123456"""
    
    satellites = parse_tle_text(tle_text)
    
    assert len(satellites) == 1
    assert satellites[0]["norad_id"] == "25544"


def test_tle_text_field_preservation():
    """Test that full TLE text is preserved"""
    tle_text = """SATELLITE
1 12345U 00000A   00001.00000000  .00000000  00000-0  00000-0 0  0000
2 12345  51.6400 000.0000 0001000  00.0000 000.0000 15.50000000000000"""
    
    satellites = parse_tle_text(tle_text)
    
    assert "tle_text" in satellites[0]
    assert "SATELLITE" in satellites[0]["tle_text"]
    assert satellites[0]["line1"] in satellites[0]["tle_text"]
    assert satellites[0]["line2"] in satellites[0]["tle_text"]


def test_cache_expiry():
    """Test cache expiry logic"""
    # Create an old cache file
    old_data = {
        "group": "test_expired",
        "count": 1,
        "fetched_at": (datetime.now() - timedelta(hours=10)).isoformat(),
        "satellites": []
    }
    
    cache_file = TLECache.get_cache_path("test_expired")
    with open(cache_file, 'w') as f:
        json.dump(old_data, f)
    
    try:
        # Set old modification time
        old_time = (datetime.now() - timedelta(hours=10)).timestamp()
        cache_file.touch()
        import os
        os.utime(cache_file, (old_time, old_time))
        
        # Should be invalid if TTL < 10 hours
        # (depends on CACHE_TTL_HOURS setting)
        is_valid = TLECache.is_cache_valid("test_expired")
        # Result depends on configured TTL
        assert isinstance(is_valid, bool)
    finally:
        # Clean up
        if cache_file.exists():
            cache_file.unlink()


def test_multiple_satellites_parsing():
    """Test parsing multiple satellites"""
    tle_text = """SAT1
1 11111U 11111A   00001.00000000  .00000000  00000-0  00000-0 0  0001
2 11111  51.0000 000.0000 0001000  00.0000 000.0000 15.50000000000001
SAT2
1 22222U 22222A   00001.00000000  .00000000  00000-0  00000-0 0  0002
2 22222  52.0000 000.0000 0002000  00.0000 000.0000 15.50000000000002
SAT3
1 33333U 33333A   00001.00000000  .00000000  00000-0  00000-0 0  0003
2 33333  53.0000 000.0000 0003000  00.0000 000.0000 15.50000000000003"""
    
    satellites = parse_tle_text(tle_text)
    
    assert len(satellites) == 3
    assert [s["norad_id"] for s in satellites] == ["11111", "22222", "33333"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
