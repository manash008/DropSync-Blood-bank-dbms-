# 🩸 DropSync: Find Blood Nearby, Instantly
DropSync is a full-stack web app that helps patients and hospitals quickly find out whether the blood they need is available at the nearest blood bank. Choose a blood group, share your location, and see nearby banks on an interactive map, marked as available or unavailable.

> Every drop, in sync.

## How It Works

1. The user selects a blood group and allows location access.
2. The backend calculates the distance to each blood bank and checks its inventory in the SQL database.
3. The map shows banks as green (in stock) or red (out of stock), with distance, contact details, and units available.

## Key Features

- **Nearest blood bank search** with availability by blood group
- **Map integration** using Leaflet and OpenStreetMap
- **Donor registration** and donation tracking
- **Hospital requests** for blood units
- **City-wise stock reports** showing total units per blood group per city
- **Automatic inventory updates** whenever a donation is recorded

## Database Design

The relational database contains six tables: donors, blood banks, hospitals, inventory, requests, and donations. It uses primary and foreign keys to protect data integrity, indexes on blood group and location for fast searches, and joins and aggregation queries to power availability checks and reports. Donations are recorded inside transactions so stock counts stay accurate.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript, Leaflet |
| Backend | Node.js with Express |
| Database | MySQL |

## Project Structure

```
dropsync/
├── database/   # schema, seed data, queries
├── backend/    # REST API and database connection
└── frontend/   # website and map interface
```

## Future Scope

- SMS or email alerts to eligible donors during urgent shortages
- Admin dashboard for blood banks to manage stock
- Reminders when donors become eligible to donate again

DropSync aims to save time when it matters most by connecting people in need with the nearest available blood supply.
