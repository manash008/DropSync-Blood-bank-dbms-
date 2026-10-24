<!-- DropSync README: visual refresh -->
<div align="center">

# 🩸 DropSync

### Find blood. Find help. Bring people together.

<p>
  <a href="https://github.com/manash008/DropSync-Blood-bank-dbms-">
    <img src="https://img.shields.io/badge/Project-DropSync-b5163a?style=for-the-badge&logo=github&logoColor=white" alt="DropSync project">
  </a>
  <img src="https://img.shields.io/badge/Node.js-20.19%2B-43853d?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js 20.19 or newer">
  <img src="https://img.shields.io/badge/MySQL-8.0.19%2B-00758f?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL 8.0.19 or newer">
  <img src="https://img.shields.io/badge/MongoDB-Optional-47a248?style=for-the-badge&logo=mongodb&logoColor=white" alt="Optional MongoDB">
</p>

<img src="https://readme-typing-svg.demolab.com?font=Inter&weight=700&size=22&pause=1000&color=B5163A&center=true&vCenter=true&width=720&lines=Search+blood+inventory+by+group+and+city;Explore+banks+on+an+interactive+map;Built+with+SQL%2C+Express%2C+and+MongoDB" alt="DropSync: blood inventory search, interactive map, and database learning project">

<p>
  <a href="#-what-is-dropsync">About</a> ·
  <a href="#-screenshots--demo">Screenshots & demo</a> ·
  <a href="#-get-started">Get started</a> ·
  <a href="#-api-at-a-glance">API</a> ·
  <a href="database/README.md">Database guide</a>
</p>

</div>

---

> [!IMPORTANT]
> DropSync is an **academic demonstration**, not an emergency service. All included people, addresses, contact details, and inventory are fictional classroom records. Inventory is not real-time; contact local emergency services or a verified blood bank for urgent needs.

## 🩸 What is DropSync?

DropSync is a local blood-bank inventory search demo. Search by blood group and city, browse matching facilities, and explore those with coordinates on a Leaflet/OpenStreetMap map. It brings a browser UI, an Express API, and a relational MySQL model together, with optional MongoDB activity summaries.

### ✨ What you can explore

| Feature | What it does |
| --- | --- |
| 🧪 Inventory search | Looks up blood-bank stock by blood group and optional city using parameterized SQL. |
| 🗺️ Map and nearby sorting | Plots facilities with coordinates and can sort search results by browser location. |
| 🏥 Hospital request feed | Reads requests with status, urgency, and city filters. |
| 🍃 Optional activity reporting | Stores privacy-conscious successful-search summaries in MongoDB and aggregates them. |
| 📚 DBMS examples | Includes relational schema, seed records, joins, constraints, indexes, reports, and an <code>EXPLAIN</code> example. |

## 🎬 Screenshots & demo

The app is served locally at <a href="http://localhost:5000">localhost:5000</a> after setup. A screen recording can be added here when the team has one:

<!-- Replace the comment below with a link to a committed demo video or a YouTube/GitHub video URL. -->
<details>
<summary>▶️ Add or view the DropSync walkthrough</summary>

No walkthrough video has been added to the repository yet. To add one, record the search flow and link it here (or add a compressed clip under <code>docs/media/</code>).

</details>

Want to contribute a screenshot? Add an image under <code>docs/media/</code> and link it here so the preview stays in the repository.

## 🏗️ How it fits together

~~~text
┌─────────────────────────────────────────────────────────┐
│ Browser: responsive search UI + Leaflet/OpenStreetMap  │
└───────────────────────────┬─────────────────────────────┘
                            │ same-origin HTTP
                            ▼
                   Express REST API
                    /api/blood-banks
                    /api/requests
                    /api/health
                      │         │
                      ▼         ▼
                MySQL 8       MongoDB
                source of     optional search
                inventory     activity summaries
~~~

MySQL is the source of truth for inventory. MongoDB is optional and receives only the blood group, city, result count, and timestamp for successful searches. Passwords, tokens, IP addresses, and donor contact details are not logged.

## 🧰 Built with

<p>
  <img src="https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JavaScript-e34f26?style=flat-square&logo=html5&logoColor=white" alt="HTML, CSS, JavaScript">
  <img src="https://img.shields.io/badge/Backend-Express-000000?style=flat-square&logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/Database-MySQL-00758f?style=flat-square&logo=mysql&logoColor=white" alt="MySQL">
  <img src="https://img.shields.io/badge/NoSQL-MongoDB-47a248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB">
  <img src="https://img.shields.io/badge/Map-Leaflet-199900?style=flat-square&logo=leaflet&logoColor=white" alt="Leaflet">
</p>

## 🚀 Get started

### Prerequisites

- Node.js 20.19+, 22.13+, or 24+ with npm
- MySQL 8.0.19+ with InnoDB for inventory search
- MySQL command-line client for database setup
- Optional: MongoDB Community Server and <code>mongosh</code>

The Leaflet map uses public OpenStreetMap tiles and needs internet access for map assets. Search and the results list still work when those assets are unavailable.

### 1. Install dependencies

~~~powershell
npm ci
Copy-Item .env.example .env
~~~

### 2. Configure MySQL

