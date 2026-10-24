/**
 * DropSync Main Application Controller
 * Handles user interactions, search forms, state management, list rendering,
 * and inventory modal details.
 */
import { CONFIG } from './config.js';
import { BLOOD_GROUPS, MOCK_BLOOD_BANKS } from './mockData.js';
import { searchBloodAvailability, checkBackendHealth, getActiveMode, setActiveMode } from './api.js';
import { initMap, updateMapMarkers, focusBankOnMap, resetMapView, getIsMapAvailable } from './map.js';

// Application State
const state = {
  selectedBloodGroup: 'O+',
  selectedCity: 'Pune',
  availableOnly: false,
  userLocation: null, // { lat, lng }
  searchResults: [],
  currentMode: 'mock',
  isLoading: false,
  error: null,
  activeBankDetails: null
};

// DOM Elements
const bloodGroupSelect = document.getElementById('bloodGroupSelect');
const cityInput = document.getElementById('cityInput');
const availableOnlyCheckbox = document.getElementById('availableOnlyCheckbox');
const searchForm = document.getElementById('searchForm');
const btnLocateMe = document.getElementById('btnLocateMe');
const btnReset = document.getElementById('btnReset');
const resultsListContainer = document.getElementById('resultsList');
const resultsSummary = document.getElementById('resultsSummary');
const loadingIndicator = document.getElementById('loadingIndicator');
const emptyStateContainer = document.getElementById('emptyState');
const errorStateContainer = document.getElementById('errorState');
const errorMessageText = document.getElementById('errorMessageText');
const modePill = document.getElementById('modePill');
const modeToggleBtn = document.getElementById('modeToggleBtn');
const mapContainer = document.getElementById('map');
const mapFallbackBanner = document.getElementById('mapFallbackBanner');
const inventoryModal = document.getElementById('inventoryModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalOverlay = document.getElementById('modalOverlay');

/**
 * Initialize application on DOM ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  populateBloodGroupDropdown();
  setupEventListeners();

  // Initialize Map
  const mapLoaded = initMap('map');
  if (!mapLoaded) {
    if (mapFallbackBanner) mapFallbackBanner.style.display = 'block';
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
  bloodGroupSelect.innerHTML = '';
  
  const allOption = document.createElement('option');
  allOption.value = 'ALL';
  allOption.textContent = '🩸 All Blood Groups';
  bloodGroupSelect.appendChild(allOption);

  BLOOD_GROUPS.forEach((bg) => {
    const opt = document.createElement('option');
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
  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    state.selectedBloodGroup = bloodGroupSelect.value;
    state.selectedCity = cityInput.value.trim();
    state.availableOnly = availableOnlyCheckbox.checked;
    await performSearch();
  });

  // Reset filter
  btnReset.addEventListener('click', async () => {
    bloodGroupSelect.value = 'O+';
    cityInput.value = 'Pune';
    availableOnlyCheckbox.checked = false;
    state.selectedBloodGroup = 'O+';
    state.selectedCity = 'Pune';
    state.availableOnly = false;
    state.userLocation = null;
    btnLocateMe.classList.remove('btn-locate-active');
    btnLocateMe.innerHTML = '📍 Use My Location';
    resetMapView('Pune');
    await performSearch();
  });

  // Geolocation Button
  btnLocateMe.addEventListener('click', handleGeolocation);

  // Mode Toggle (Demo / Live Backend)
  if (modeToggleBtn) {
    modeToggleBtn.addEventListener('click', async () => {
      const nextMode = state.currentMode === 'mock' ? 'live' : 'mock';
      setActiveMode(nextMode);
      state.currentMode = nextMode;
      updateModeIndicator();
      await performSearch();
    });
  }

  // Modal interactions
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && inventoryModal.classList.contains('active')) {
      closeModal();
    }
  });

  // Expose viewBankDetails globally for Leaflet popups
  window.viewBankDetails = (bankId) => {
    openBankInventoryModal(bankId);
  };
}

/**
 * Handle HTML5 Browser Geolocation
 */
function handleGeolocation() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }

  btnLocateMe.disabled = true;
  btnLocateMe.innerHTML = '⏳ Locating...';

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      state.userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      btnLocateMe.disabled = false;
      btnLocateMe.classList.add('btn-locate-active');
      btnLocateMe.innerHTML = '📍 Location Set ✓';
      cityInput.value = ''; // clear city restriction to search nearest across all
      state.selectedCity = '';
      await performSearch();
    },
    (err) => {
      btnLocateMe.disabled = false;
      btnLocateMe.innerHTML = '📍 Use My Location';
      console.warn('Geolocation failed:', err.message);
      alert('Could not retrieve your location: ' + err.message + '\nUsing default city search instead.');
    },
    { timeout: 10000, enableHighAccuracy: true }
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
      availableOnly: state.availableOnly
    };

    const response = await searchBloodAvailability(params);

    state.searchResults = response.results || [];
    renderResults(response);
    
    // Update Map
    if (getIsMapAvailable()) {
      updateMapMarkers(state.searchResults, state.userLocation, state.selectedBloodGroup);
    }
  } catch (err) {
    console.error('Search failed:', err);
    setErrorState(err.message || 'An unexpected error occurred while searching.');
  } finally {
    setLoadingState(false);
  }
}

