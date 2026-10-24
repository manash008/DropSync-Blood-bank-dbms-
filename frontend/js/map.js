/**
 * DropSync Map Controller (Leaflet + OpenStreetMap)
 * Manages map initialization, custom colored markers, interactive popups,
 * and user geolocation markers with graceful degradation if tiles/Leaflet fail.
 */
import { CONFIG } from './config.js';

let mapInstance = null;
let markersLayer = null;
let userMarker = null;
let bankMarkersMap = new Map();
let isMapAvailable = false;

// Custom SVG Icons for Leaflet
function createMarkerIcon(color, label = '') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 44" width="32" height="44">
      <defs>
        <filter id="shadow" x="-20%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.35"/>
        </filter>
      </defs>
      <path d="M16 2 C8.268 2 2 8.268 2 16 C2 26 16 42 16 42 C16 42 30 26 30 16 C30 8.268 23.732 2 16 2 Z" 
            fill="${color}" stroke="#ffffff" stroke-width="2" filter="url(#shadow)"/>
      <circle cx="16" cy="16" r="7" fill="#ffffff"/>
      <path d="M16 11 C16 11 12 16 12 18 C12 20.2 13.8 22 16 22 C18.2 22 20 20.2 20 18 C20 16 16 11 16 11 Z" fill="${color}"/>
    </svg>
  `;
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: svg,
    iconSize: [32, 44],
    iconAnchor: [16, 42],
    popupAnchor: [0, -38]
  });
}

function createUserLocationIcon() {
  const html = `
    <div class="user-location-pulse">
      <div class="pulse-ring"></div>
      <div class="pulse-dot"></div>
    </div>
  `;
  return L.divIcon({
    className: 'custom-user-marker',
    html: html,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

export function initMap(containerId = 'map') {
  const container = document.getElementById(containerId);
  if (!container) return false;

  if (typeof L === 'undefined') {
    console.error('Leaflet library is not loaded. Map functionality disabled.');
    isMapAvailable = false;
    return false;
  }

  try {
    const center = [CONFIG.DEFAULT_CENTER.lat, CONFIG.DEFAULT_CENTER.lng];
    mapInstance = L.map(containerId, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView(center, CONFIG.DEFAULT_CENTER.zoom);

    // OpenStreetMap standard tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapInstance);

    markersLayer = L.layerGroup().addTo(mapInstance);
    isMapAvailable = true;
    return true;
  } catch (err) {
    console.error('Failed to initialize Leaflet map:', err);
    isMapAvailable = false;
    return false;
  }
}

export function getIsMapAvailable() {
  return isMapAvailable;
}

/**
 * Render bank markers and user marker on the map.
 */
export function updateMapMarkers(banks = [], userLocation = null, selectedBloodGroup = 'O+') {
  if (!isMapAvailable || !mapInstance || !markersLayer) return;

  markersLayer.clearLayers();
  bankMarkersMap.clear();

  const bounds = [];

  // Plot User Location Marker if available
  if (userLocation && userLocation.lat && userLocation.lng) {
    const userLatLng = [userLocation.lat, userLocation.lng];
    userMarker = L.marker(userLatLng, { icon: createUserLocationIcon() })
      .bindPopup(`
        <div class="map-popup-card user-popup">
          <strong>📍 Your Detected Location</strong>
          <p style="margin: 4px 0 0; font-size: 12px; color: #555;">Searching nearby blood banks...</p>
        </div>
      `);
    markersLayer.addLayer(userMarker);
    bounds.push(userLatLng);
  }

  // Plot Blood Bank Markers
  banks.forEach((bank) => {
    if (bank.latitude == null || bank.longitude == null) return;

    const latLng = [bank.latitude, bank.longitude];
    const isAvailable = (bank.units_available || 0) > 0;
    const pinColor = isAvailable ? '#198754' : '#dc3545'; // Green if in stock, Red if out of stock

    const marker = L.marker(latLng, {
      icon: createMarkerIcon(pinColor)
    });

    const statusBadge = isAvailable
      ? `<span class="badge badge-success">✓ ${bank.units_available} Units Available</span>`
      : `<span class="badge badge-danger">✕ Out of Stock</span>`;

    const distanceText = bank.distance_km != null ? ` • <strong>${bank.distance_km} km away</strong>` : '';

    const popupContent = `
      <div class="map-popup-card">
        <h4 style="margin: 0 0 6px 0; font-size: 15px; color: #1a1d20;">${bank.name}</h4>
        <div style="margin-bottom: 8px;">
          ${statusBadge}
          <span style="font-size: 12px; color: #666; margin-left: 4px;">(${selectedBloodGroup})</span>
        </div>
        <p style="margin: 4px 0; font-size: 13px; color: #495057;">📍 ${bank.address}, ${bank.city}</p>
        ${distanceText ? `<p style="margin: 4px 0; font-size: 12px; color: #0d6efd;">${distanceText}</p>` : ''}
        <p style="margin: 4px 0 8px 0; font-size: 13px; color: #495057;">📞 <a href="tel:${bank.phone}">${bank.phone}</a></p>
        <button class="btn btn-sm btn-outline-primary" style="width: 100%;" onclick="window.viewBankDetails(${bank.blood_bank_id})">
          View Full Stock
        </button>
      </div>
    `;

    marker.bindPopup(popupContent);
    markersLayer.addLayer(marker);
    bankMarkersMap.set(bank.blood_bank_id, marker);
    bounds.push(latLng);
  });

  // Fit bounds to show all markers
  if (bounds.length > 1) {
    mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  } else if (bounds.length === 1) {
    mapInstance.setView(bounds[0], 13);
  }
}

/**
 * Pan and zoom to specific blood bank, and open its popup
 */
export function focusBankOnMap(bankId) {
  if (!isMapAvailable || !mapInstance) return;
  const marker = bankMarkersMap.get(bankId);
  if (marker) {
    const latLng = marker.getLatLng();
    mapInstance.setView(latLng, 14, { animate: true });
    marker.openPopup();
  }
}

/**
 * Reset map view to default city center
 */
export function resetMapView(city = 'pune') {
  if (!isMapAvailable || !mapInstance) return;
  const coords = CONFIG.CITY_COORDINATES[city.toLowerCase()] || CONFIG.DEFAULT_CENTER;
  mapInstance.setView([coords.lat, coords.lng], coords.zoom, { animate: true });
}
