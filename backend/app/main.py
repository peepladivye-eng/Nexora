"""
NEXORA - Orbital Collision Avoidance System
FastAPI main application entry point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """Application settings loaded from environment"""
    cors_origins: str = "http://localhost:5173,http://localhost:5174"
    tle_cache_ttl_hours: int = 6
    
    class Config:
        env_file = ".env"


settings = Settings()

app = FastAPI(
    title="NEXORA API",
    description="Orbital Collision Avoidance System - Conjunction Assessment & Maneuver Planning",
    version="1.0.0"
)

# CORS configuration - scoped to actual origins, not wildcard
allowed_origins = [origin.strip() for origin in settings.cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "NEXORA",
        "status": "operational",
        "description": "Orbital Collision Avoidance System"
    }


@app.get("/api/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "components": {
            "api": "operational",
            "tle_loader": "ready",
            "propagator": "ready",
            "screening": "ready"
        }
    }


# Import routers
from app.routers import conjunctions, maneuvers, trajectory
app.include_router(conjunctions.router, prefix="/api", tags=["conjunctions"])
app.include_router(maneuvers.router, prefix="/api", tags=["maneuvers"])
app.include_router(trajectory.router, prefix="/api", tags=["trajectory"])