/**
 * Render Search Results List
 */
function renderResults(response) {
  const { results, count, source, notice } = response;
  resultsListContainer.innerHTML = '';

  // Update Summary Header
  const groupLabel = state.selectedBloodGroup === 'ALL' ? 'All Blood Groups' : `Group ${state.selectedBloodGroup}`;
  const locationLabel = state.userLocation
    ? 'Near Your Coordinates'
    : (state.selectedCity ? `in ${state.selectedCity}` : 'Across All Cities');

  resultsSummary.innerHTML = `
    <div class="results-header-row">
      <div>
        <strong>${count} Blood Bank${count === 1 ? '' : 's'} Found</strong> for 
        <span class="highlight-badge">${groupLabel}</span> ${locationLabel}
      </div>
      <div class="data-source-badge ${source === 'live' ? 'source-live' : 'source-mock'}">
        ${source === 'live' ? '● Live Backend Data' : '○ Simulated Sample Data'}
      </div>
    </div>
    ${notice ? `<div class="data-notice">${notice}</div>` : ''}
  `;

  if (count === 0) {
    emptyStateContainer.style.display = 'block';
    return;
  }
  emptyStateContainer.style.display = 'none';

  // Render cards
  results.forEach((bank) => {
    const card = document.createElement('div');
    card.className = 'blood-bank-card';
    card.id = `bank-card-${bank.blood_bank_id}`;

    const isAvailable = (bank.units_available || 0) > 0;
    const badgeClass = isAvailable ? 'badge-success' : 'badge-danger';
    const badgeText = isAvailable
      ? `${bank.units_available} Unit${bank.units_available === 1 ? '' : 's'} Available`
      : 'Out of Stock';

    const distanceBadge = bank.distance_km != null
      ? `<span class="distance-badge">📍 ${bank.distance_km} km away</span>`
      : '';

    card.innerHTML = `
      <div class="card-header">
        <h3 class="bank-name">${bank.name}</h3>
        <span class="badge ${badgeClass}">${badgeText}</span>
      </div>
      <div class="card-meta">
        <p class="bank-address">🏢 ${bank.address}, <strong>${bank.city}</strong></p>
        <p class="bank-phone">📞 <a href="tel:${bank.phone}" aria-label="Call blood bank">${bank.phone}</a></p>
        ${bank.operating_hours ? `<p class="bank-hours">⏰ ${bank.operating_hours}</p>` : ''}
        ${distanceBadge}
      </div>
      <div class="card-actions">
        <button class="btn btn-sm btn-outline-secondary btn-show-map" data-id="${bank.blood_bank_id}">
          🗺️ Show on Map
        </button>
        <button class="btn btn-sm btn-primary btn-view-stock" data-id="${bank.blood_bank_id}">
          🩸 View Full Stock
        </button>
      </div>
    `;

    // Bind action buttons
    card.querySelector('.btn-show-map').addEventListener('click', () => {
      focusBankOnMap(bank.blood_bank_id);
      // Smooth scroll on mobile if map is above/below
      if (window.innerWidth < 900) {
        mapContainer.scrollIntoView({ behavior: 'smooth' });
      }
    });

    card.querySelector('.btn-view-stock').addEventListener('click', () => {
      openBankInventoryModal(bank.blood_bank_id);
    });

    resultsListContainer.appendChild(card);
  });
}

