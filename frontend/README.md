# 🩸 DropSync Frontend — Blood Availability Search & Map View

This directory contains the user-facing interface for **DropSync**, resolving **[Issue #3: Build frontend for blood availability search and map view](https://github.com/manash008/DropSync-Blood-bank-dbms-/issues/3)**.

---

## 🌟 Features Implemented

1. **Blood Group & Proximity Search:**
   - Dropdown selection across all 8 blood groups (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`) or all groups simultaneously.
   - City search filter (e.g. `Pune`, `Mumbai`).
   - Browser geolocation button (**"📍 Use My Location"**) to calculate and rank results by real-time distance in kilometers using the Haversine formula.
   - Toggle to filter only facilities with units in stock.

2. **Interactive Map (Leaflet + OpenStreetMap):**
   - Color-coded map pins:
     - 🟢 **Green Pin:** Blood in stock for the selected blood group.
     - 🔴 **Red Pin:** Out of stock (0 units).
     - 🔵 **Blue Pulsing Marker:** User's detected coordinates.
   - Rich popup cards with blood bank name, address, phone number, and a direct link to view full facility stock.
   - Automatic map bounds zooming to include all results and user location.

3. **Fallback & Robust Error/State Handling:**
   - **List-based fallback:** If map tiles or Leaflet fail to load, a warning banner appears and full search/filter functionality remains operational via the results list.
   - Dedicated UI states: **Loading spinner**, **Empty results state**, and **Error state**.

4. **Integration Boundary & Clear Data Mode Flagging:**
   - **Mode Indicator:** Displays whether the data is coming from the live Node.js/Express backend or local sample data.
   - **Simulated Sample Data:** Perfectly aligns with `database/schema.sql` and `database/seed.sql` (Pune and Mumbai facilities).
   - Never misleads users: Offline sample data is explicitly badged as `○ Simulated Sample Data` so mock stock is never mistaken for live hospital units.
   - **One-click toggle button:** Easily switch between testing against the live backend (`localhost:5000`) and the offline demo dataset.

5. **Facility Inventory Breakdown Modal:**
   - Click "🩸 View Full Stock" on any card or map popup to view an 8-tile breakdown of all blood groups for that specific blood bank.

---

## 🚀 How to Run Locally

You can run the frontend with any static HTTP server. Choose any of the following:

### Option 1: Python 3 (Installed by default on macOS)
From the repository root:
```bash
cd frontend
python3 -m http.server 3000
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### Option 2: VS Code Live Server
1. Open the repository in VS Code.
2. Right-click `frontend/index.html`.
3. Select **"Open with Live Server"**.

### Option 3: Node.js `serve` / `http-server` (if Node is installed)
```bash
npx serve frontend -p 3000
```

---

## ⚙️ Configuration (`frontend/js/config.js`)

Edit `frontend/js/config.js` to change connection settings:

```javascript
export const CONFIG = {
  // Base URL for Issue #2 Backend API
  API_BASE_URL: 'http://localhost:5000/api',

  // Fallback to sample data when backend is not running
  AUTO_FALLBACK_TO_MOCK: true,

  // Force mock mode for standalone offline demos
  FORCE_MOCK: true,

  // Default map center (Pune, Maharashtra)
  DEFAULT_CENTER: {
    lat: 18.5204,
    lng: 73.8567,
    name: 'Pune',
    zoom: 12
  }
};
```

---

## 🔗 Backend Contract (Connecting to Issue #2)

When the backend is running (`npm start` under `backend/` on port 5000), the frontend queries:

```http
GET /api/inventory/search?blood_group=O+&city=Pune&available_only=true
```

Expected JSON response format from backend:
```json
{
  "status": "success",
  "data": [
    {
      "blood_bank_id": 1,
      "name": "Demo Central Blood Bank",
      "address": "10 Sample Road",
      "city": "Pune",
      "phone": "+91-20-5550-0101",
      "latitude": 18.520400,
      "longitude": 73.856700,
      "blood_group": "O+",
      "units_available": 12
    }
  ]
}
```

If the backend is not running, the frontend automatically falls back to the embedded mock data without crashing.
