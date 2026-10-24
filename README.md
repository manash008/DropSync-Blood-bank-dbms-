# DropSync — Blood Bank Database Management System

DropSync is a local academic demo for searching blood-bank inventory by blood group and city. The implemented path is a static browser UI, an Express API, and the existing MySQL relational model. Optional MongoDB logging records successful search summaries.

All included people, contact details, addresses, and inventory are fictional classroom records. They are not real-time blood availability.

## Implemented features

- Parameterized MySQL search across `inventory`, `blood_banks`, and `blood_groups`.
- Responsive search UI with blood-group and city validation, loading, empty-result, and backend-error states.
- Results include bank name, address, phone, blood group, units, and coordinates when present. Leaflet/OpenStreetMap plots facilities with coordinates; browser location can distance-sort results.
- Optional MongoDB `activity_logs` search events and an aggregation report. SQL search works if MongoDB is unconfigured or unavailable.
- Existing relational schema, seed data, joins, reports, indexes, and EXPLAIN example in `database/`.

## Architecture

```text
Browser (static HTML/CSS/JS served by Express)
                     │
                     ▼
          GET /api/blood-banks
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
 MySQL 8.0.19+             Optional MongoDB
 donors, banks,            activity_logs
 hospitals, inventory,     search summaries
 requests, donations
```

The SQL model is the source of truth for inventory. MongoDB only receives search group, city, result count, and timestamp. Passwords, tokens, IP addresses, and donor contact details are not logged.

## Prerequisites

- Node.js 20.19+, 22.13+, or 24+ and npm.
- MySQL 8.0.19 or newer with the InnoDB engine.
- MongoDB Community Server only if activity logging is wanted.
- `mysql` command-line client for local SQL initialization.
- `mongosh` for running the aggregation example.

The embedded map uses Leaflet and OpenStreetMap; it needs external tile access but no Google Maps key. Search and the results list work when those map assets are unavailable.

## Local setup

1. Install the Node dependencies and create a local environment file:

   ```powershell
   npm ci
   Copy-Item .env.example .env
   ```

2. Edit `.env` with your local MySQL host, database, user, and password. The example uses `bloodbank_sql`. Never commit `.env` or real credentials.

3. Create and load the SQL database. See [database setup and query notes](database/README.md). The schema and seed scripts create tables and fictional demo records; run them against a new empty database.

4. Optionally start MongoDB and keep `MONGO_URI` set to a database URI ending in `/bloodbank_nosql`. Leave `MONGO_URI` blank to run without MongoDB. A Mongo connection failure disables logging but does not disable SQL search.

