/**
 * DropSync Frontend Configuration
 * Configure backend API connectivity, mock mode, and default map coordinates.
 */
export const CONFIG = {
  // Base URL for Issue #2 Backend API (Node.js + Express on port 5000)
  API_BASE_URL: 'http://localhost:5000/api',

  // If true, automatically falls back to mock demo data if the backend API is unreachable
  AUTO_FALLBACK_TO_MOCK: true,

  // Force mock mode even if backend might be available (great for offline demos and tests)
  FORCE_MOCK: true,

  // Default initial map center (Pune, Maharashtra, India - matches database/seed.sql)
  DEFAULT_CENTER: {
    lat: 18.5204,
    lng: 73.8567,
    name: 'Pune',
    zoom: 12
  },

  // Fallback centers for quick navigation
  CITY_COORDINATES: {
    'pune': { lat: 18.5204, lng: 73.8567, zoom: 12 },
    'mumbai': { lat: 19.0760, lng: 72.8777, zoom: 12 }
  }
};
