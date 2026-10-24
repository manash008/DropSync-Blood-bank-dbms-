/**
 * API client that normalizes SQL results to the existing UI's display model.
 * Live search failures are surfaced to the UI; sample inventory is available
 * only through the explicit demo-mode toggle.
 */
import { CONFIG } from "./config.js";
import { MOCK_BLOOD_BANKS, calculateDistanceKm } from "./mockData.js";

let activeMode = CONFIG.FORCE_MOCK ? "mock" : "live";

export function getActiveMode() {
  return activeMode;
}

export function setActiveMode(mode) {
  if (mode === "live" || mode === "mock") {
    activeMode = mode;
  }
}

export async function checkBackendHealth() {
  if (activeMode === "mock") {
    return { ok: false, mode: "mock", reason: "Sample-data mode is selected." };
  }

  try {
    const response = await fetch(CONFIG.API_BASE_URL + "/health");
    if (response.ok) return { ok: true, mode: "live" };
    return {
      ok: false,
      mode: "live",
      reason: "Backend returned status " + response.status,
    };
  } catch {
    return {
      ok: false,
      mode: "live",
      reason: "Cannot reach backend at " + CONFIG.API_BASE_URL,
    };
  }
}

function normalizeSqlResults(rows, bloodGroup, userLat, userLng) {
  if (bloodGroup === "ALL") {
    const banks = new Map();
    for (const row of rows) {
      const id = String(row.bloodBankId);
      let bank = banks.get(id);
      if (!bank) {
        bank = {
          blood_bank_id: id,
          name: row.name,
          address: row.address,
          city: row.city,
          phone: row.phone,
          latitude: row.latitude,
          longitude: row.longitude,
          blood_group: "ALL",
          units_available: 0,
          full_inventory: {},
          inventory_complete: false,
          distance_km:
            row.distanceKm ??
            (userLat != null && userLng != null
              ? calculateDistanceKm(
                  userLat,
                  userLng,
                  row.latitude,
                  row.longitude,
                )
              : null),
        };
        banks.set(id, bank);
      }
      bank.full_inventory[row.bloodGroup] = row.unitsAvailable;
      bank.units_available += row.unitsAvailable;
    }
    return [...banks.values()];
  }

  return rows.map((row) => ({
    blood_bank_id: String(row.bloodBankId),
    name: row.name,
    address: row.address,
    city: row.city,
    phone: row.phone,
    latitude: row.latitude,
    longitude: row.longitude,
    blood_group: row.bloodGroup,
    units_available: row.unitsAvailable,
    full_inventory: { [row.bloodGroup]: row.unitsAvailable },
    inventory_complete: false,
    distance_km:
      row.distanceKm ??
      (userLat != null && userLng != null
        ? calculateDistanceKm(userLat, userLng, row.latitude, row.longitude)
        : null),
  }));
}

function sortResults(results, userLat, userLng) {
  if (userLat != null && userLng != null) {
    results.sort((left, right) => {
      if (left.distance_km === null && right.distance_km === null) return 0;
      if (left.distance_km === null) return 1;
      if (right.distance_km === null) return -1;
      return left.distance_km - right.distance_km;
    });
  } else {
    results.sort((left, right) => right.units_available - left.units_available);
  }
  return results;
}

async function searchLive({
  bloodGroup,
  city,
  userLat,
  userLng,
  availableOnly,
}) {
  const query = new URLSearchParams({ bloodGroup });
  if (city.trim()) query.set("city", city.trim());
  if (userLat != null && userLng != null) {
    query.set("lat", String(userLat));
    query.set("lng", String(userLng));
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(
      CONFIG.API_BASE_URL + "/blood-banks?" + query.toString(),
      { signal: controller.signal },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const fieldErrors = Object.values(payload.error?.fields || {}).join(" ");
      const message =
        [payload.error?.message, fieldErrors].filter(Boolean).join(" ") ||
        "Blood-bank search failed (" + response.status + ").";
      const error = new Error(message);
      error.code = payload.error?.code || "SEARCH_FAILED";
      throw error;
    }

    let results = normalizeSqlResults(
      Array.isArray(payload.data) ? payload.data : [],
      bloodGroup,
      userLat,
      userLng,
    );
    if (availableOnly) {
      results = results.filter((bank) => bank.units_available > 0);
    }
    sortResults(results, userLat, userLng);

    return {
      source: "live",
      isLive: true,
      count: results.length,
      results,
      notice: "Live inventory returned by the DropSync SQL API.",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function searchSample({
  bloodGroup,
  city,
  userLat,
  userLng,
  availableOnly,
}) {
  await new Promise((resolve) => setTimeout(resolve, 200));

  let results = MOCK_BLOOD_BANKS.map((bank) => {
    const units =
      bloodGroup === "ALL"
        ? Object.values(bank.inventory).reduce(
            (total, value) => total + value,
            0,
          )
        : bank.inventory[bloodGroup] || 0;
    return {
      blood_bank_id: String(bank.blood_bank_id),
      name: bank.name,
      address: bank.address,
      city: bank.city,
      phone: bank.phone,
      latitude: bank.latitude,
      longitude: bank.longitude,
      operating_hours: bank.operating_hours,
      blood_group: bloodGroup,
      units_available: units,
      distance_km:
        userLat != null && userLng != null
          ? calculateDistanceKm(userLat, userLng, bank.latitude, bank.longitude)
          : null,
      full_inventory: bank.inventory,
      inventory_complete: true,
    };
  });

  if (city.trim()) {
    const cityFilter = city.trim().toLowerCase();
    results = results.filter((bank) =>
      bank.city.toLowerCase().includes(cityFilter),
    );
  }
  if (availableOnly) {
    results = results.filter((bank) => bank.units_available > 0);
  }
  sortResults(results, userLat, userLng);

  return {
    source: "mock",
    isLive: false,
    count: results.length,
    results,
    notice: "Demo mode: displaying clearly labeled local sample inventory.",
  };
}

export function searchBloodAvailability(params) {
  const {
    bloodGroup = "O+",
    city = "",
    userLat = null,
    userLng = null,
    availableOnly = false,
  } = params;

  if (activeMode === "mock") {
    return searchSample({ bloodGroup, city, userLat, userLng, availableOnly });
  }

  return searchLive({ bloodGroup, city, userLat, userLng, availableOnly });
}
