# 🩸 DropSync — Blood Bank Database Management System

> **Find the right blood. Find it nearby. Act faster.**

DropSync is a Blood Bank Database Management System designed to help patients and hospitals find nearby blood banks and check blood availability by blood group.

The project follows a **SQL + NoSQL architecture**: SQL handles structured relational data such as donors, blood banks, hospitals, inventory, requests and donations, while MongoDB is intended for flexible operational data such as activity logs and future delivery requests.

## 🎯 Problem Statement

During an emergency, finding the required blood group quickly can be difficult. Blood availability may be distributed across multiple blood banks, and manually checking each location can waste valuable time.

DropSync aims to provide a centralized platform for:

- Finding nearby blood banks.
- Checking blood-group availability and units.
- Managing donor information and donation records.
- Allowing hospitals to raise blood requests.
- Matching requests with available inventory and nearby donors.
- Generating useful database reports.

## ✨ Key Features

### 🔎 Nearby Blood Bank Search
Select a blood group and use location information to identify nearby blood banks.

### 🩸 Blood Inventory Management
Maintain blood stock by blood group and blood bank.

### 👤 Donor Management
Store donor information and donation history.

### 🏥 Hospital Requests
Hospitals can raise requests containing the required blood group, units, status and request time.

### 📍 Location-Based Matching
Use blood-group availability and proximity to identify suitable blood banks/donors.

### 📊 Reports
SQL aggregation can provide reports such as total available units per blood group per city.

### 📝 Activity Logging
MongoDB is planned for flexible data such as login attempts and search history.

### 🚚 Delivery Integration — Future
The architecture can support a future delivery-provider API/webhook without redesigning the core system.

## 🏗️ System Architecture

```text
User
 │
 ▼
Frontend (React / HTML-CSS-JS)
 │
 │ REST API
 ▼
Backend (Node.js + Express)
 │
 ├───────────────┬────────────────┐
 ▼               ▼                ▼
MySQL/          MongoDB          Maps
PostgreSQL      NoSQL            Service
 │               │
 ├─ Donors       ├─ Activity Logs
 ├─ Blood Banks  └─ Delivery Requests
 ├─ Hospitals
 ├─ Inventory
 ├─ Requests
 └─ Donations
```

## 🧰 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React or HTML/CSS/JavaScript | Login, dashboards, search and map UI |
| Backend | Node.js + Express | REST APIs and application logic |
| Primary DB | MySQL / PostgreSQL | Structured relational data |
| Secondary DB | MongoDB | Logs and flexible operational data |
| Maps | Leaflet + OpenStreetMap or Google Maps | Nearby blood-bank visualization |
| Authentication | JWT + bcrypt | Authentication and password hashing |
| API Testing | Postman / Thunder Client | API testing |
| Configuration | `.env` | Credentials and API configuration |

## 🗄️ Database Design

### SQL Tables

| Table | Main Purpose |
|---|---|
| `donors` | Donor details, blood group, contact and location |
| `blood_banks` | Blood-bank details, address and location |
| `hospitals` | Hospital information |
| `inventory` | Available units by blood bank and blood group |
| `requests` | Hospital blood requests |
| `donations` | Recorded donations |

### SQL Concepts

- Primary and foreign keys
- Referential integrity
- SQL joins
- Indexing
- Filtering and sorting
- Aggregation queries
- Transactions
- Query optimization with `EXPLAIN`

### MongoDB Collections

- `activity_logs` — login attempts and search history.
- `delivery_requests` — flexible delivery-partner payloads for future integration.

A MongoDB aggregation pipeline can be used to group/analyze requests by urgency or location.

## 🔄 Core Workflow

```text
1. User selects required blood group
              ↓
2. User provides location
              ↓
3. Backend receives search request
              ↓
4. SQL checks blood inventory
              ↓
5. Nearby blood banks are calculated/ranked
              ↓
6. Results are returned to frontend
              ↓
7. User views availability and contact details
```

For hospital requests:

```text
Hospital creates request
        ↓
Blood group + units + location/status
        ↓
Check inventory
        ↓
Find suitable nearby blood banks/donors
        ↓
Return matching options
```

## 📈 DBMS Concepts Demonstrated

DropSync is intended to demonstrate practical DBMS concepts, including:

### SQL Queries

