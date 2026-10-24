/**
 * DropSync Main Application Controller
 * Handles user interactions, search forms, state management, list rendering,
 * and inventory modal details.
 */
import { BLOOD_GROUPS, MOCK_BLOOD_BANKS } from "./mockData.js";
import {
  searchBloodAvailability,
  fetchHospitalRequestsApi,
  getActiveMode,
  setActiveMode,
} from "./api.js";
import {
  initMap,
  updateMapMarkers,
  focusBankOnMap,
  resetMapView,
  getIsMapAvailable,
} from "./map.js";

// Application State
const state = {
  selectedBloodGroup: "O+",
  selectedCity: "Pune",
  availableOnly: false,
  userLocation: null, // { lat, lng }
  searchResults: [],
  currentMode: "mock",
  isLoading: false,
  error: null,
  activeBankDetails: null,
};

// DOM Elements
const bloodGroupSelect = document.getElementById("bloodGroupSelect");
const cityInput = document.getElementById("cityInput");
const availableOnlyCheckbox = document.getElementById("availableOnlyCheckbox");
const searchForm = document.getElementById("searchForm");
const btnLocateMe = document.getElementById("btnLocateMe");
const btnReset = document.getElementById("btnReset");
const resultsListContainer = document.getElementById("resultsList");
const resultsSummary = document.getElementById("resultsSummary");
const loadingIndicator = document.getElementById("loadingIndicator");
const emptyStateContainer = document.getElementById("emptyState");
const errorStateContainer = document.getElementById("errorState");
const errorMessageText = document.getElementById("errorMessageText");
const modePill = document.getElementById("modePill");
const modeToggleBtn = document.getElementById("modeToggleBtn");
const mapContainer = document.getElementById("map");
const mapFallbackBanner = document.getElementById("mapFallbackBanner");
const inventoryModal = document.getElementById("inventoryModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalOverlay = document.getElementById("modalOverlay");

// Requests View Elements
const tabBanks = document.getElementById("tabBanks");
const tabRequests = document.getElementById("tabRequests");
const banksView = document.getElementById("banksView");
const requestsView = document.getElementById("requestsView");
const requestStatusSelect = document.getElementById("requestStatusSelect");
const requestUrgencySelect = document.getElementById("requestUrgencySelect");
const requestCityInput = document.getElementById("requestCityInput");
const btnFilterRequests = document.getElementById("btnFilterRequests");
const btnResetRequests = document.getElementById("btnResetRequests");
const requestsSummary = document.getElementById("requestsSummary");
const requestsLoading = document.getElementById("requestsLoading");
const requestsEmpty = document.getElementById("requestsEmpty");
const requestsError = document.getElementById("requestsError");
const requestsErrorMessage = document.getElementById("requestsErrorMessage");
const requestsList = document.getElementById("requestsList");

/**
 * Initialize application on DOM ready
 */
document.addEventListener("DOMContentLoaded", async () => {
  populateBloodGroupDropdown();
  setupEventListeners();

  // Initialize Map
  const mapLoaded = initMap("map");
  if (!mapLoaded) {
    if (mapFallbackBanner) mapFallbackBanner.style.display = "block";
  }

  // Check backend health & set initial mode banner
  state.currentMode = getActiveMode();
  updateModeIndicator();

  // Perform initial search with defaults (O+ in Pune)
  await performSearch();
});

/**
 * Populate Blood Group Dropdown
 */
function populateBloodGroupDropdown() {
  bloodGroupSelect.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "ALL";
  allOption.textContent = "🩸 All Blood Groups";
  bloodGroupSelect.appendChild(allOption);

  BLOOD_GROUPS.forEach((bg) => {
    const opt = document.createElement("option");
    opt.value = bg;
    opt.textContent = `Group ${bg}`;
    if (bg === state.selectedBloodGroup) {
      opt.selected = true;
    }
    bloodGroupSelect.appendChild(opt);
  });
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  // Form submission
  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    state.selectedBloodGroup = bloodGroupSelect.value;
    state.selectedCity = cityInput.value.trim();
    state.availableOnly = availableOnlyCheckbox.checked;
    await performSearch();
  });

  // Reset filter
  btnReset.addEventListener("click", async () => {
    bloodGroupSelect.value = "O+";
    cityInput.value = "Pune";
    availableOnlyCheckbox.checked = false;
    state.selectedBloodGroup = "O+";
    state.selectedCity = "Pune";
    state.availableOnly = false;
    state.userLocation = null;
    btnLocateMe.classList.remove("btn-locate-active");
    btnLocateMe.innerHTML = "📍 Use My Location";
    resetMapView("Pune");
    await performSearch();
  });

  // Geolocation Button
  btnLocateMe.addEventListener("click", handleGeolocation);

  // Mode Toggle (Demo / Live Backend)
  if (modeToggleBtn) {
    modeToggleBtn.addEventListener("click", async () => {
      const nextMode = state.currentMode === "mock" ? "live" : "mock";
      setActiveMode(nextMode);
      state.currentMode = nextMode;
      updateModeIndicator();
      await performSearch();
    });
  }

  // Modal interactions
  if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);
  if (modalOverlay) modalOverlay.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && inventoryModal.classList.contains("active")) {
      closeModal();
    }
  });

  // Expose viewBankDetails globally for Leaflet popups
  window.viewBankDetails = (bankId) => {
    openBankInventoryModal(bankId);
  };

  // View Tab Switching
  if (tabBanks && tabRequests) {
    tabBanks.addEventListener("click", () => switchTab("banks"));
    tabRequests.addEventListener("click", () => switchTab("requests"));
  }

  // Hospital Requests Filtering
  if (btnFilterRequests) {
    btnFilterRequests.addEventListener("click", () => loadHospitalRequests());
  }
  if (btnResetRequests) {
    btnResetRequests.addEventListener("click", () => {
      if (requestStatusSelect) requestStatusSelect.value = "pending";
      if (requestUrgencySelect) requestUrgencySelect.value = "all";
      if (requestCityInput) requestCityInput.value = "";
      loadHospitalRequests();
    });
  }
}

