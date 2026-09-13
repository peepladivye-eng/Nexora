export interface PlanetConfig {
  id: string;
  name: string;
  distance: number;
  radius: number;
  speed: number;
  rotation: number;
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
  roughness: number;
  metalness: number;
  tilt: number;
  hasRings?: boolean;
  description: {
    distanceFromSun: string;
    orbitalPeriod: string;
    radiusKm: string;
    moons: number;
    debrisLeo?: number;
  };
}

export const PLANETS: PlanetConfig[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    distance: 8,
    radius: 0.38,
    speed: 1.58,
    rotation: 0.004,
    color: '#a6a29a',
    roughness: 1.0,
    metalness: 0.1,
    tilt: 0.03,
    description: {
      distanceFromSun: '57.9m km',
      orbitalPeriod: '88 days',
      radiusKm: '2,440km',
      moons: 0,
    },
  },
  {
    id: 'venus',
    name: 'Venus',
    distance: 11,
    radius: 0.95,
    speed: 1.18,
    rotation: 0.0015,
    color: '#e8c28b',
    emissive: '#c98a4b',
    emissiveIntensity: 0.05,
    roughness: 0.8,
    metalness: 0.05,
    tilt: 3.09,
    description: {
      distanceFromSun: '108.2m km',
      orbitalPeriod: '225 days',
      radiusKm: '6,052km',
      moons: 0,
    },
  },
  {
    id: 'earth',
    name: 'Earth',
    distance: 15,
    radius: 1.0,
    speed: 1.0,
    rotation: 0.02,
    color: '#3564c9',
    emissive: '#1e3a8a',
    emissiveIntensity: 0.08,
    roughness: 0.6,
    metalness: 0.1,
    tilt: 0.41,
    description: {
      distanceFromSun: '149.6m km',
      orbitalPeriod: '365.25 days',
      radiusKm: '6,371km',
      moons: 1,
      debrisLeo: 8420,
    },
  },
  {
    id: 'mars',
    name: 'Mars',
    distance: 20,
    radius: 0.53,
    speed: 0.80,
    rotation: 0.018,
    color: '#c1440e',
    roughness: 0.9,
    metalness: 0.05,
    tilt: 0.44,
    description: {
      distanceFromSun: '227.9m km',
      orbitalPeriod: '687 days',
      radiusKm: '3,390km',
      moons: 2,
    },
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    distance: 30,
    radius: 2.8,
    speed: 0.43,
    rotation: 0.04,
    color: '#d7b28a',
    roughness: 0.8,
    metalness: 0.05,
    tilt: 0.05,
    description: {
      distanceFromSun: '778.6m km',
      orbitalPeriod: '11.86 yrs',
      radiusKm: '69,911km',
      moons: 95,
    },
  },
  {
    id: 'saturn',
    name: 'Saturn',
    distance: 40,
    radius: 2.3,
    speed: 0.32,
    rotation: 0.038,
    color: '#e5d1a1',
    roughness: 0.85,
    metalness: 0.1,
    tilt: 0.47,
    hasRings: true,
    description: {
      distanceFromSun: '1.43b km',
      orbitalPeriod: '29.46 yrs',
      radiusKm: '58,232km',
      moons: 146,
    },
  },
  {
    id: 'uranus',
    name: 'Uranus',
    distance: 50,
    radius: 1.6,
    speed: 0.23,
    rotation: 0.03,
    color: '#9ce0e4',
    roughness: 0.75,
    metalness: 0.2,
    tilt: 1.71,
    description: {
      distanceFromSun: '2.87b km',
      orbitalPeriod: '84 yrs',
      radiusKm: '25,362km',
      moons: 27,
    },
  },
  {
    id: 'neptune',
    name: 'Neptune',
    distance: 60,
    radius: 1.55,
    speed: 0.18,
    rotation: 0.032,
    color: '#4a6bd4',
    emissive: '#2a3a80',
    emissiveIntensity: 0.08,
    roughness: 0.7,
    metalness: 0.2,
    tilt: 0.49,
    description: {
      distanceFromSun: '4.50b km',
      orbitalPeriod: '164.8 yrs',
      radiusKm: '24,622km',
      moons: 16,
    },
  },
];

export const PLANET_BY_ID: Record<string, PlanetConfig> = Object.fromEntries(
  PLANETS.map((p) => [p.id, p])
);

export const EARTH_POSITION: [number, number, number] = [15, 0, 0];
