# DropSync Frontend

This responsive HTML/CSS/JavaScript interface is served from `frontend/` by the Express app. It searches the MySQL-backed API, renders inventory results, and plots facilities with valid coordinates on Leaflet/OpenStreetMap.

## Start the application

From the repository root:

```powershell
npm ci
Copy-Item .env.example .env
# Set DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD in .env
npm run dev
```

Open `http://localhost:5000`. For a frontend-only offline walkthrough, run `python -m http.server 3000 --directory frontend`, open `http://localhost:3000`, and choose **Switch to Simulated Data**. When using that separate static server with a live API, set `window.DROPSYNC_API_BASE_URL` to `http://localhost:5000/api` and set backend `FRONTEND_URL` to `http://localhost:3000`. The badge and result notice identify sample inventory as simulated. The live mode never silently substitutes demo results after an API error.

The Express app serves `frontend/index.html`, styles, modules, and the API from one origin by default. If hosting the frontend separately, set `window.DROPSYNC_API_BASE_URL` before `js/app.js` loads and set backend `FRONTEND_URL` to the frontend's exact origin. CORS allows that configured origin only.

## Search behavior and API contract

The frontend requests:

```http
GET /api/blood-banks?bloodGroup=O%2B&city=Pune
```

The same endpoint accepts `bloodGroup=ALL` for every recorded inventory row, an omitted `city` to search all cities, and paired `lat`/`lng` coordinates from the location button. Coordinates are validated by the API; returned facilities are distance-sorted when coordinates are supplied. The **Only in-stock banks** filter is applied to returned SQL rows. Zero-unit rows remain visible when the filter is off.

Successful API rows use camelCase fields:

```json
{
  "count": 1,
  "data": [
    {
      "bloodBankId": "1",
      "name": "Demo Central Blood Bank",
      "address": "10 Sample Road",
      "city": "Pune",
      "phone": "+91-20-5550-0101",
      "latitude": 18.5204,
      "longitude": 73.8567,
      "bloodGroup": "O+",
      "unitsAvailable": 12
    }
  ]
}
```

`count` reports distinct blood banks. In `ALL` mode, `data` may contain one row per bank and blood group; the UI combines those records into a bank card and shows the returned group rows in its inventory dialog. It does not infer that an unreturned group has zero units.

Invalid search input returns `400`; SQL not configured or unavailable returns a sanitized `503`. The UI displays those errors instead of presenting them as live results.

## Map and data limitations

- Search and the results list work without the map service or any map key.
- The map uses the Leaflet library and OpenStreetMap tiles loaded from their public CDNs. If they are unreachable, a warning appears and list search remains usable.
- Markers are drawn only when SQL provides latitude and longitude.
- Names, addresses, telephone details, and inventory in the included seed and sample records are fictional classroom data. They are not a real-time blood supply.
- No Google Maps API key is needed or used.