/**
 * Handle HTML5 Browser Geolocation
 */
function handleGeolocation() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }

  btnLocateMe.disabled = true;
  btnLocateMe.innerHTML = "⏳ Locating...";

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      state.userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      btnLocateMe.disabled = false;
      btnLocateMe.classList.add("btn-locate-active");
      btnLocateMe.innerHTML = "📍 Location Set ✓";
      cityInput.value = ""; // clear city restriction to search nearest across all
      state.selectedCity = "";
      await performSearch();
    },
    (err) => {
      btnLocateMe.disabled = false;
      btnLocateMe.innerHTML = "📍 Use My Location";
      console.warn("Geolocation failed:", err.message);
      alert(
        "Could not retrieve your location: " +
          err.message +
          "\nUsing default city search instead.",
      );
    },
    { timeout: 10000, enableHighAccuracy: true },
  );
}

/**
 * Perform Search Action
 */
async function performSearch() {
  setLoadingState(true);

  try {
    const params = {
      bloodGroup: state.selectedBloodGroup,
      city: state.selectedCity,
      userLat: state.userLocation ? state.userLocation.lat : null,
      userLng: state.userLocation ? state.userLocation.lng : null,
      availableOnly: state.availableOnly,
    };

    const response = await searchBloodAvailability(params);

    state.searchResults = response.results || [];
    renderResults(response);

    // Update Map
    if (getIsMapAvailable()) {
      updateMapMarkers(
        state.searchResults,
        state.userLocation,
        state.selectedBloodGroup,
      );
    }
  } catch (err) {
    console.error("Search failed:", err);
    setErrorState(
      err.message || "An unexpected error occurred while searching.",
    );
  } finally {
    setLoadingState(false);
  }
}

