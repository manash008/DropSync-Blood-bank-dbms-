/**
 * DropSync API Client
 * Manages communication with Node.js/Express backend (Issue #2).
 * Automatically provides fallback to mock data when backend is not running,
 * explicitly tagging responses so the UI never misleads the user.
 */
import { CONFIG } from './config.js';
import { MOCK_BLOOD_BANKS, calculateDistanceKm } from './mockData.js';

let activeMode = CONFIG.FORCE_MOCK ? 'mock' : 'live';

export function getActiveMode() {
  return activeMode;
}

export function setActiveMode(mode) {
  if (mode === 'live' || mode === 'mock') {
    activeMode = mode;
  }
}

/**
 * Test connectivity with backend health endpoint
 */
export async function checkBackendHealth() {
  if (activeMode === 'mock') {
    return { ok: false, mode: 'mock', reason: 'Mock mode forced in configuration.' };
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${CONFIG.API_BASE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      return { ok: true, mode: 'live' };
    }
    return { ok: false, mode: 'mock', reason: `Backend returned status ${res.status}` };
  } catch (err) {
    return { ok: false, mode: 'mock', reason: 'Cannot reach backend at ' + CONFIG.API_BASE_URL };
  }
}

/**
 * Search for blood banks matching blood group and location criteria.
 * @param {Object} params
 * @param {string} params.bloodGroup - Blood group code (e.g. 'O+', 'A-', or 'ALL')
 * @param {string} params.city - City name filter (e.g. 'Pune', 'Mumbai')
 * @param {number} [params.userLat] - Latitude of user (for proximity ranking)
 * @param {number} [params.userLng] - Longitude of user (for proximity ranking)
 * @param {boolean} [params.availableOnly] - Only return banks with > 0 units
 */
export async function searchBloodAvailability(params) {
  const { bloodGroup = 'O+', city = '', userLat = null, userLng = null, availableOnly = false } = params;

  // Try live API if mode is live
  if (activeMode === 'live') {
    try {
      const queryParams = new URLSearchParams();
      if (bloodGroup && bloodGroup !== 'ALL') queryParams.append('blood_group', bloodGroup);
      if (city) queryParams.append('city', city);
      if (userLat != null && userLng != null) {
        queryParams.append('lat', userLat);
        queryParams.append('lng', userLng);
      }
      if (availableOnly) queryParams.append('available_only', 'true');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${CONFIG.API_BASE_URL}/inventory/search?${queryParams.toString()}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        return {
          source: 'live',
          isLive: true,
          count: json.data ? json.data.length : 0,
          results: json.data || [],
          notice: 'Live data retrieved from DropSync backend.'
        };
      }
      console.warn('Backend returned error status, falling back to mock dataset.');
    } catch (err) {
      console.warn('Backend unavailable, falling back to mock dataset:', err.message);
    }
  }

  // Mock data fallback
  // Simulate network latency (250ms) for realistic UX verification
  await new Promise((resolve) => setTimeout(resolve, 250));

  let filtered = MOCK_BLOOD_BANKS.map((bank) => {
    const units = bloodGroup === 'ALL'
      ? Object.values(bank.inventory).reduce((a, b) => a + b, 0)
      : (bank.inventory[bloodGroup] || 0);

    const distance = (userLat != null && userLng != null)
      ? calculateDistanceKm(userLat, userLng, bank.latitude, bank.longitude)
      : null;

    return {
      blood_bank_id: bank.blood_bank_id,
      name: bank.name,
      address: bank.address,
      city: bank.city,
      phone: bank.phone,
      latitude: bank.latitude,
      longitude: bank.longitude,
      operating_hours: bank.operating_hours,
      blood_group: bloodGroup,
      units_available: units,
      distance_km: distance,
      full_inventory: bank.inventory
    };
  });

  // Filter by city if specified
  if (city && city.trim() !== '') {
    const cleanCity = city.trim().toLowerCase();
    filtered = filtered.filter((b) => b.city.toLowerCase().includes(cleanCity));
  }

  // Filter by available units
  if (availableOnly) {
    filtered = filtered.filter((b) => b.units_available > 0);
  }

  // Sort: Distance (if user location provided), otherwise available units descending
  if (userLat != null && userLng != null) {
    filtered.sort((a, b) => (a.distance_km ?? 9999) - (b.distance_km ?? 9999));
  } else {
    filtered.sort((a, b) => b.units_available - a.units_available);
  }

  return {
    source: 'mock',
    isLive: false,
    count: filtered.length,
    results: filtered,
    notice: 'Demo Mode: Displaying local simulated data (Node.js API Issue #2 not connected).'
  };
}
