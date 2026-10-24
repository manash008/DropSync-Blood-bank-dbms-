-- DropSync SQL examples. Run after schema.sql and seed.sql.

-- Inventory availability by blood group/city (joins and filtering).
SELECT bb.name AS blood_bank, bb.city, bg.group_code AS blood_group, i.units_available
FROM inventory i
JOIN blood_banks bb ON bb.blood_bank_id=i.blood_bank_id
JOIN blood_groups bg ON bg.blood_group_id=i.blood_group_id
WHERE bg.group_code='O+' AND bb.city='Pune' AND i.units_available>0
ORDER BY i.units_available DESC, bb.name;

-- Total available units per blood group and city.
SELECT bb.city, bg.group_code, SUM(i.units_available) AS total_units
FROM inventory i
JOIN blood_banks bb ON bb.blood_bank_id=i.blood_bank_id
JOIN blood_groups bg ON bg.blood_group_id=i.blood_group_id
GROUP BY bb.city, bg.blood_group_id, bg.group_code
ORDER BY bb.city, bg.blood_group_id;

-- Pending requests with hospital details and urgency order.
SELECT r.request_id, h.name AS hospital, h.city, bg.group_code AS blood_group,
       r.units_requested, r.urgency, r.requested_at
FROM requests r
JOIN hospitals h ON h.hospital_id=r.hospital_id
JOIN blood_groups bg ON bg.blood_group_id=r.blood_group_id
WHERE r.status='pending'
ORDER BY FIELD(r.urgency,'critical','high','normal','low'), r.requested_at;

-- Donation history across donors, banks, and blood groups.
SELECT d.donation_id, donor.full_name AS donor, bb.name AS blood_bank,
       bg.group_code AS blood_group, d.units_collected, d.donated_at
FROM donations d
JOIN donors donor ON donor.donor_id=d.donor_id
JOIN blood_banks bb ON bb.blood_bank_id=d.blood_bank_id
JOIN blood_groups bg ON bg.blood_group_id=d.blood_group_id
ORDER BY d.donated_at DESC;

-- Atomic donation + stock increment. Inputs should be validated by the API.
START TRANSACTION;
INSERT INTO donations (donor_id,blood_bank_id,blood_group_id,units_collected,notes)
VALUES (1,1,7,1,'Fictional transaction example');
INSERT INTO inventory (blood_bank_id,blood_group_id,units_available)
VALUES (1,7,1) AS incoming
ON DUPLICATE KEY UPDATE units_available=inventory.units_available+incoming.units_available;
COMMIT;
-- If either write fails, ROLLBACK instead of COMMIT.

-- Donors by blood group and city.
SELECT donor.full_name, donor.city, donor.phone, donor.last_donation_date
FROM donors donor JOIN blood_groups bg ON bg.blood_group_id=donor.blood_group_id
WHERE bg.group_code='O+' AND donor.city='Pune'
ORDER BY donor.last_donation_date IS NULL DESC, donor.last_donation_date;

-- Estimated optimizer plan for an indexed inventory lookup.
EXPLAIN
SELECT bb.name, i.units_available
FROM inventory i
JOIN blood_banks bb ON bb.blood_bank_id=i.blood_bank_id
JOIN blood_groups bg ON bg.blood_group_id=i.blood_group_id
WHERE bg.group_code='O+' AND bb.city='Pune' AND i.units_available>0;

-- MySQL 8.0.18+: EXPLAIN ANALYZE <the SELECT above>;