5. Start the app:

   ```powershell
   npm run dev
   ```

   Open [http://localhost:5000](http://localhost:5000). For a normal start without file watching, use `npm start`.

The Express server serves the frontend and API from one origin by default. If you host the frontend separately, set `FRONTEND_URL` to that exact origin and configure `window.DROPSYNC_API_BASE_URL` in the frontend; CORS is restricted to the configured origin. See [frontend setup and behavior](frontend/README.md).

## Environment variables

| Variable       | Required                 | Default / use                                                               |
| -------------- | ------------------------ | --------------------------------------------------------------------------- |
| `PORT`         | No                       | HTTP port; defaults to `5000`.                                              |
| `FRONTEND_URL` | No                       | Allowed browser origin; defaults to `http://localhost:5000`.                |
| `DB_HOST`      | For SQL search           | MySQL hostname.                                                             |
| `DB_PORT`      | No                       | MySQL port; defaults to `3306`.                                             |
| `DB_NAME`      | For SQL search           | Database containing the schema.                                             |
| `DB_USER`      | For SQL search           | MySQL account.                                                              |
| `DB_PASSWORD`  | Depends on local account | MySQL password; an empty value is accepted for passwordless local accounts. |
| `MONGO_URI`    | No                       | MongoDB connection string; blank disables logging.                          |

The backend starts without SQL settings so the page and health route remain available, but database search responds with a safe `503` until SQL is configured. Authentication and `JWT_SECRET` are not implemented because the schema has no user or role table.

## API

### Health/readiness

`GET /api/health` returns database readiness and whether activity logging is enabled. It returns `503` when MySQL is not configured or cannot be reached.

### Search inventory

```powershell
curl.exe --get --data-urlencode "bloodGroup=O+" --data-urlencode "city=Pune" http://localhost:5000/api/blood-banks
```

Supported blood groups are `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, and `O-`; use `ALL` to search every recorded group. `city` is optional for an all-city search. The location button supplies paired `lat`/`lng` coordinates and sorts matching results by distance. A successful response returns these fields:

```json
{
  "count": 2,
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
    },
    {
      "bloodBankId": "2",
      "name": "Demo Riverside Blood Bank",
      "address": "22 Example Avenue",
      "city": "Pune",
      "phone": "+91-20-5550-0102",
      "latitude": 18.5362,
      "longitude": 73.8939,
      "bloodGroup": "O+",
      "unitsAvailable": 6
    }
  ]
}
```

This response is verified against the fictional rows in `database/seed.sql`. The API always reads current SQL inventory. A successful search with no matching stock returns `200` with `{"data":[],"count":0}`. Invalid input returns `400`; missing SQL configuration or a database failure returns a sanitized `503`.

### Hospital blood requests

```powershell
curl.exe --get --data-urlencode "status=pending" --data-urlencode "city=Pune" http://localhost:5000/api/requests
```

Optional query parameters include:

- `status`: `pending` (default), `matched`, `fulfilled`, `cancelled`, or `all`.
- `urgency`: `critical`, `high`, `normal`, `low`, or `all`.
- `city`: optional exact city filter (e.g. `Pune`, `Mumbai`).

A successful response returns matching hospital blood requests ordered by urgency (`critical` first) and request time:

```json
{
  "count": 2,
  "data": [
    {
      "requestId": "1",
      "hospitalId": "1",
      "hospitalName": "Demo City Hospital",
      "hospitalCity": "Pune",
      "hospitalPhone": "+91-20-5550-0201",
      "hospitalLatitude": 18.515,
      "hospitalLongitude": 73.845,
      "bloodGroup": "O+",
      "unitsRequested": 4,
      "urgency": "critical",
      "status": "pending",
      "fulfilledByBloodBank": null,
      "requestedAt": "2026-10-20T08:15:00Z",
      "fulfilledAt": null,
      "notes": "Fictional classroom example"
    },
    {
      "requestId": "2",
      "hospitalId": "1",
      "hospitalName": "Demo City Hospital",
      "hospitalCity": "Pune",
      "hospitalPhone": "+91-20-5550-0201",
      "hospitalLatitude": 18.515,
      "hospitalLongitude": 73.845,
      "bloodGroup": "A+",
      "unitsRequested": 2,
      "urgency": "normal",
      "status": "pending",
      "fulfilledByBloodBank": null,
      "requestedAt": "2026-10-20T10:30:00Z",
      "fulfilledAt": null,
      "notes": null
    }
  ]
}
```

## SQL and DBMS examples

The database scripts preserve the normalized `blood_groups`, `donors`, `blood_banks`, `hospitals`, `inventory`, `requests`, and `donations` model. The API joins inventory to blood banks and blood groups; `ALL` returns the bank/group records so the frontend can group actual inventory. The in-stock checkbox filters zero-unit rows in the UI. The scripts include:

- Joins for inventory search, pending hospital requests, donation history, and donor search.
- Aggregation of available units by city and blood group.
- Foreign keys, unique inventory per bank/group, positive-unit checks, and coordinate checks.
- Indexes for donor group/city, bank/hospital city, inventory group/stock, request status/urgency/date, and donation history.
- A transaction example that writes a donation and increments inventory together.
- A MySQL `EXPLAIN` query for the search access pattern.

The query file includes short explanations of what each report returns and why it is useful. It can be inspected and run as documented in [database/README.md](database/README.md). Verified outputs and the MySQL 8.4 `EXPLAIN` plan are documented in `database/README.md`.

## Optional MongoDB activity reporting

A successful API search records a document with `eventType`, `bloodGroup`, `city`, `resultCount`, and `occurredAt` in the `activity_logs` collection. It records neither identity nor query credentials. If MongoDB is absent, search still returns SQL results and logging is marked unavailable or disabled in the health response.

Run the aggregation from the project root after at least one search using either npm or mongosh:

```powershell
npm run db:aggregate
```

or with the MongoDB shell:

```powershell
mongosh "mongodb://127.0.0.1:27017/bloodbank_nosql" --quiet --file database/mongo-aggregation.js
```

It groups actual search events by blood group and city. `searchCount` is how often that combination was searched; `matchingBanksReturned` sums the result counts returned by those searches. An empty collection produces no result documents. The collection and aggregation are documented in [database/README.md](database/README.md).

## Checks

```powershell
npm test
npm run lint
npm run format:check
```

The API tests use a fake SQL pool to cover parameterization, validation, location sorting, empty results, sanitized failures, CORS, static UI serving, and Mongo failure tolerance. Frontend API tests verify the documented query and field mapping, including visible backend failures. The standard test run does not require MySQL. A read-only MySQL integration test runs when `MYSQL_TEST_DATABASE` is set and `.env` contains valid connection settings. A MongoDB integration test runs when `MONGO_TEST_URI` is set; it writes one isolated test event, verifies the aggregation, and removes that event.

For optional integration checks in PowerShell, configure `.env` and run:

```powershell
$env:MYSQL_TEST_DATABASE = "bloodbank_sql"
$env:MONGO_TEST_URI = "mongodb://127.0.0.1:27017/bloodbank_nosql"
npm test
Remove-Item Env:MYSQL_TEST_DATABASE, Env:MONGO_TEST_URI
```

The MySQL test only reads from the explicitly selected database. The MongoDB test removes its temporary test event when it completes.

## Known limitations and future work

- Only search and readiness routes are implemented; request management, donor CRUD, donation writes through the API, and authentication are not exposed.
- Search filters by blood group and optional city. Browser location distance-sorts returned coordinates; it does not guarantee physical availability. The UI shows zero-unit SQL inventory unless the in-stock filter is selected.
- The map uses Leaflet and OpenStreetMap tiles from public CDNs, with a list fallback when map assets are unavailable. No Google Maps key is required.
- MongoDB is optional and currently stores successful search summaries only. Login-attempt and request events are not supported because those flows do not exist yet.
- Delivery-provider integration, including Porter, remains future scope.
- Keep MySQL and MongoDB on trusted local networks and use least-privilege credentials for any shared deployment.

## Project files

```text
backend/       Express app, SQL pool, search, and optional activity logging
frontend/      Static Leaflet search/map UI served by Express
database/      MySQL schema, fictional seed data, reports, and Mongo aggregation
tests/         API tests and optional MongoDB integration test
.env.example   Placeholder configuration only
```
