# DropSync database

## MySQL version and model

The SQL scripts target MySQL 8.0.19+ with InnoDB. MySQL 8.0.19 supports the row-alias syntax in the inventory upsert example; enforced CHECK constraints require MySQL 8.0.16+.

The normalized model contains `blood_groups`, `donors`, `blood_banks`, `hospitals`, `inventory`, `requests`, and `donations`. Primary and foreign keys protect relationships and donation/request history. Inventory has one row per blood bank and blood group.

All seed names, locations, contact details, and records are fictional. Email addresses use the reserved `.test` domain.

## Create a fresh demo database

Run these from the repository root in PowerShell with a local MySQL client. The first command creates a database; use a new empty database because the schema script does not drop or replace existing tables.

```powershell
mysql -h 127.0.0.1 -u root -p -e "CREATE DATABASE bloodbank_sql CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
Get-Content -Raw database/schema.sql | mysql -h 127.0.0.1 -u root -p bloodbank_sql
Get-Content -Raw database/seed.sql | mysql -h 127.0.0.1 -u root -p bloodbank_sql
```

Replace the host/user flags with your local account. MySQL prompts for the password; do not put it on the command line. Set matching values in the ignored `.env` file before starting the backend. Run the schema and seed once for each clean database.

For the MySQL interactive client, the equivalent sequence is:

```sql
CREATE DATABASE bloodbank_sql CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE bloodbank_sql;
SOURCE database/schema.sql;
SOURCE database/seed.sql;
```

The SQL scripts can be inspected without the application:

```powershell
Get-Content database/queries.sql
```

## Query guide

Run `queries.sql` after loading the schema and seed. It includes:

1. Blood-bank availability joined across inventory, bank, and blood-group rows, filtered by blood group and city.
2. A `SUM` of available units grouped by city and blood group.
3. Pending requests joined to hospital and blood-group data, ordered critical, high, normal, then low, and oldest first within urgency.
4. Donation history joined to donor, bank, and blood-group details.
5. A transaction that inserts a donation and atomically adds its units to inventory.
6. Donor search by blood group and city.
7. `EXPLAIN` for the inventory search access pattern.

Each query has a short comment describing what it returns and why it matters. The report examples use session variables `@blood_group_code` and `@city_name`; the API uses prepared `?` parameters for the selected blood group and optional exact city. Its `ALL` mode omits the blood-group predicate and returns one row per recorded bank/group inventory pair; optional coordinates distance-sort rows after retrieval.

The transaction example commits one fictional donation and one unit into stock each time it is run. Use `ROLLBACK` in place of `COMMIT` to inspect without saving. Do not repeatedly run it against a shared database unless adding those demo records is intended.

## Keys and indexes

- `blood_groups.group_code` is unique and referenced by donors, inventory, requests, and donations.
- `inventory` has a unique `(blood_bank_id, blood_group_id)` pair and an index on `(blood_group_id, units_available)`.
- Donor search uses `idx_donors_blood_city (blood_group_id, city)`.
- Bank and hospital city lookups use their city indexes.
- Pending-request reports use `idx_requests_status_urgency_date (status, urgency, requested_at)`.
- Donation histories use donor/date, bank/date, and group/date indexes.
- Foreign-key references are indexed by primary/unique keys or the relationship indexes above; redundant indexes are avoided.

City equality uses the database collation. The documented database creation command sets MySQL's case-insensitive `utf8mb4_0900_ai_ci` collation, so city input casing does not need to match the stored value exactly.

## Query-plan inspection

The last statement in `queries.sql` runs `EXPLAIN` on the search query. Inspect `key`, `type`, and `rows` to see the selected access paths and estimate. The demo has only a few inventory rows, so a table scan can be a sensible cost choice; use a larger representative dataset before drawing efficiency conclusions. MySQL 8.0.18+ also supports `EXPLAIN ANALYZE` for actual execution details. Compare plans with identical query predicates and data; do not infer a speed improvement from index presence alone.

## Optional MongoDB logs

When `MONGO_URI` points to a running MongoDB database, the backend writes successful searches to `activity_logs` with this shape:

```json
{
  "eventType": "blood_search",
  "bloodGroup": "O+",
  "city": "Pune",
  "resultCount": 2,
  "occurredAt": "2026-10-24T12:00:00.000Z"
}
```

The timestamp above is a field-format example, not an observed event. Search logs omit IP address, user identity, donor details, passwords, and tokens. If MongoDB is unset or unavailable, SQL search continues without logging.

After making searches, run the real aggregation pipeline from the repository root:

```powershell
mongosh "mongodb://127.0.0.1:27017/bloodbank_nosql" --quiet --file database/mongo-aggregation.js
```

The pipeline groups actual `blood_search` documents by blood group and city, counts searches, and sums returned bank-result counts. For example, a row with `searchCount: 3` and `matchingBanksReturned: 5` means those three matching searches returned five bank rows in total. No result is printed for combinations absent from the collection.

## API setup

The Express app reads `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` from `.env`. Run `npm ci`, copy `.env.example` to `.env`, configure the SQL values, then run `npm run dev`. See the root README for endpoint fields, response shape, and troubleshooting.

## Seed-derived output examples (not captured query runs)

These examples are derived from the fictional rows in `seed.sql`; they show expected rows but are not evidence that a MySQL server executed the queries. Run the statements in `queries.sql` to collect output and an actual `EXPLAIN` plan for your database.

For the availability search with `@blood_group_code = 'O+'` and `@city_name = 'Pune'`, the seed contains:

| Blood bank                | City | Group | Units |
| ------------------------- | ---- | ----- | ----: |
| Demo Central Blood Bank   | Pune | O+    |    12 |
| Demo Riverside Blood Bank | Pune | O+    |     6 |

For the available-unit aggregation, the seed-derived non-zero totals are:

| City   | Group | Units |
| ------ | ----- | ----: |
| Mumbai | B+    |     7 |
| Mumbai | O+    |     9 |
| Mumbai | O-    |     3 |
| Pune   | A+    |    11 |
| Pune   | B+    |     5 |
| Pune   | AB+   |     4 |
| Pune   | O+    |    18 |
| Pune   | O-    |     2 |

The pending-request join returns request 1 (critical, Demo City Hospital, O+, 4 units) before request 2 (normal, Demo City Hospital, A+, 2 units). The donation-history join returns the January 2026 Demo Donor C record before the December 2025 Demo Donor A record.

No `EXPLAIN` output or performance figures are included here because the available local MySQL service rejected the credentials in this environment. Capture the actual plan by running the final statement of `queries.sql` after loading the schema and seed; do not infer an index benefit from the seed-derived rows.

## Observed MongoDB integration output

The Mongo integration check inserted a temporary `O+` / `Testville` search event with two returned banks, ran `database/mongo-aggregation.js` against local MongoDB, and deleted the temporary event afterward. The captured aggregation result was:

```text
{
  _id: { bloodGroup: 'O+', city: 'Testville' },
  searchCount: 1,
  matchingBanksReturned: 2
}
```

This is an actual test run, not a production activity sample. It demonstrates that one matching event increments `searchCount` to one and contributes two to the summed result count.
