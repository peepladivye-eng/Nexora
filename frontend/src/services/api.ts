/**
 * NEXORA API Service
 * Handles all backend communication
 */

import axios from 'axios';

const API_BASE = '/api';

export interface ConjunctionEvent {
  tca: string;
  miss_distance_km: number;
  norad_id_primary: string;
  norad_id_secondary: string;
  relative_velocity_km_s: number;
  pc_foster: number;
  pc_chan: number;
  risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  r_primary: number[];
  v_primary: number[];
  r_secondary: number[];
  v_secondary: number[];
}

export interface ConjunctionsResponse {
  success: boolean;
  count: number;
  total_events: number;
  last_updated: string | null;
  in_progress: boolean;
  risk_summary: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  events: ConjunctionEvent[];
}

export interface ManeuverResponse {
  success: boolean;
  conjunction_id: string;
  maneuver: {
    delta_v_ms: number;
    direction: string;
    time_before_tca_s: number;
    time_before_tca_hours: number;
    burn_description: string;
  };
  performance: {
    original_miss_km: number;
    post_miss_km: number;
    miss_distance_improvement: number;
    original_pc: number;
    post_pc: number;
    pc_reduction_factor: number;
  };
  cost: {
    propellant_kg: number;
    satellite_mass_kg: number;
    propellant_fraction: number;
  };
  event_summary: {
    norad_id_primary: string;
    norad_id_secondary: string;
    tca: string;
    relative_velocity_km_s: number;
    risk_level: string;
  };
}

export const api = {
  /**
   * Get all conjunction events
   */
  async getConjunctions(riskLevel?: string, limit?: number): Promise<ConjunctionsResponse> {
    const params = new URLSearchParams();
    if (riskLevel) params.append('risk_level', riskLevel);
    if (limit) params.append('limit', limit.toString());
    
    const response = await axios.get(`${API_BASE}/conjunctions?${params.toString()}`);
    return response.data;
  },

  /**
   * Get conjunction summary stats
   */
  async getConjunctionStats() {
    const response = await axios.get(`${API_BASE}/conjunctions/stats/summary`);
    return response.data;
  },

  /**
   * Trigger fresh conjunction assessment
   */
  async refreshConjunctions() {
    const response = await axios.post(`${API_BASE}/conjunctions/refresh`);
    return response.data;
  },

  /**
   * Get maneuver for a conjunction
   */
  async getManeuver(conjunctionId: string): Promise<ManeuverResponse> {
    const response = await axios.get(`${API_BASE}/maneuver/${conjunctionId}`);
    return response.data;
  },

  /**
   * Get full maneuver parameter sweep
   */
  async getManeuverSweep(conjunctionId: string) {
    const response = await axios.get(`${API_BASE}/maneuver/${conjunctionId}/sweep`);
    return response.data;
  },

  /**
   * Get AI-generated maneuver brief
   */
  async getManeuverBrief(conjunctionId: string, question: string = 'summary') {
    const response = await axios.get(`${API_BASE}/maneuver/${conjunctionId}/brief?question=${question}`);
    return response.data;
  },

  /**
   * Health check
   */
  async healthCheck() {
    const response = await axios.get(`${API_BASE}/health`);
    return response.data;
  }
};

export default api;