Edit <code>.env</code> with your local MySQL connection settings. The example database name is <code>bloodbank_sql</code>. Create/load the schema and fictional sample data using the steps in the [database setup guide](database/README.md).

Never commit <code>.env</code> or real credentials.

### 3. Optionally enable MongoDB

Set <code>MONGO_URI</code> to a MongoDB URI ending in <code>/bloodbank_nosql</code>. Leave it blank to disable activity logging. If MongoDB is unavailable, SQL search remains usable.

### 4. Start DropSync

~~~powershell
npm run dev
~~~

Open <a href="http://localhost:5000">http://localhost:5000</a>. Use <code>npm start</code> for a regular run without file watching.

The backend can start without SQL settings, but inventory search then returns a safe <code>503</code> response until MySQL is configured. Authentication and <code>JWT_SECRET</code> are not implemented because the current schema has no user/role table.

### Environment settings

| Variable | Needed for | Description |
| --- | --- | --- |
| <code>PORT</code> | Optional | HTTP port; defaults to <code>5000</code>. |
| <code>FRONTEND_URL</code> | Optional | Allowed frontend origin; defaults to <code>http://localhost:5000</code>. |
| <code>DB_HOST</code>, <code>DB_NAME</code>, <code>DB_USER</code> | SQL search | MySQL host, database, and account. |
| <code>DB_PORT</code> | Optional | MySQL port; defaults to <code>3306</code>. |
| <code>DB_PASSWORD</code> | MySQL account | Password for the configured MySQL user; empty is supported for passwordless local accounts. |
| <code>MONGO_URI</code> | Optional | MongoDB connection string; blank disables logging. |

## 🔌 API at a glance

### Inventory search

~~~text
GET /api/blood-banks?bloodGroup=O%2B&city=Pune
~~~

Supported groups: <code>A+</code>, <code>A-</code>, <code>B+</code>, <code>B-</code>, <code>AB+</code>, <code>AB-</code>, <code>O+</code>, <code>O-</code>, or <code>ALL</code>. City is optional. Browser location can supply paired <code>lat</code>/<code>lng</code> values to sort results by distance.

### Hospital requests

~~~text
GET /api/requests?status=pending&urgency=critical&city=Pune
~~~

Filters: status (<code>pending</code>, <code>matched</code>, <code>fulfilled</code>, <code>cancelled</code>, <code>all</code>), urgency (<code>critical</code>, <code>high</code>, <code>normal</code>, <code>low</code>, <code>all</code>), and optional city.

### Readiness

~~~text
GET /api/health
~~~

Reports SQL readiness and Mongo activity-logging status. Returns HTTP <code>503</code> if MySQL is not configured or reachable.

## 🗄️ Database learning highlights

The normalized relational model includes <code>blood_groups</code>, <code>donors</code>, <code>blood_banks</code>, <code>hospitals</code>, <code>inventory</code>, <code>requests</code>, and <code>donations</code>.

Inside <code>database/</code>, you’ll find:

- SQL schema, foreign keys, constraints, and fictional seed records
- Joins for inventory, requests, donation history, and donor search
- Aggregated available units by city and blood group
- Indexes for common group, city, stock, urgency, and history lookups
- A transaction example for a donation and inventory update
- MySQL <code>EXPLAIN</code> example and query notes
- Optional MongoDB activity collection and aggregation report

See the [database guide](database/README.md) for initialization steps and explanations.

## 🍃 Optional MongoDB aggregation

Successful searches can write a document to <code>activity_logs</code>. The aggregation groups searches by blood group and city, showing search counts and the total number of banks returned. No identity or contact data is stored.

Run after searches have been logged:

~~~powershell
npm run db:aggregate
~~~

Alternatively:

~~~powershell
mongosh "mongodb://127.0.0.1:27017/bloodbank_nosql" --quiet --file database/mongo-aggregation.js
~~~

## ✅ Run project checks

~~~powershell
npm test
npm run lint
npm run format:check
~~~

The standard tests do not require MySQL. Optional MySQL and MongoDB integration tests run only when their test environment variables and local services are configured. Details are in the root project docs and [database guide](database/README.md).

## 🧭 Current scope

Implemented: static search UI, Express health/search/request APIs, MySQL inventory queries, optional MongoDB search summaries, Leaflet map, and DBMS examples.

Still future work: authentication, donor CRUD, request management writes, donation API, delivery-provider integrations, and deployment. The README describes the current repository state; it does not imply these future pieces are already available.

## 📁 Project layout

~~~text
backend/       Express application, database pool, search, optional activity logger
frontend/      Static responsive search/map UI served by Express
database/      MySQL schema, fictional seed data, reports, Mongo aggregation
tests/         API tests and optional MongoDB integration test
.env.example   Placeholder configuration (copy to .env locally)
~~~

## 🤝 Contributing

1. Fork the repository and create a focused branch.
2. Make the change and run the relevant checks above.
3. Open a pull request with a short summary and screenshots for UI changes.

---

<div align="center">

Made with ❤️ for learning database systems and supporting blood-donation awareness.

<a href="https://github.com/manash008/DropSync-Blood-bank-dbms-">⬆ Back to repository</a>

</div>