/**
 * Render Search Results List
 */
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/gu, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}
function renderResults(response) {
  const { results, count, source, notice } = response;
  if (errorStateContainer) errorStateContainer.style.display = "none";
  if (emptyStateContainer) emptyStateContainer.style.display = "none";
  resultsListContainer.innerHTML = "";

  // Update Summary Header
  const groupLabel =
    state.selectedBloodGroup === "ALL"
      ? "All Blood Groups"
      : `Group ${state.selectedBloodGroup}`;
  const locationLabel = state.userLocation
    ? "Near Your Coordinates"
    : state.selectedCity
      ? `in ${state.selectedCity}`
      : "Across All Cities";

  resultsSummary.innerHTML = `
    <div class="results-header-row">
      <div>
        <strong>${count} Blood Bank${count === 1 ? "" : "s"} Found</strong> for
        <span class="highlight-badge">${groupLabel}</span> ${escapeHtml(locationLabel)}
      </div>
      <div class="data-source-badge ${source === "live" ? "source-live" : "source-mock"}">
        ${source === "live" ? "● Live Backend Data" : "○ Simulated Sample Data"}
      </div>
    </div>
    ${notice ? `<div class="data-notice">${escapeHtml(notice)}</div>` : ""}
  `;

  if (count === 0) {
    emptyStateContainer.style.display = "block";
    return;
  }
  emptyStateContainer.style.display = "none";

  // Render cards
  results.forEach((bank) => {
    const card = document.createElement("div");
    card.className = "blood-bank-card";
    card.id = `bank-card-${escapeHtml(bank.blood_bank_id)}`;

    const isAvailable = (bank.units_available || 0) > 0;
    const badgeClass = isAvailable ? "badge-success" : "badge-danger";
    const badgeText = isAvailable
      ? `${bank.units_available} Unit${bank.units_available === 1 ? "" : "s"} Available`
      : "Out of Stock";

    const distanceBadge =
      bank.distance_km != null
        ? `<span class="distance-badge">📍 ${bank.distance_km} km away</span>`
        : "";

    card.innerHTML = `
      <div class="card-header">
        <h3 class="bank-name">${escapeHtml(bank.name)}</h3>
        <span class="badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="card-meta">
        <p class="bank-address">🏢 ${escapeHtml(bank.address)}, <strong>${escapeHtml(bank.city)}</strong></p>
        <p class="bank-phone">📞 <a href="tel:${escapeHtml(bank.phone)}" aria-label="Call blood bank">${escapeHtml(bank.phone)}</a></p>
        ${bank.operating_hours ? `<p class="bank-hours">⏰ ${escapeHtml(bank.operating_hours)}</p>` : ""}
        ${distanceBadge}
      </div>
      <div class="card-actions">
        <button class="btn btn-sm btn-outline-secondary btn-show-map" data-id="${escapeHtml(bank.blood_bank_id)}">
          🗺️ Show on Map
        </button>
        <button class="btn btn-sm btn-primary btn-view-stock" data-id="${escapeHtml(bank.blood_bank_id)}">
          🩸 Inventory Details
        </button>
      </div>
    `;

    // Bind action buttons
    card.querySelector(".btn-show-map").addEventListener("click", () => {
      focusBankOnMap(bank.blood_bank_id);
      // Smooth scroll on mobile if map is above/below
      if (window.innerWidth < 900) {
        mapContainer.scrollIntoView({ behavior: "smooth" });
      }
    });

    card.querySelector(".btn-view-stock").addEventListener("click", () => {
      openBankInventoryModal(bank.blood_bank_id);
    });

    resultsListContainer.appendChild(card);
  });
}

/**
 * Open Modal with Full Inventory Breakdown
 */
