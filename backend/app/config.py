"""
NEXORA - Configuration Management
Central configuration for analysis parameters, risk thresholds, and system settings
"""

from typing import Dict
import os
from dataclasses import dataclass


@dataclass
class AnalysisConfig:
    """Analysis parameters for conjunction screening"""
    # Propagation settings
    OBJECT_COUNT: int = 50
    PROPAGATION_HOURS: float = 72.0
    TIME_STEP_SECONDS: float = 60.0
    
    # Screening thresholds
    COARSE_THRESHOLD_KM: float = 200.0
    FINE_THRESHOLD_KM: float = 50.0
    
    # Performance
    MAX_PARALLEL_PROPAGATIONS: int = 4
    CACHE_TTL_HOURS: int = 6


@dataclass
class RiskConfig:
    """Risk assessment parameters"""
    # Distance factor (50% weight)
    DISTANCE_BASELINE_KM: float = 10.0
    DISTANCE_WEIGHT: float = 0.5
    
    # Velocity factor (30% weight)
    VELOCITY_BASELINE_KM_S: float = 15.0
    VELOCITY_WEIGHT: float = 0.3
    
    # Urgency factor (20% weight)
    TIME_BASELINE_HOURS: float = 24.0
    URGENCY_WEIGHT: float = 0.2
    
    # Risk thresholds
    CRITICAL_THRESHOLD: int = 85
    HIGH_THRESHOLD: int = 70
    MEDIUM_THRESHOLD: int = 40
    LOW_THRESHOLD: int = 0


@dataclass
class ManeuverConfig:
    """Maneuver planning parameters"""
    # Delta-V constraints
    MAX_DELTA_V_M_S: float = 50.0
    MIN_DELTA_V_M_S: float = 0.01
    
    # Timing constraints
    MANEUVER_LEAD_TIME_HOURS: float = 6.0
    MIN_LEAD_TIME_HOURS: float = 2.0
    MAX_LEAD_TIME_HOURS: float = 48.0
    
    # Performance thresholds
    MIN_IMPROVEMENT_KM: float = 0.5
    TARGET_SEPARATION_KM: float = 5.0
    
    # Propulsion parameters
    DEFAULT_ISP_SECONDS: float = 300.0
    DEFAULT_SATELLITE_MASS_KG: float = 260.0


@dataclass
class SystemConfig:
    """System-wide settings"""
    # API settings
    API_TITLE: str = "NEXORA API"
    API_VERSION: str = "1.0.0"
    API_DESCRIPTION: str = "Orbital Collision Avoidance System"
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Demo mode
    DEMO_MODE_ENABLED: bool = True
    
    # Data sources
    CELESTRAK_ENABLED: bool = True
    OFFLINE_FALLBACK: bool = True


# Global configuration instances
ANALYSIS = AnalysisConfig()
RISK = RiskConfig()
MANEUVER = ManeuverConfig()
SYSTEM = SystemConfig()


def get_config_dict() -> Dict:
    """Export all configuration as a dictionary"""
    return {
        "analysis": {
            "object_count": ANALYSIS.OBJECT_COUNT,
            "propagation_hours": ANALYSIS.PROPAGATION_HOURS,
            "time_step_seconds": ANALYSIS.TIME_STEP_SECONDS,
            "coarse_threshold_km": ANALYSIS.COARSE_THRESHOLD_KM,
            "fine_threshold_km": ANALYSIS.FINE_THRESHOLD_KM,
        },
        "risk": {
            "distance_baseline_km": RISK.DISTANCE_BASELINE_KM,
            "velocity_baseline_km_s": RISK.VELOCITY_BASELINE_KM_S,
            "time_baseline_hours": RISK.TIME_BASELINE_HOURS,
            "weights": {
                "distance": RISK.DISTANCE_WEIGHT,
                "velocity": RISK.VELOCITY_WEIGHT,
                "urgency": RISK.URGENCY_WEIGHT,
            },
            "thresholds": {
                "critical": RISK.CRITICAL_THRESHOLD,
                "high": RISK.HIGH_THRESHOLD,
                "medium": RISK.MEDIUM_THRESHOLD,
                "low": RISK.LOW_THRESHOLD,
            }
        },
        "maneuver": {
            "max_delta_v_m_s": MANEUVER.MAX_DELTA_V_M_S,
            "maneuver_lead_time_hours": MANEUVER.MANEUVER_LEAD_TIME_HOURS,
            "min_improvement_km": MANEUVER.MIN_IMPROVEMENT_KM,
            "target_separation_km": MANEUVER.TARGET_SEPARATION_KM,
        },
        "system": {
            "api_version": SYSTEM.API_VERSION,
            "demo_mode_enabled": SYSTEM.DEMO_MODE_ENABLED,
            "celestrak_enabled": SYSTEM.CELESTRAK_ENABLED,
        }
    }


def update_from_env():
    """Update configuration from environment variables"""
    # Analysis
    if os.getenv("NEXORA_OBJECT_COUNT"):
        ANALYSIS.OBJECT_COUNT = int(os.getenv("NEXORA_OBJECT_COUNT"))
    if os.getenv("NEXORA_PROPAGATION_HOURS"):
        ANALYSIS.PROPAGATION_HOURS = float(os.getenv("NEXORA_PROPAGATION_HOURS"))
    
    # Risk
    if os.getenv("NEXORA_DISTANCE_BASELINE"):
        RISK.DISTANCE_BASELINE_KM = float(os.getenv("NEXORA_DISTANCE_BASELINE"))
    
    # Maneuver
    if os.getenv("NEXORA_MAX_DELTA_V"):
        MANEUVER.MAX_DELTA_V_M_S = float(os.getenv("NEXORA_MAX_DELTA_V"))
    
    # System
    if os.getenv("NEXORA_DEMO_MODE"):
        SYSTEM.DEMO_MODE_ENABLED = os.getenv("NEXORA_DEMO_MODE").lower() == "true"


# Auto-load from environment on import
update_from_env()
