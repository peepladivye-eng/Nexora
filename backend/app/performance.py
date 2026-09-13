"""
NEXORA - Performance Monitoring
Track analysis speed, cache efficiency, and system health
"""

import time
from datetime import datetime, timezone
from typing import Dict, List, Optional
from dataclasses import dataclass, field


@dataclass
class AnalysisMetrics:
    """Metrics for a single analysis run"""
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_seconds: float = 0.0
    
    objects_loaded: int = 0
    states_propagated: int = 0
    conjunctions_detected: int = 0
    
    tle_cache_hits: int = 0
    tle_cache_misses: int = 0
    
    success: bool = True
    error_message: Optional[str] = None


@dataclass
class SystemHealth:
    """Overall system health statistics"""
    total_analyses: int = 0
    successful_analyses: int = 0
    failed_analyses: int = 0
    
    average_duration_seconds: float = 0.0
    fastest_duration_seconds: float = float('inf')
    slowest_duration_seconds: float = 0.0
    
    total_conjunctions_detected: int = 0
    cache_hit_rate: float = 0.0
    
    uptime_hours: float = 0.0
    start_time: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class PerformanceMonitor:
    """Global performance monitoring singleton"""
    
    def __init__(self):
        self.health = SystemHealth()
        self.recent_analyses: List[AnalysisMetrics] = []
        self.max_history = 100
        
    def start_analysis(self) -> AnalysisMetrics:
        """Begin tracking a new analysis"""
        return AnalysisMetrics(start_time=datetime.now(timezone.utc))
    
    def end_analysis(self, metrics: AnalysisMetrics):
        """Complete analysis tracking and update statistics"""
        metrics.end_time = datetime.now(timezone.utc)
        metrics.duration_seconds = (metrics.end_time - metrics.start_time).total_seconds()
        
        # Update health statistics
        self.health.total_analyses += 1
        if metrics.success:
            self.health.successful_analyses += 1
        else:
            self.health.failed_analyses += 1
        
        # Update duration statistics
        if metrics.success:
            self.health.average_duration_seconds = (
                (self.health.average_duration_seconds * (self.health.successful_analyses - 1) + 
                 metrics.duration_seconds) / self.health.successful_analyses
            )
            self.health.fastest_duration_seconds = min(
                self.health.fastest_duration_seconds,
                metrics.duration_seconds
            )
            self.health.slowest_duration_seconds = max(
                self.health.slowest_duration_seconds,
                metrics.duration_seconds
            )
        
        # Update conjunction count
        self.health.total_conjunctions_detected += metrics.conjunctions_detected
        
        # Update cache statistics
        total_cache_ops = metrics.tle_cache_hits + metrics.tle_cache_misses
        if total_cache_ops > 0:
            hit_rate = metrics.tle_cache_hits / total_cache_ops
            # Exponential moving average
            self.health.cache_hit_rate = (
                0.7 * self.health.cache_hit_rate + 0.3 * hit_rate
            )
        
        # Update uptime
        self.health.uptime_hours = (
            datetime.now(timezone.utc) - self.health.start_time
        ).total_seconds() / 3600
        
        # Store in history
        self.recent_analyses.append(metrics)
        if len(self.recent_analyses) > self.max_history:
            self.recent_analyses.pop(0)
    
    def get_statistics(self) -> Dict:
        """Get current performance statistics"""
        return {
            "system_health": {
                "uptime_hours": round(self.health.uptime_hours, 2),
                "total_analyses": self.health.total_analyses,
                "successful_analyses": self.health.successful_analyses,
                "failed_analyses": self.health.failed_analyses,
                "success_rate": (
                    round(self.health.successful_analyses / self.health.total_analyses * 100, 1)
                    if self.health.total_analyses > 0 else 0
                ),
            },
            "performance": {
                "average_duration_seconds": round(self.health.average_duration_seconds, 2),
                "fastest_duration_seconds": (
                    round(self.health.fastest_duration_seconds, 2)
                    if self.health.fastest_duration_seconds != float('inf') else None
                ),
                "slowest_duration_seconds": round(self.health.slowest_duration_seconds, 2),
            },
            "operations": {
                "total_conjunctions_detected": self.health.total_conjunctions_detected,
                "cache_hit_rate": round(self.health.cache_hit_rate * 100, 1),
            },
            "recent_analyses": [
                {
                    "start_time": m.start_time.isoformat(),
                    "duration_seconds": round(m.duration_seconds, 2),
                    "objects_loaded": m.objects_loaded,
                    "conjunctions_detected": m.conjunctions_detected,
                    "success": m.success,
                }
                for m in self.recent_analyses[-10:]  # Last 10 analyses
            ]
        }
    
    def reset(self):
        """Reset all statistics"""
        self.health = SystemHealth()
        self.recent_analyses = []


# Global monitor instance
_monitor = PerformanceMonitor()


def get_monitor() -> PerformanceMonitor:
    """Get the global performance monitor"""
    return _monitor


def track_analysis(func):
    """Decorator to automatically track analysis performance"""
    def wrapper(*args, **kwargs):
        monitor = get_monitor()
        metrics = monitor.start_analysis()
        
        try:
            result = func(*args, **kwargs)
            metrics.success = True
            if isinstance(result, list):
                metrics.conjunctions_detected = len(result)
            return result
        except Exception as e:
            metrics.success = False
            metrics.error_message = str(e)
            raise
        finally:
            monitor.end_analysis(metrics)
    
    return wrapper