/**
 * Open Modal with Full Inventory Breakdown
 */
function openBankInventoryModal(bankId) {
  // Find bank in search results or mock list
  let bank = state.searchResults.find((b) => b.blood_bank_id === bankId);
  if (!bank) {
    bank = MOCK_BLOOD_BANKS.find((b) => b.blood_bank_id === bankId);
  }
  if (!bank) return;

  state.activeBankDetails = bank;
  modalTitle.textContent = bank.name;

  const inv = bank.full_inventory || bank.inventory || {};

  let gridHtml = '<div class="inventory-grid">';
  BLOOD_GROUPS.forEach((bg) => {
    const units = inv[bg] || 0;
    const isAvail = units > 0;
    gridHtml += `
      <div class="inventory-tile ${isAvail ? 'tile-available' : 'tile-empty'}">
        <div class="tile-group">${bg}</div>
        <div class="tile-units">${units}</div>
        <div class="tile-status">${isAvail ? 'In Stock' : 'Unavailable'}</div>
      </div>
    `;
  });
  gridHtml += '</div>';

  modalBody.innerHTML = `
    <div class="modal-info-section">
      <p><strong>Address:</strong> ${bank.address}, ${bank.city}</p>
      <p><strong>Contact:</strong> <a href="tel:${bank.phone}">${bank.phone}</a></p>
      ${bank.operating_hours ? `<p><strong>Hours:</strong> ${bank.operating_hours}</p>` : ''}
    </div>
    <h4 style="margin: 16px 0 8px 0; font-size: 15px; color: #333;">Complete Inventory by Blood Group</h4>
    ${gridHtml}
    <div style="margin-top: 20px; text-align: right;">
      <a href="tel:${bank.phone}" class="btn btn-primary">📞 Call Blood Bank</a>
    </div>
  `;

  inventoryModal.classList.add('active');
  modalOverlay.classList.add('active');
}

function closeModal() {
  inventoryModal.classList.remove('active');
  modalOverlay.classList.remove('active');
  state.activeBankDetails = null;
}

/**
 * Update UI Loading and Error States
 */
function setLoadingState(isLoading) {
  state.isLoading = isLoading;
  if (loadingIndicator) loadingIndicator.style.display = isLoading ? 'flex' : 'none';
  if (resultsListContainer && isLoading) resultsListContainer.style.opacity = '0.5';
  if (resultsListContainer && !isLoading) resultsListContainer.style.opacity = '1';
}

function setErrorState(errorMessage) {
  if (errorMessageText) errorMessageText.textContent = errorMessage;
  if (errorStateContainer) errorStateContainer.style.display = 'block';
  if (resultsListContainer) resultsListContainer.innerHTML = '';
}

/**
 * Update Mode Indicator Pill
 */
function updateModeIndicator() {
  if (!modePill) return;
  if (state.currentMode === 'live') {
    modePill.className = 'mode-pill mode-live';
    modePill.innerHTML = '● Live Backend (Port 5000)';
    if (modeToggleBtn) modeToggleBtn.textContent = 'Switch to Simulated Data';
  } else {
    modePill.className = 'mode-pill mode-mock';
    modePill.innerHTML = '○ Offline Simulation (Sample Data)';
    if (modeToggleBtn) modeToggleBtn.textContent = 'Try Live Backend';
  }
}