function openBankInventoryModal(bankId) {
  const bank =
    state.searchResults.find(
      (candidate) => String(candidate.blood_bank_id) === String(bankId),
    ) ||
    MOCK_BLOOD_BANKS.find(
      (candidate) => String(candidate.blood_bank_id) === String(bankId),
    );
  if (!bank) return;

  state.activeBankDetails = bank;
  modalTitle.textContent = bank.name;

  const inventory = bank.full_inventory || bank.inventory || {};
  const inventoryEntries = bank.inventory_complete
    ? BLOOD_GROUPS.map((group) => [group, inventory[group] || 0])
    : Object.entries(inventory).filter(([group]) =>
        BLOOD_GROUPS.includes(group),
      );

  const gridHtml = inventoryEntries.length
    ? '<div class="inventory-grid">' +
      inventoryEntries
        .map(([group, units]) => {
          const available = units > 0;
          return `
          <div class="inventory-tile ${available ? "tile-available" : "tile-empty"}">
            <div class="tile-group">${escapeHtml(group)}</div>
            <div class="tile-units">${Number(units)}</div>
            <div class="tile-status">${available ? "In Stock" : "Unavailable"}</div>
          </div>
        `;
        })
        .join("") +
      "</div>"
    : "<p>No inventory rows were returned for this facility.</p>";

  const inventoryTitle = bank.inventory_complete
    ? "Complete Inventory by Blood Group"
    : "Inventory rows returned by this search";
  const phoneMarkup = bank.phone
    ? '<p><strong>Contact:</strong> <a href="tel:' +
      escapeHtml(bank.phone) +
      '">' +
      escapeHtml(bank.phone) +
      "</a></p>"
    : "<p><strong>Contact:</strong> Not provided</p>";

  modalBody.innerHTML = `
    <div class="modal-info-section">
      <p><strong>Address:</strong> ${escapeHtml(bank.address)}, ${escapeHtml(bank.city)}</p>
      ${phoneMarkup}
      ${bank.operating_hours ? "<p><strong>Hours:</strong> " + escapeHtml(bank.operating_hours) + "</p>" : ""}
    </div>
    <h4 style="margin: 16px 0 8px 0; font-size: 15px; color: #333;">${inventoryTitle}</h4>
    ${gridHtml}
    ${bank.phone ? '<div style="margin-top: 20px; text-align: right;"><a href="tel:' + escapeHtml(bank.phone) + '" class="btn btn-primary">📞 Call Blood Bank</a></div>' : ""}
  `;

  inventoryModal.classList.add("active");
  modalOverlay.classList.add("active");
}
function closeModal() {
  inventoryModal.classList.remove("active");
  modalOverlay.classList.remove("active");
  state.activeBankDetails = null;
}

/**
 * Update UI Loading and Error States
 */
function setLoadingState(isLoading) {
  state.isLoading = isLoading;
  if (loadingIndicator)
    loadingIndicator.style.display = isLoading ? "flex" : "none";
  if (isLoading && errorStateContainer)
    errorStateContainer.style.display = "none";
  if (resultsListContainer && isLoading)
    resultsListContainer.style.opacity = "0.5";
  if (resultsListContainer && !isLoading)
    resultsListContainer.style.opacity = "1";
}

function setErrorState(errorMessage) {
  if (errorMessageText) errorMessageText.textContent = errorMessage;
  if (emptyStateContainer) emptyStateContainer.style.display = "none";
  if (errorStateContainer) errorStateContainer.style.display = "block";
  if (resultsListContainer) resultsListContainer.innerHTML = "";
  if (resultsSummary) resultsSummary.innerHTML = "";
  updateMapMarkers([], null, state.selectedBloodGroup);
}

/**
 * Update Mode Indicator Pill
 */
function updateModeIndicator() {
  if (!modePill) return;
  if (state.currentMode === "live") {
    modePill.className = "mode-pill mode-live";
    modePill.innerHTML = "● Live SQL Backend";
    if (modeToggleBtn) modeToggleBtn.textContent = "Switch to Simulated Data";
  } else {
    modePill.className = "mode-pill mode-mock";
    modePill.innerHTML = "○ Offline Simulation (Sample Data)";
    if (modeToggleBtn) modeToggleBtn.textContent = "Search Live SQL";
  }
}

/**
 * Tab Switching Handler
 */
