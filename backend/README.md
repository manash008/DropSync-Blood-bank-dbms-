# 🩸 DropSync Backend API Foundation & SQL Integration

Backend application for **DropSync — Blood Bank Database Management System**, built with **Node.js + Express** and connected to the MySQL relational database schema.

---

## 📋 Table of Contents
1. [Overview & Architecture](#overview--architecture)
2. [Prerequisites & Environment Setup](#prerequisites--environment-setup)
3. [Running the Application](#running-the-application)
4. [Authentication Status & Schema Decision](#authentication-status--schema-decision)
5. [API Documentation & Examples](#api-documentation--examples)
   - [Health & Database Readiness](#1-health--database-readiness)
   - [Blood Inventory Search](#2-blood-inventory-search)
   - [Inventory Aggregated Summary](#3-inventory-aggregated-summary)
   - [Hospital Blood Requests](#4-hospital-blood-requests)
   - [Metadata & Supporting Endpoints](#5-metadata--supporting-endpoints)
   - [Atomic Donation Transaction](#6-atomic-donation-transaction)
6. [SQL Safety & Parameterization](#sql-safety--parameterization)
7. [Error Handling & Response Format](#error-handling--response-format)
8. [Implementation Status](#implementation-status)

---

## 🏛️ Overview & Architecture

The backend provides a RESTful interface for DropSync, querying MySQL 8.0.19+ (InnoDB) using connection pooling via `mysql2/promise`.

All database operations enforce:
- **Parameterized queries** using `?` placeholders to eliminate SQL injection vulnerabilities.
- **Relational joins** linking `inventory`, `blood_banks`, `blood_groups`, `hospitals`, `requests`, and `donations`.
- **Atomic transactions** for inventory stock modification during donations.
- **Graceful degradation**: If the SQL server is temporarily unreachable, the health check returns HTTP 503 with actionable diagnostics instead of crashing the server process.

---

## ⚙️ Prerequisites & Environment Setup

### Prerequisites
- **Node.js** (v18.x or v20.x+ recommended)
- **MySQL Server** (8.0.19+ recommended) with the database initialized using `database/schema.sql` and `database/seed.sql`.

### 1. Database Initialization
Ensure your local MySQL instance has the database and seed data loaded:
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS bloodbank_sql CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
mysql -u root -p bloodbank_sql < database/schema.sql
mysql -u root -p bloodbank_sql < database/seed.sql
```

### 2. Environment Configuration
Copy the `.env.example` file to create your local `.env`:
```bash
cp .env.example .env
```

Edit `.env` with your local database credentials:
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_password
DB_NAME=bloodbank_sql
CLIENT_URL=http://localhost:3000
```
> **Security Note:** Real credentials are strictly excluded via `.gitignore`. Never commit `.env` to Git.

---

## 🚀 Running the Application

### Install Dependencies
```bash
npm install
```

### Start in Production Mode
```bash
npm start
```

### Start in Development Mode (with hot-reload via nodemon)
```bash
npm run dev
```

The server will listen at `http://localhost:5000`.

---

## 🔐 Authentication Status & Schema Decision

> **Architectural Decision (Per Issue #2 Scope):**
> 
> The current relational schema (`database/schema.sql`) models domain entities (`blood_groups`, `donors`, `blood_banks`, `hospitals`, `inventory`, `requests`, `donations`), but **does not yet include a dedicated `users` or `roles` authentication table**.
>
> In strict accordance with the issue scope guidelines:
> - **Authentication (JWT + bcrypt) is marked as PENDING**.
> - Auth is deferred until the project team decides on the authentication model (e.g., whether donors and hospitals share a unified `users` table with a `role` enum, or if hospitals authenticate via API credentials / license numbers).
> - Rather than stubbing a non-functional mock auth system that could drift from future schema changes, the core relational database endpoints (health, inventory, requests, metadata) are fully implemented and production-ready.

---

## 📡 API Documentation & Examples

All examples can be tested with `curl`, Postman, or the Thunder Client extension.

### 1. Health & Database Readiness
Checks server uptime and verifies whether the MySQL database connection pool is healthy.

* **Endpoint:** `GET /api/health`
* **cURL:**
  ```bash
  curl -s http://localhost:5000/api/health
  ```
* **Success Response (HTTP 200):**
  ```json
  {
    "status": "healthy",
    "uptime": 12,
    "timestamp": "2026-10-24T18:00:00.000Z",
    "services": {
      "api": {
        "status": "up"
      },
      "database": {
        "engine": "MySQL (8.0.19+ InnoDB)",
        "status": "connected",
        "details": "Database connection successful",
        "serverTime": "2026-10-24T18:00:00.000Z"
      }
    }
  }
  ```
* **Degraded Response (HTTP 503 - DB down):**
  ```json
  {
    "status": "degraded",
    "uptime": 4,
    "timestamp": "2026-10-24T18:00:00.000Z",
    "services": {
      "api": {
        "status": "up"
      },
      "database": {
        "engine": "MySQL (8.0.19+ InnoDB)",
        "status": "disconnected",
        "details": "Database connection failed: connect ECONNREFUSED 127.0.0.1:3306"
      }
    }
  }
  ```

---

### 2. Blood Inventory Search
Searches available blood units across blood banks, filtered by blood group and city. Performs an inner join across `inventory`, `blood_banks`, and `blood_groups`.

* **Endpoint:** `GET /api/inventory`
* **Query Parameters:**
  - `blood_group` *(optional)*: Blood group code (e.g. `O+`, `A-`, `B+`).
  - `city` *(optional)*: City name (e.g. `Pune`, `Mumbai`).
  - `min_units` *(optional, default: 1)*: Minimum available units.
* **cURL Example:**
  ```bash
  curl -s "http://localhost:5000/api/inventory?blood_group=O%2B&city=Pune"
  ```
* **Response (HTTP 200):**
  ```json
  {
    "success": true,
    "count": 2,
    "filters": {
      "blood_group": "O+",
      "city": "Pune",
      "min_units": 1
    },
    "data": [
      {
        "blood_bank_id": 1,
        "blood_bank_name": "Demo Central Blood Bank",
        "address": "10 Sample Road",
        "city": "Pune",
        "phone": "+91-20-5550-0101",
        "latitude": 18.5204,
        "longitude": 73.8567,
        "blood_group_id": 7,
        "blood_group": "O+",
        "units_available": 12,
        "updated_at": "2026-10-24T12:00:00.000Z"
      },
      {
        "blood_bank_id": 2,
        "blood_bank_name": "Demo Riverside Blood Bank",
        "address": "22 Example Avenue",
        "city": "Pune",
        "phone": "+91-20-5550-0102",
        "latitude": 18.5362,
        "longitude": 73.8939,
        "blood_group_id": 7,
        "blood_group": "O+",
        "units_available": 6,
        "updated_at": "2026-10-24T12:00:00.000Z"
      }
    ]
  }
  ```

---

### 3. Inventory Aggregated Summary
Aggregates total available units per blood group and city. Matches the SQL aggregation report from `database/queries.sql`.

* **Endpoint:** `GET /api/inventory/summary`
* **Query Parameters:** `city` *(optional)*
* **cURL Example:**
  ```bash
  curl -s "http://localhost:5000/api/inventory/summary"
  ```
* **Response (HTTP 200):**
  ```json
  {
    "success": true,
    "count": 6,
    "data": [
      {
        "city": "Mumbai",
        "blood_group": "B+",
        "total_units": "7",
        "bank_count": 1
      },
      {
        "city": "Pune",
        "blood_group": "A+",
        "total_units": "11",
        "bank_count": 2
      },
      {
        "city": "Pune",
        "blood_group": "O+",
        "total_units": "18",
        "bank_count": 2
      }
    ]
  }
  ```

---

### 4. Hospital Blood Requests

#### A. List Requests
Retrieves hospital requests sorted by urgency (`critical` > `high` > `normal` > `low`) and requested timestamp.

* **Endpoint:** `GET /api/requests`
* **Query Parameters:**
  - `status` *(optional, default: `pending`)*: `pending`, `matched`, `fulfilled`, `cancelled`, or `all`.
  - `urgency` *(optional)*: `critical`, `high`, `normal`, `low`.
  - `hospital_id` *(optional)*: filter by specific hospital ID.
* **cURL Example:**
  ```bash
  curl -s "http://localhost:5000/api/requests?status=pending"
  ```
* **Response (HTTP 200):**
  ```json
  {
    "success": true,
    "count": 2,
    "data": [
      {
        "request_id": 1,
        "hospital_id": 1,
        "hospital_name": "Demo City Hospital",
        "hospital_city": "Pune",
        "hospital_phone": "+91-20-5550-0201",
        "blood_group_id": 7,
        "blood_group": "O+",
        "units_requested": 4,
        "urgency": "critical",
        "status": "pending",
        "fulfilled_by_blood_bank_id": null,
        "fulfilled_by_blood_bank_name": null,
        "requested_at": "2026-10-20T08:15:00.000Z",
        "fulfilled_at": null,
        "notes": "Fictional classroom example"
      }
    ]
  }
  ```

#### B. Create Request (Hospital raises request)
Allows a hospital to raise a new blood request with input validation.

* **Endpoint:** `POST /api/requests`
* **Headers:** `Content-Type: application/json`
* **Request Body Schema:**
  ```json
  {
    "hospital_id": 1,
    "blood_group": "O+",
    "units_requested": 3,
    "urgency": "high",
    "notes": "Urgent surgery scheduled"
  }
  ```
  *(Note: You can pass either `blood_group: "O+"` or `blood_group_id: 7`)*
* **cURL Example:**
  ```bash
  curl -X POST http://localhost:5000/api/requests \
    -H "Content-Type: application/json" \
    -d "{\"hospital_id\":1,\"blood_group\":\"O+\",\"units_requested\":3,\"urgency\":\"high\",\"notes\":\"Emergency trauma surgery\"}"
  ```
* **Response (HTTP 201 Created):**
  ```json
  {
    "success": true,
    "message": "Blood request created successfully",
    "data": {
      "request_id": 5,
      "hospital_id": 1,
      "hospital_name": "Demo City Hospital",
      "hospital_city": "Pune",
      "blood_group_id": 7,
      "units_requested": 3,
      "urgency": "high",
      "status": "pending",
      "notes": "Emergency trauma surgery",
      "requested_at": "2026-10-24T18:00:00.000Z"
    }
  }
  ```

---

### 5. Metadata & Supporting Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/blood-groups` | List all 8 standard blood groups with IDs |
| `GET` | `/api/blood-banks?city=Pune` | List registered blood banks |
| `GET` | `/api/hospitals?city=Pune` | List registered hospitals |
| `GET` | `/api/donors?blood_group=O+&city=Pune` | List available donors filtered by blood group and city |

---

### 6. Atomic Donation Transaction
Executes an explicit SQL transaction to insert a donation record, update the donor's `last_donation_date`, and increment `inventory.units_available` using MySQL row-upsert syntax (`ON DUPLICATE KEY UPDATE`).

* **Endpoint:** `POST /api/donations`
* **Request Body:**
  ```json
  {
    "donor_id": 1,
    "blood_bank_id": 1,
    "blood_group_id": 7,
    "units_collected": 1,
    "notes": "Routine voluntary blood donation"
  }
  ```
* **Response (HTTP 201):**
  ```json
  {
    "success": true,
    "message": "Donation recorded and inventory incremented atomically",
    "data": {
      "donation_id": 3,
      "donor_id": 1,
      "blood_bank_id": 1,
      "blood_group_id": 7,
      "units_collected": 1
    }
  }
  ```

---

## 🛡️ SQL Safety & Parameterization

Every query in this application uses parameterized queries through the `mysql2/promise` driver:
```javascript
// Example from inventoryController.js:
const [rows] = await db.query(
  'SELECT * FROM inventory i JOIN blood_groups bg ON bg.blood_group_id = i.blood_group_id WHERE bg.group_code = ?',
  [bloodGroupCode]
);
```
No raw user input is ever concatenated or formatted directly into SQL query strings.

---

## ⚠️ Error Handling & Response Format

All error responses adhere to a standardized JSON error format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": [
      "hospital_id is required and must be a positive integer",
      "units_requested is required and must be an integer greater than 0"
    ]
  }
}
```

Common Error Codes:
- `400 BAD REQUEST`: `VALIDATION_ERROR`, `INVALID_STATUS`, `INVALID_URGENCY`, `INVALID_ID`
- `404 NOT FOUND`: `HOSPITAL_NOT_FOUND`, `NOT_FOUND`
- `500 INTERNAL SERVER ERROR`: `INTERNAL_SERVER_ERROR`
- `503 SERVICE UNAVAILABLE`: Database connection failure on `/api/health`

---

## 📊 Implementation Status

| Feature | Status | Notes |
|---|---|---|
| Express Server Foundation | ✅ Implemented | Port 5000, CORS, JSON body parser |
| SQL Connection Pool | ✅ Implemented | `mysql2/promise` with configurable pool |
| Health Check (`/api/health`) | ✅ Implemented | Reports API & DB readiness |
| Inventory Search (`/api/inventory`) | ✅ Implemented | Parameterized joins with group/city filters |
| Inventory Summary (`/api/inventory/summary`) | ✅ Implemented | Aggregation query grouping by city/blood group |
| Blood Requests (`/api/requests`) | ✅ Implemented | GET & POST with validation |
| Metadata Routes (`blood-groups`, `banks`, `donors`) | ✅ Implemented | Feeds frontend dropdowns |
| Atomic Donation Transaction (`/api/donations`) | ✅ Implemented | ACID transaction handling |
| Authentication (JWT + bcrypt) | ⏳ Pending | Awaits user/role schema table decision |
| MongoDB Logging | ⏳ Future Scope | Assigned to Issue #4 integration |