- Joining donors, blood banks, inventory and requests.
- Finding available units for a blood group.
- Finding blood banks based on location.
- Calculating total units per blood group per city.
- Updating inventory after a donation.
- Retrieving pending requests.

### Indexing

Frequently searched fields such as `blood_group`, location fields and foreign-key columns can be indexed for faster queries.

### Transactions

Donation-related inventory changes should be performed transactionally so the donation record and stock update remain consistent.

### Query Optimization

`EXPLAIN` can be used to inspect execution plans and justify indexing/query improvements.

### MongoDB Aggregation

MongoDB aggregation can summarize flexible activity/request data, such as grouping requests by urgency or location.

## 🗺️ Development Roadmap

### Phase 1 — Authentication & Core DB

- Login/Register
- Donor, hospital and admin roles
- Password hashing
- JWT sessions
- CRUD operations
- SQL schema and seed data

### Phase 2 — Search & Maps

- Location access
- Nearby blood-bank search
- Distance-based ranking
- Map visualization
- Blood-group availability

### Phase 3 — Requests & Matching

- Hospital blood requests
- Inventory matching
- Donor matching
- Blood-group and proximity filtering
- Request status management

### Phase 4 — Delivery Integration

- Delivery service abstraction
- Future Porter/API/webhook integration
- Pluggable delivery-provider design

### Phase 5 — Optimization & Documentation

- SQL indexes
- `EXPLAIN` analysis
- MongoDB aggregation
- Query optimization
- Test data and sample outputs
- Complete project documentation

## 💻 Local Development Setup

### Prerequisites

- Node.js
- MySQL or PostgreSQL
- MongoDB Community Server
- MongoDB Compass
- Git
- Postman or Thunder Client

### Databases

```text
SQL:     bloodbank_sql
MongoDB: bloodbank_nosql
```

The SQL schema, fictional seed data, and example queries are available in the [database directory](database/README.md). The current scripts target MySQL 8.0.19+. MongoDB setup and the application services remain planned work.

### Environment Variables

Create a `.env` file for local configuration. Example:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
MONGO_URI=mongodb://localhost:27017/bloodbank_nosql
JWT_SECRET=your_secret
GOOGLE_MAPS_API_KEY=your_key_here
```

**Never commit real passwords, JWT secrets or API keys to GitHub.**

Typical local ports:

```text
Frontend  → localhost:3000
Backend   → localhost:5000
MySQL     → localhost:3306
MongoDB   → localhost:27017
```

## 🧪 Testing

Postman or Thunder Client can be used to test the REST API.

Recommended test areas:

- Registration and login
- Donor CRUD
- Blood-bank and inventory operations
- Hospital requests
- Blood availability queries
- Donation/inventory updates
- Invalid input handling
- Authentication and authorization
- Database query results

## 📁 Intended Project Structure

```text
dropsync/
├── database/       # SQL schema, seed data and queries
├── backend/        # REST API and database connections
├── frontend/       # Web UI, dashboards and map interface
└── README.md       # Project documentation
```

> **Repository status:** 
> - **Database:** MySQL relational schema, seed data, and query examples implemented under `database/`.
> - **Backend:** Node.js + Express REST API foundation and SQL integration implemented under `backend/` (Health check, parameterized inventory search, hospital requests, metadata endpoints, and atomic donation transaction). Authentication is marked pending until a user/role schema table is decided.
> - **Frontend & MongoDB:** Frontend UI and MongoDB activity logging remain planned in subsequent phases.

## 🔮 Future Scope

- SMS/email alerts for urgent shortages
- Donor eligibility reminders
- Blood-bank admin dashboard
- Real-time inventory updates
- Advanced donor-request matching
- Delivery-partner integration
- Analytics dashboard for blood demand and availability

## 🎓 Academic DBMS Focus

DropSync connects DBMS concepts with a real-world emergency healthcare problem. The design demonstrates relational database modeling, primary/foreign keys, joins, indexing, transactions, aggregation and query optimization, while also introducing NoSQL storage for flexible operational data.

The project follows the provided DBMS work map: **SQL for core relational records and MongoDB for flexible logs/request data.**

## 👨‍💻 Project

**DropSync — Blood Bank Database Management System**

Academic project focused on **database design, SQL + NoSQL integration, location-based search and real-world problem solving**.

## 📜 License

This project is intended for academic and educational use. Add a project-specific open-source license if required.
