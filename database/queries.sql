-- DropSync SQL examples. Run after schema.sql and seed.sql in MySQL 8.0.19+.
-- Fictional sample data only; these session variables demonstrate API-style filters.
SET @blood_group_code = 'O+';
SET @city_name = 'Pune';

-- Availability search joins inventory, blood banks, and the normalized blood-group lookup.
-- It returns only positive stock and includes the contact/location fields used by the API.
SELECT bb.blood_bank_id, bb.name AS blood_bank, bb.address, bb.city, bb.phone,
       bb.latitude, bb.longitude, bg.group_code AS blood_group, i.units_available
FROM inventory AS i
JOIN blood_banks AS bb ON bb.blood_bank_id = i.blood_bank_id
JOIN blood_groups AS bg ON bg.blood_group_id = i.blood_group_id
WHERE bg.group_code = @blood_group_code
  AND bb.city = @city_name
  AND i.units_available > 0
ORDER BY i.units_available DESC, bb.name;

-- Availability totals group the joined inventory by city and blood group.
-- This report helps compare local stock across groups without counting empty inventory.
SELECT bb.city, bg.group_code AS blood_group, SUM(i.units_available) AS total_units
FROM inventory AS i
JOIN blood_banks AS bb ON bb.blood_bank_id = i.blood_bank_id
JOIN blood_groups AS bg ON bg.blood_group_id = i.blood_group_id
GROUP BY bb.city, bg.blood_group_id, bg.group_code
ORDER BY bb.city, bg.blood_group_id;

-- Pending demand is joined with hospital and blood-group details, then urgency-ranked.
-- Critical requests appear first, with older requests before newer ones within each level.
SELECT r.request_id, h.name AS hospital, h.city, bg.group_code AS blood_group,
       r.units_requested, r.urgency, r.requested_at
FROM requests AS r
JOIN hospitals AS h ON h.hospital_id = r.hospital_id
JOIN blood_groups AS bg ON bg.blood_group_id = r.blood_group_id
WHERE r.status = 'pending'
ORDER BY FIELD(r.urgency, 'critical', 'high', 'normal', 'low'), r.requested_at;

-- Donation history joins the donor, blood bank, and group for readable records.
-- The result shows who donated, where, which group, the recorded units, and the timestamp.
SELECT d.donation_id, donor.full_name AS donor, bb.name AS blood_bank,
       bg.group_code AS blood_group, d.units_collected, d.donated_at
FROM donations AS d
JOIN donors AS donor ON donor.donor_id = d.donor_id
JOIN blood_banks AS bb ON bb.blood_bank_id = d.blood_bank_id
JOIN blood_groups AS bg ON bg.blood_group_id = d.blood_group_id
ORDER BY d.donated_at DESC;

-- A donation and its stock increment belong in one transaction.
-- If either statement fails, issue ROLLBACK so history and inventory remain consistent.
START TRANSACTION;
INSERT INTO donations (donor_id, blood_bank_id, blood_group_id, units_collected, notes)
VALUES (1, 1, 7, 1, 'Fictional transaction example');
INSERT INTO inventory (blood_bank_id, blood_group_id, units_available)
VALUES (1, 7, 1) AS incoming
ON DUPLICATE KEY UPDATE
  units_available = inventory.units_available + incoming.units_available;
COMMIT;
-- The transaction adds one demo donation and one unit each time. Use ROLLBACK to inspect safely.

-- Donors by blood group and city, useful to demonstrate donor-history joins.
-- NULL last-donation dates sort before recorded dates so never-donated donors appear first.
SELECT donor.full_name, donor.city, donor.phone, donor.last_donation_date
FROM donors AS donor
JOIN blood_groups AS bg ON bg.blood_group_id = donor.blood_group_id
WHERE bg.group_code = @blood_group_code
  AND donor.city = @city_name
ORDER BY donor.last_donation_date IS NULL DESC, donor.last_donation_date;

-- Query-plan example for the same indexed inventory lookup pattern used above.
-- Review chosen keys and estimated rows; a tiny demo dataset may reasonably use table scans.
EXPLAIN
SELECT bb.name, i.units_available
FROM inventory AS i
JOIN blood_banks AS bb ON bb.blood_bank_id = i.blood_bank_id
JOIN blood_groups AS bg ON bg.blood_group_id = i.blood_group_id
WHERE bg.group_code = @blood_group_code
  AND bb.city = @city_name
  AND i.units_available > 0;

-- MySQL 8.0.18+: replace EXPLAIN above with EXPLAIN ANALYZE to collect actual execution timing.
