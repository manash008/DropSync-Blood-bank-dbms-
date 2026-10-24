/**
 * DropSync frontend settings. The backend and static UI share one origin by
 * default; deployments on separate origins can set window.DROPSYNC_API_BASE_URL
 * before js/app.js loads.
 */
const defaultApiBaseUrl =
  typeof window === "undefined"
    ? "http://localhost:5000/api"
    : new URL("/api", window.location.origin).href;

export const CONFIG = {
  API_BASE_URL: (globalThis.DROPSYNC_API_BASE_URL || defaultApiBaseUrl).replace(
    /\/+$/u,
    "",
  ),

  FORCE_MOCK: false,
  DEFAULT_CENTER: {
    lat: 18.5204,
    lng: 73.8567,
    name: "Pune",
    zoom: 12,
  },
  CITY_COORDINATES: {
    pune: { lat: 18.5204, lng: 73.8567, zoom: 12 },
    mumbai: { lat: 19.076, lng: 72.8777, zoom: 12 },
  },
};