function switchTab(tabName) {
  if (tabName === "banks") {
    tabBanks.classList.add("active");
    tabBanks.setAttribute("aria-selected", "true");
    tabRequests.classList.remove("active");
    tabRequests.setAttribute("aria-selected", "false");
    banksView.style.display = "block";
    requestsView.style.display = "none";
  } else {
    tabRequests.classList.add("active");
    tabRequests.setAttribute("aria-selected", "true");
    tabBanks.classList.remove("active");
    tabBanks.setAttribute("aria-selected", "false");
    requestsView.style.display = "block";
    banksView.style.display = "none";
    loadHospitalRequests();
  }
}

/**
 * Fetch and Render Hospital Blood Requests
 */
async function loadHospitalRequests() {
  if (!requestsList) return;
  const status = requestStatusSelect ? requestStatusSelect.value : "pending";
  const urgency = requestUrgencySelect ? requestUrgencySelect.value : "all";
  const city = requestCityInput ? requestCityInput.value.trim() : "";

  if (requestsLoading) requestsLoading.style.display = "flex";
  if (requestsEmpty) requestsEmpty.style.display = "none";
  if (requestsError) requestsError.style.display = "none";
  requestsList.innerHTML = "";
  if (requestsSummary) requestsSummary.innerHTML = "";

  try {
    const result = await fetchHospitalRequestsApi({ status, urgency, city });
    if (requestsLoading) requestsLoading.style.display = "none";

    const count = result.count || (result.data ? result.data.length : 0);
    if (requestsSummary) {
      const modeLabel = result.isLive
        ? '<span class="summary-live">Live SQL Records</span>'
        : '<span class="summary-mock">Sample Data Simulation</span>';
      requestsSummary.innerHTML = `<strong>${count}</strong> hospital blood request${count === 1 ? "" : "s"} found ${modeLabel}`;
    }

    if (count === 0) {
      if (requestsEmpty) requestsEmpty.style.display = "block";
      return;
    }

    result.data.forEach((req) => {
      const card = document.createElement("div");
      card.className = "request-card";
      card.innerHTML = `
        <div class="request-header">
          <div>
            <div class="request-hospital-name">${escapeHtml(req.hospitalName)}</div>
            <div style="font-size: 13px; color: var(--text-muted);">📍 ${escapeHtml(req.hospitalCity)} ${req.hospitalPhone ? "• " + escapeHtml(req.hospitalPhone) : ""}</div>
          </div>
          <span class="urgency-badge urgency-${escapeHtml(req.urgency)}">${escapeHtml(req.urgency)}</span>
        </div>
        <div class="request-body">
          <div>
            <div class="request-blood-badge">🩸 ${escapeHtml(req.bloodGroup)}</div>
            <div class="request-units">${req.unitsRequested} Unit${req.unitsRequested === 1 ? "" : "s"} Requested</div>
          </div>
          <div>
            <span class="status-badge status-${escapeHtml(req.status)}">${escapeHtml(req.status)}</span>
          </div>
        </div>
        <div class="request-meta">
          <div><strong>Requested:</strong> ${formatDate(req.requestedAt)}</div>
          ${req.fulfilledByBloodBank ? `<div><strong>Fulfilled By:</strong> ${escapeHtml(req.fulfilledByBloodBank)}</div>` : ""}
          ${req.notes ? `<div><strong>Notes:</strong> ${escapeHtml(req.notes)}</div>` : ""}
        </div>
      `;
      requestsList.appendChild(card);
    });
  } catch (error) {
    if (requestsLoading) requestsLoading.style.display = "none";
    if (requestsError) requestsError.style.display = "block";
    if (requestsErrorMessage) {
      requestsErrorMessage.textContent =
        error.message || "Failed to load hospital requests.";
    }
  }
}

function formatDate(isoString) {
  if (!isoString) return "N/A";
  try {
    const d = new Date(isoString);
    return isNaN(d.getTime()) ? isoString : d.toLocaleString();
  } catch {
    return isoString;
  }
}
