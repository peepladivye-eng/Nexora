/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        risk: {
          critical: '#ef4444',
          high: '#f59e0b',
          medium: '#eab308',
          low: '#22c55e',
        },
        antigravity: {
          obsidian: '#05070B',
          calibrating: '#F59E0B',
          stable: '#06B6D4',
          warning: '#EF4444',
          field: '#818CF8',
        },
      },
      fontFamily: {
        'mono-readout': ['"IBM Plex Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 120s linear infinite',
        'planet-glow': 'planetGlow 3s ease-in-out infinite',
        'sun-pulse': 'sunPulse 4s ease-in-out infinite',
      },
      keyframes: {
        planetGlow: {
          '0%, 100%': { filter: 'brightness(1) drop-shadow(0 0 8px var(--glow-color))' },
          '50%': { filter: 'brightness(1.15) drop-shadow(0 0 16px var(--glow-color))' },
        },
        sunPulse: {
          '0%, 100%': { transform: 'scale(1)', filter: 'brightness(1)' },
          '50%': { transform: 'scale(1.04)', filter: 'brightness(1.1)' },
        },
      },
    },
  },
  plugins: [],
}
