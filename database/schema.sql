-- DropSync relational schema: MySQL 8.0.19+ / InnoDB
-- CREATE DATABASE bloodbank_sql CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- USE bloodbank_sql;
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE blood_groups (
  blood_group_id TINYINT UNSIGNED PRIMARY KEY,
  group_code VARCHAR(3) NOT NULL UNIQUE,
  CONSTRAINT chk_blood_groups_code CHECK (group_code IN ('A+','A-','B+','B-','AB+','AB-','O+','O-'))
) ENGINE=InnoDB;

CREATE TABLE donors (
  donor_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NULL UNIQUE,
  phone VARCHAR(32) NULL,
  blood_group_id TINYINT UNSIGNED NOT NULL,
  city VARCHAR(100) NOT NULL,
  latitude DECIMAL(9,6) NULL,
  longitude DECIMAL(9,6) NULL,
  last_donation_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_donors_blood_city (blood_group_id, city),
  CONSTRAINT fk_donors_blood_group FOREIGN KEY (blood_group_id) REFERENCES blood_groups(blood_group_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_donors_lat CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_donors_lon CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB;

CREATE TABLE blood_banks (
  blood_bank_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  phone VARCHAR(32) NULL,
  latitude DECIMAL(9,6) NULL,
  longitude DECIMAL(9,6) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_blood_banks_city (city),
  CONSTRAINT chk_banks_lat CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_banks_lon CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB;

CREATE TABLE hospitals (
  hospital_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  phone VARCHAR(32) NULL,
  latitude DECIMAL(9,6) NULL,
  longitude DECIMAL(9,6) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_hospitals_city (city),
  CONSTRAINT chk_hospitals_lat CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CONSTRAINT chk_hospitals_lon CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB;

CREATE TABLE inventory (
  inventory_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  blood_bank_id BIGINT UNSIGNED NOT NULL,
  blood_group_id TINYINT UNSIGNED NOT NULL,
  units_available INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_inventory_bank_group (blood_bank_id, blood_group_id),
  KEY idx_inventory_group_units (blood_group_id, units_available),
  CONSTRAINT fk_inventory_bank FOREIGN KEY (blood_bank_id) REFERENCES blood_banks(blood_bank_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_inventory_group FOREIGN KEY (blood_group_id) REFERENCES blood_groups(blood_group_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE requests (
  request_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  hospital_id BIGINT UNSIGNED NOT NULL,
  blood_group_id TINYINT UNSIGNED NOT NULL,
  units_requested INT UNSIGNED NOT NULL,
  urgency ENUM('low','normal','high','critical') NOT NULL DEFAULT 'normal',
  status ENUM('pending','matched','fulfilled','cancelled') NOT NULL DEFAULT 'pending',
  fulfilled_by_blood_bank_id BIGINT UNSIGNED NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fulfilled_at TIMESTAMP NULL,
  notes VARCHAR(500) NULL,
  KEY idx_requests_status_urgency_date (status, urgency, requested_at),
  KEY idx_requests_hospital_date (hospital_id, requested_at),
  KEY idx_requests_group_status (blood_group_id, status),
  CONSTRAINT fk_requests_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_requests_group FOREIGN KEY (blood_group_id) REFERENCES blood_groups(blood_group_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_requests_bank FOREIGN KEY (fulfilled_by_blood_bank_id) REFERENCES blood_banks(blood_bank_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_requests_units CHECK (units_requested > 0),
  CONSTRAINT chk_requests_fulfilled CHECK (status <> 'fulfilled' OR fulfilled_at IS NOT NULL)
) ENGINE=InnoDB;

CREATE TABLE donations (
  donation_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  donor_id BIGINT UNSIGNED NOT NULL,
  blood_bank_id BIGINT UNSIGNED NOT NULL,
  blood_group_id TINYINT UNSIGNED NOT NULL,
  units_collected INT UNSIGNED NOT NULL DEFAULT 1,
  donated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes VARCHAR(500) NULL,
  KEY idx_donations_donor_date (donor_id, donated_at),
  KEY idx_donations_bank_date (blood_bank_id, donated_at),
  KEY idx_donations_group_date (blood_group_id, donated_at),
  CONSTRAINT fk_donations_donor FOREIGN KEY (donor_id) REFERENCES donors(donor_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_donations_bank FOREIGN KEY (blood_bank_id) REFERENCES blood_banks(blood_bank_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_donations_group FOREIGN KEY (blood_group_id) REFERENCES blood_groups(blood_group_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_donations_units CHECK (units_collected > 0)
) ENGINE=InnoDB;
