# DropSync SQL database

Target engine: MySQL 8.0.19+ (InnoDB). This version supports enforced CHECK constraints and the row-alias syntax used by the inventory upsert example.

## Files
- schema.sql creates blood_groups, donors, blood_banks, hospitals, inventory, requests, and donations, including foreign keys, checks, and indexes.
- seed.sql provides fictional local demo records.
- queries.sql demonstrates joins, availability searches, aggregations, pending requests, donor/donation history, a transactional stock update, and EXPLAIN.

## Create and load
From the MySQL client, run from the repository root:

    CREATE DATABASE bloodbank_sql CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
    USE bloodbank_sql;
    SOURCE database/schema.sql;
    SOURCE database/seed.sql;

Then run individual reports from database/queries.sql. The transaction example adds a demo donation and stock unit each time it is executed. Use ROLLBACK instead of COMMIT when you want to inspect without saving the change.

Blood group IDs in the sample data are 1=A+, 2=A-, 3=B+, 4=B-, 5=AB+, 6=AB-, 7=O+, 8=O-. All names, addresses, contact details, and records are fictional; email addresses use the reserved .test domain.

## Relationships and indexes
blood_groups is the normalized lookup referenced by donors, inventory, requests, and donations. Inventory has one row per blood bank and blood group. Requests belong to hospitals and can optionally record the fulfilling bank. Donations connect a donor, bank, and blood group. Foreign keys use RESTRICT on deletion to protect referenced history.

Indexes cover donor blood group/city searches, bank and hospital city filters, inventory bank/group uniqueness and group/stock filtering, request status/urgency/date reports, and donor/bank/group donation histories. Primary and unique keys also provide indexes, so redundant foreign-key indexes are avoided.

## Inspect query plans
Run the EXPLAIN example in queries.sql to see estimated access paths, chosen keys, and estimated rows. MySQL 8.0.18+ also supports EXPLAIN ANALYZE for actual execution details. Small demo tables can lead MySQL to choose a table scan; plans may change with table size and statistics. Compare plans before and after index changes using identical predicates and data.
