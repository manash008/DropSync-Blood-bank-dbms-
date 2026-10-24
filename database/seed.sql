-- Fictional classroom data only. Load after schema.sql.
INSERT INTO blood_groups (blood_group_id, group_code) VALUES
(1,'A+'),(2,'A-'),(3,'B+'),(4,'B-'),(5,'AB+'),(6,'AB-'),(7,'O+'),(8,'O-');

INSERT INTO blood_banks (blood_bank_id,name,address,city,phone,latitude,longitude) VALUES
(1,'Demo Central Blood Bank','10 Sample Road','Pune','+91-20-5550-0101',18.520400,73.856700),
(2,'Demo Riverside Blood Bank','22 Example Avenue','Pune','+91-20-5550-0102',18.536200,73.893900),
(3,'Demo North Blood Bank','5 Fictional Street','Mumbai','+91-22-5550-0103',19.076000,72.877700);

INSERT INTO hospitals (hospital_id,name,address,city,phone,latitude,longitude) VALUES
(1,'Demo City Hospital','100 Practice Lane','Pune','+91-20-5550-0201',18.515000,73.845000),
(2,'Demo General Hospital','8 Training Road','Mumbai','+91-22-5550-0202',19.082000,72.870000);

INSERT INTO donors (donor_id,full_name,email,phone,blood_group_id,city,latitude,longitude,last_donation_date) VALUES
(1,'Demo Donor A','donor-a@example.test','+91-90000-00001',7,'Pune',18.519000,73.850000,'2025-12-10'),
(2,'Demo Donor B','donor-b@example.test','+91-90000-00002',1,'Pune',18.531000,73.866000,NULL),
(3,'Demo Donor C','donor-c@example.test','+91-90000-00003',3,'Mumbai',19.070000,72.880000,'2026-01-05'),
(4,'Demo Donor D','donor-d@example.test','+91-90000-00004',8,'Pune',NULL,NULL,NULL);

INSERT INTO inventory (blood_bank_id,blood_group_id,units_available) VALUES
(1,1,8),(1,3,5),(1,7,12),(1,8,2),(2,1,3),(2,5,4),(2,7,6),(3,3,7),(3,7,9),(3,8,3);

INSERT INTO requests (request_id,hospital_id,blood_group_id,units_requested,urgency,status,requested_at,notes) VALUES
(1,1,7,4,'critical','pending','2026-10-20 08:15:00','Fictional classroom example'),
(2,1,1,2,'normal','pending','2026-10-20 10:30:00',NULL),
(3,2,3,3,'high','matched','2026-10-19 14:00:00',NULL),
(4,2,8,1,'low','fulfilled','2026-10-18 09:00:00',NULL);

UPDATE requests SET fulfilled_by_blood_bank_id=3, fulfilled_at='2026-10-18 11:20:00' WHERE request_id=4;

INSERT INTO donations (donation_id,donor_id,blood_bank_id,blood_group_id,units_collected,donated_at,notes) VALUES
(1,1,1,7,1,'2025-12-10 09:00:00','Fictional demo record'),
(2,3,3,3,1,'2026-01-05 11:30:00','Fictional demo record');
