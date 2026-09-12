"""
NEXORA - TLE Data Loader
Fetches and caches Two-Line Element (TLE) data from CelesTrak
"""

import requests
import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cache directory
CACHE_DIR = Path(__file__).parent.parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)

# CelesTrak base URL - gp.php is the documented public API endpoint
CELESTRAK_BASE = "https://celestrak.org/NORAD/elements/gp.php"

# Confirmed debris group names from CelesTrak
DEBRIS_GROUPS = {
    "cosmos-2251-debris": "cosmos-2251-debris",  # 2009 Iridium-33/Cosmos-2251 collision
    "iridium-33-debris": "iridium-33-debris",
    "fengyun-1c-debris": "fengyun-1c-debris",    # 2007 Chinese ASAT test
}

SATELLITE_GROUPS = {
    "starlink": "starlink",
}

# Cache TTL from environment or default 6 hours
CACHE_TTL_HOURS = int(os.getenv("TLE_CACHE_TTL_HOURS", "6"))


class TLECache:
    """Simple file-based cache for TLE data"""
    
    @staticmethod
    def get_cache_path(group_name: str) -> Path:
        """Get cache file path for a group"""
        return CACHE_DIR / f"{group_name}.json"
    
    @staticmethod
    def is_cache_valid(group_name: str) -> bool:
        """Check if cache exists and is not expired"""
        cache_file = TLECache.get_cache_path(group_name)
        if not cache_file.exists():
            return False
        
        # Check file age
        mtime = datetime.fromtimestamp(cache_file.stat().st_mtime)
        age = datetime.now() - mtime
        return age < timedelta(hours=CACHE_TTL_HOURS)
    
    @staticmethod
    def read_cache(group_name: str) -> Optional[Dict]:
        """Read cached TLE data"""
        cache_file = TLECache.get_cache_path(group_name)
        if cache_file.exists():
            with open(cache_file, 'r') as f:
                return json.load(f)
        return None
    
    @staticmethod
    def write_cache(group_name: str, data: Dict):
        """Write TLE data to cache"""
        cache_file = TLECache.get_cache_path(group_name)
        with open(cache_file, 'w') as f:
            json.dump(data, f, indent=2)


def fetch_tle_from_celestrak(group_name: str) -> str:
    """
    Fetch TLE data from CelesTrak's gp.php API endpoint.
    This is the documented public API, not web scraping.
    """
    params = {
        "GROUP": group_name,
        "FORMAT": "tle"
    }
    
    logger.info(f"Fetching TLE data for group: {group_name}")
    
    try:
        response = requests.get(CELESTRAK_BASE, params=params, timeout=30)
        response.raise_for_status()
        tle_text = response.text
        
        if not tle_text or len(tle_text) < 50:
            raise ValueError(f"Empty or invalid TLE response for {group_name}")
        
        logger.info(f"Successfully fetched TLE data for {group_name} ({len(tle_text)} bytes)")
        return tle_text
        
    except requests.RequestException as e:
        logger.error(f"Failed to fetch TLE data for {group_name}: {e}")
        raise


def parse_tle_text(tle_text: str) -> List[Dict[str, str]]:
    """
    Parse TLE text into structured list of satellite objects.
    Each TLE consists of 3 lines: name, line1, line2
    """
    lines = [line.strip() for line in tle_text.strip().split('\n') if line.strip()]
    
    satellites = []
    i = 0
    while i < len(lines) - 2:
        # TLE format: name, line1 (starts with 1), line2 (starts with 2)
        name = lines[i]
        line1 = lines[i + 1]
        line2 = lines[i + 2]
        
        if line1.startswith('1 ') and line2.startswith('2 '):
            # Extract NORAD ID from line1 (columns 3-7)
            norad_id = line1[2:7].strip()
            
            satellites.append({
                "name": name,
                "norad_id": norad_id,
                "line1": line1,
                "line2": line2,
                "tle_text": f"{name}\n{line1}\n{line2}"
            })
            i += 3
        else:
            logger.warning(f"Skipping malformed TLE at line {i}: {name}")
            i += 1
    
    return satellites


def load_tle_group(group_name: str, use_cache: bool = True) -> Dict:
    """
    Load TLE data for a group, using cache if available and valid.
    
    Returns:
        Dict with 'group', 'fetched_at', 'count', 'satellites' keys
    """
    # Check cache first
    if use_cache and TLECache.is_cache_valid(group_name):
        logger.info(f"Using cached TLE data for {group_name}")
        cached_data = TLECache.read_cache(group_name)
        if cached_data:
            return cached_data
    
    # Fetch fresh data
    tle_text = fetch_tle_from_celestrak(group_name)
    satellites = parse_tle_text(tle_text)
    
    data = {
        "group": group_name,
        "fetched_at": datetime.now().isoformat(),
        "count": len(satellites),
        "satellites": satellites
    }
    
    # Cache it
    TLECache.write_cache(group_name, data)
    
    return data


def load_all_debris() -> List[Dict]:
    """Load all debris field TLE data"""
    all_debris = []
    for group_name in DEBRIS_GROUPS.values():
        try:
            data = load_tle_group(group_name)
            all_debris.extend(data["satellites"])
            logger.info(f"Loaded {data['count']} objects from {group_name}")
        except Exception as e:
            logger.error(f"Failed to load {group_name}: {e}")
    
    return all_debris


def load_all_satellites() -> List[Dict]:
    """Load all satellite constellation TLE data"""
    all_satellites = []
    for group_name in SATELLITE_GROUPS.values():
        try:
            data = load_tle_group(group_name)
            all_satellites.extend(data["satellites"])
            logger.info(f"Loaded {data['count']} objects from {group_name}")
        except Exception as e:
            logger.error(f"Failed to load {group_name}: {e}")
    
    return all_satellites


def get_statistics() -> Dict:
    """Get statistics about loaded TLE data"""
    stats = {
        "debris_fields": {},
        "satellite_groups": {},
        "total_debris": 0,
        "total_satellites": 0,
    }
    
    for group_name in DEBRIS_GROUPS.values():
        if TLECache.is_cache_valid(group_name):
            data = TLECache.read_cache(group_name)
            if data:
                stats["debris_fields"][group_name] = {
                    "count": data["count"],
                    "fetched_at": data["fetched_at"]
                }
                stats["total_debris"] += data["count"]
    
    for group_name in SATELLITE_GROUPS.values():
        if TLECache.is_cache_valid(group_name):
            data = TLECache.read_cache(group_name)
            if data:
                stats["satellite_groups"][group_name] = {
                    "count": data["count"],
                    "fetched_at": data["fetched_at"]
                }
                stats["total_satellites"] += data["count"]
    
    return stats


if __name__ == "__main__":
    # Test the loader
    print("Testing TLE Loader...")
    
    # Test debris loading
    print("\nLoading Cosmos-2251 debris...")
    cosmos_data = load_tle_group("cosmos-2251-debris", use_cache=False)
    print(f"Loaded {cosmos_data['count']} debris objects")
    print(f"First object: {cosmos_data['satellites'][0]['name']}")
    
    # Test Starlink loading
    print("\nLoading Starlink constellation...")
    starlink_data = load_tle_group("starlink", use_cache=False)
    print(f"Loaded {starlink_data['count']} Starlink satellites")
    
    print("\nCache statistics:")
    stats = get_statistics()
    print(json.dumps(stats, indent=2))
