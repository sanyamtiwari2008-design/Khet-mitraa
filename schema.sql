-- ============================================================================
-- KHET MITRA — NORMALIZED RELATIONAL MYSQL DATABASE SCHEMA (schema.sql)
-- Database Name: khet_mitra
-- All 17 Relational Tables with Primary Keys, Foreign Keys, Indexes & Constraints
-- ============================================================================

CREATE DATABASE IF NOT EXISTS khet_mitra
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE khet_mitra;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS saved_equipment;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS equipment_inspections;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS driver_assignments;
DROP TABLE IF EXISTS booking_status_history;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS equipment_images;
DROP TABLE IF EXISTS equipment;
DROP TABLE IF EXISTS driver_equipment;
DROP TABLE IF EXISTS driver_profiles;
DROP TABLE IF EXISTS owner_profiles;
DROP TABLE IF EXISTS farmer_profiles;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 1. USERS TABLE
-- Never stores plaintext passwords (only PBKDF2-SHA256 / Werkzeug password_hash)
-- ============================================================================
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  mobile VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(150) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('farmer', 'owner', 'driver', 'admin') NOT NULL,
  profile_photo VARCHAR(500) DEFAULT NULL,
  verification_status ENUM(
    'Incomplete',
    'Pending Verification',
    'Verified',
    'Rejected',
    'Correction Required'
  ) NOT NULL DEFAULT 'Verified',
  account_status ENUM('Active', 'Deactivated', 'Suspended') NOT NULL DEFAULT 'Active',
  is_demo TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_account_status (account_status),
  INDEX idx_users_verification (verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. FARMER PROFILES TABLE
-- Farmers can select locations anywhere in India.
-- Strictly NO Aadhaar number or Aadhaar document upload required.
-- ============================================================================
CREATE TABLE farmer_profiles (
  farmer_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  state VARCHAR(80) NOT NULL DEFAULT 'Rajasthan',
  district VARCHAR(80) NOT NULL DEFAULT 'Kota',
  city VARCHAR(80) NOT NULL DEFAULT 'Kota',
  village VARCHAR(120) DEFAULT NULL,
  address VARCHAR(255) NOT NULL,
  pincode VARCHAR(12) NOT NULL DEFAULT '324001',
  latitude DECIMAL(10, 7) NOT NULL DEFAULT 25.2138000,
  longitude DECIMAL(10, 7) NOT NULL DEFAULT 75.8648000,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_farmer_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_farmer_state_district (state, district),
  INDEX idx_farmer_city (city),
  INDEX idx_farmer_coords (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. OWNER PROFILES TABLE
-- Owners can register from anywhere in India and manage agricultural equipment.
-- ============================================================================
CREATE TABLE owner_profiles (
  owner_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  business_name VARCHAR(160) DEFAULT 'Custom Hiring Center',
  experience_years INT NOT NULL DEFAULT 5,
  state VARCHAR(80) NOT NULL DEFAULT 'Rajasthan',
  district VARCHAR(80) NOT NULL DEFAULT 'Baran',
  city VARCHAR(80) NOT NULL DEFAULT 'Baran',
  village VARCHAR(120) DEFAULT NULL,
  address VARCHAR(255) NOT NULL,
  pincode VARCHAR(12) NOT NULL DEFAULT '325205',
  latitude DECIMAL(10, 7) NOT NULL DEFAULT 25.1011000,
  longitude DECIMAL(10, 7) NOT NULL DEFAULT 76.5132000,
  accepts_upi TINYINT(1) NOT NULL DEFAULT 1,
  accepts_bank_transfer TINYINT(1) NOT NULL DEFAULT 1,
  accepts_cash TINYINT(1) NOT NULL DEFAULT 1,
  upi_id VARCHAR(100) DEFAULT NULL,
  bank_account_note VARCHAR(255) DEFAULT 'Direct Bank Transfer Enabled',
  verification_status ENUM('Pending Verification', 'Verified', 'Rejected') NOT NULL DEFAULT 'Verified',
  verification_notes TEXT DEFAULT NULL,
  verified_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_owner_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_owner_state_district (state, district),
  INDEX idx_owner_verification (verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. DRIVER PROFILES TABLE
-- IMPORTANT: A driver MUST NOT get access to the Driver Dashboard or job
-- functionality until verification_status = 'Verified'.
-- ============================================================================
CREATE TABLE driver_profiles (
  driver_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  driving_license_number VARCHAR(60) NOT NULL,
  driving_license_photo VARCHAR(500) NOT NULL,
  years_of_experience INT NOT NULL DEFAULT 2,
  daily_wage_rate DECIMAL(10, 2) NOT NULL DEFAULT 800.00,
  state VARCHAR(80) NOT NULL DEFAULT 'Rajasthan',
  district VARCHAR(80) NOT NULL DEFAULT 'Baran',
  city VARCHAR(80) NOT NULL DEFAULT 'Baran',
  village VARCHAR(120) DEFAULT NULL,
  address VARCHAR(255) NOT NULL,
  pincode VARCHAR(12) NOT NULL DEFAULT '325205',
  latitude DECIMAL(10, 7) NOT NULL DEFAULT 25.1050000,
  longitude DECIMAL(10, 7) NOT NULL DEFAULT 76.5100000,
  availability_status ENUM('Available', 'Busy', 'Offline') NOT NULL DEFAULT 'Available',
  verification_status ENUM(
    'Incomplete',
    'Pending Verification',
    'Verified',
    'Rejected',
    'Correction Required'
  ) NOT NULL DEFAULT 'Pending Verification',
  verification_notes TEXT DEFAULT NULL,
  verified_at DATETIME DEFAULT NULL,
  average_rating DECIMAL(3, 2) NOT NULL DEFAULT 4.80,
  total_earnings DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_driver_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_driver_verification (verification_status),
  INDEX idx_driver_availability (availability_status),
  INDEX idx_driver_state_district (state, district)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. DRIVER EQUIPMENT EXPERTISE TABLE
-- Categories: Tractor, Harvester, JCB, Rotavator, Seeder, Thresher, Cultivator, Sprayer
-- ============================================================================
CREATE TABLE driver_equipment (
  driver_equipment_id INT AUTO_INCREMENT PRIMARY KEY,
  driver_id INT NOT NULL,
  equipment_category ENUM(
    'Tractor',
    'Harvester',
    'JCB',
    'Rotavator',
    'Seeder',
    'Thresher',
    'Cultivator',
    'Sprayer',
    'Other'
  ) NOT NULL,
  experience_years INT NOT NULL DEFAULT 1,
  skill_level ENUM('Beginner', 'Intermediate', 'Expert') NOT NULL DEFAULT 'Expert',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_driver_equip_driver
    FOREIGN KEY (driver_id) REFERENCES driver_profiles(driver_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_driver_equip_category (equipment_category),
  INDEX idx_driver_equip_driver (driver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. EQUIPMENT TABLE
-- Availability: Available, Unavailable, Maintenance
-- ============================================================================
CREATE TABLE equipment (
  equipment_id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  equipment_name VARCHAR(180) NOT NULL,
  category ENUM(
    'Tractor',
    'Harvester',
    'JCB',
    'Rotavator',
    'Seeder',
    'Thresher',
    'Cultivator',
    'Sprayer'
  ) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(140) NOT NULL,
  manufacturing_year INT NOT NULL,
  used_condition_note VARCHAR(255) DEFAULT NULL,
  description TEXT NOT NULL,
  hourly_price DECIMAL(10, 2) NOT NULL,
  daily_price DECIMAL(10, 2) NOT NULL,
  operator_charge_per_day DECIMAL(10, 2) NOT NULL DEFAULT 600.00,
  location_state VARCHAR(80) NOT NULL DEFAULT 'Rajasthan',
  location_district VARCHAR(80) NOT NULL,
  location_city VARCHAR(80) NOT NULL,
  location_village VARCHAR(120) DEFAULT NULL,
  address VARCHAR(255) NOT NULL,
  pincode VARCHAR(12) NOT NULL DEFAULT '325205',
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  operator_available TINYINT(1) NOT NULL DEFAULT 1,
  availability_status ENUM('Available', 'Unavailable', 'Maintenance') NOT NULL DEFAULT 'Available',
  verification_status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Approved',
  average_rating DECIMAL(3, 2) NOT NULL DEFAULT 4.80,
  review_count INT NOT NULL DEFAULT 0,
  is_demo TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_equipment_owner
    FOREIGN KEY (owner_id) REFERENCES owner_profiles(owner_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_equipment_category (category),
  INDEX idx_equipment_availability (availability_status),
  INDEX idx_equipment_location (location_state, location_district, location_city),
  INDEX idx_equipment_price (daily_price),
  INDEX idx_equipment_coords (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. EQUIPMENT IMAGES TABLE
-- Supports multiple validated images per equipment item
-- ============================================================================
CREATE TABLE equipment_images (
  image_id INT AUTO_INCREMENT PRIMARY KEY,
  equipment_id INT NOT NULL,
  image_path VARCHAR(500) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_equip_images_equipment
    FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_equip_images_equip (equipment_id, is_primary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. BOOKINGS TABLE
-- 10% Advance at booking, 90% Remaining after return & owner inspection.
-- ============================================================================
CREATE TABLE bookings (
  booking_id INT AUTO_INCREMENT PRIMARY KEY,
  farmer_id INT NOT NULL,
  equipment_id INT NOT NULL,
  owner_id INT NOT NULL,
  driver_id INT DEFAULT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INT NOT NULL DEFAULT 1,
  operator_required TINYINT(1) NOT NULL DEFAULT 0,
  work_location VARCHAR(255) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  advance_amount DECIMAL(12, 2) NOT NULL,
  remaining_amount DECIMAL(12, 2) NOT NULL,
  booking_status ENUM(
    'Pending',
    'Accepted',
    'Rejected',
    'Driver Assigned',
    'Advance Paid',
    'Active',
    'Returned',
    'Inspection Pending',
    'Completed',
    'Cancelled'
  ) NOT NULL DEFAULT 'Pending',
  payment_status ENUM(
    'Pending',
    'Advance Paid',
    'Remaining Pending',
    'Fully Paid',
    'Refunded'
  ) NOT NULL DEFAULT 'Pending',
  farmer_notes TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_farmer
    FOREIGN KEY (farmer_id) REFERENCES farmer_profiles(farmer_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_booking_equipment
    FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_booking_owner
    FOREIGN KEY (owner_id) REFERENCES owner_profiles(owner_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_booking_driver
    FOREIGN KEY (driver_id) REFERENCES driver_profiles(driver_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_booking_equipment_dates (equipment_id, start_date, end_date),
  INDEX idx_booking_status (booking_status),
  INDEX idx_booking_farmer (farmer_id),
  INDEX idx_booking_owner (owner_id),
  INDEX idx_booking_driver (driver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 9. BOOKING STATUS HISTORY TABLE
-- Audit trail for every booking status transition
-- ============================================================================
CREATE TABLE booking_status_history (
  history_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  old_status VARCHAR(40) DEFAULT NULL,
  new_status VARCHAR(40) NOT NULL,
  changed_by INT NOT NULL,
  remarks VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_history_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_history_user
    FOREIGN KEY (changed_by) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_history_booking (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 10. DRIVER ASSIGNMENTS TABLE
-- Statuses: Requested, Accepted, Rejected, On the Way, Started, Completed
-- ============================================================================
CREATE TABLE driver_assignments (
  assignment_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  driver_id INT NOT NULL,
  assigned_by INT NOT NULL,
  job_amount DECIMAL(10, 2) NOT NULL DEFAULT 800.00,
  assignment_status ENUM(
    'Requested',
    'Accepted',
    'Rejected',
    'On the Way',
    'Started',
    'Completed'
  ) NOT NULL DEFAULT 'Requested',
  instructions TEXT DEFAULT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at DATETIME DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  CONSTRAINT fk_assign_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_assign_driver
    FOREIGN KEY (driver_id) REFERENCES driver_profiles(driver_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_assign_user
    FOREIGN KEY (assigned_by) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_assign_driver_status (driver_id, assignment_status),
  INDEX idx_assign_booking (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 11. PAYMENTS TABLE
-- Types: Advance, Remaining, Damage Charge, Refund
-- Methods: UPI, Cash, Bank Transfer
-- Clearly labeled DEMO PAYMENT when no real gateway is connected
-- ============================================================================
CREATE TABLE payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  payment_type ENUM('Advance', 'Remaining', 'Damage Charge', 'Refund') NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method ENUM('UPI', 'Cash', 'Bank Transfer') NOT NULL DEFAULT 'UPI',
  transaction_reference VARCHAR(120) NOT NULL,
  payment_status ENUM('Pending', 'Completed', 'Failed', 'Refunded') NOT NULL DEFAULT 'Completed',
  is_demo_payment TINYINT(1) NOT NULL DEFAULT 1,
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payment_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_payment_booking (booking_id),
  INDEX idx_payment_type (payment_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 12. EQUIPMENT INSPECTIONS TABLE
-- Condition: Good, Minor Damage, Major Damage
-- ============================================================================
CREATE TABLE equipment_inspections (
  inspection_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL UNIQUE,
  owner_id INT NOT NULL,
  condition_status ENUM('Good', 'Minor Damage', 'Major Damage') NOT NULL DEFAULT 'Good',
  damage_found TINYINT(1) NOT NULL DEFAULT 0,
  damage_description TEXT DEFAULT NULL,
  additional_charge DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  inspection_notes TEXT DEFAULT NULL,
  inspection_photo VARCHAR(500) DEFAULT NULL,
  inspected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inspection_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_inspection_owner
    FOREIGN KEY (owner_id) REFERENCES owner_profiles(owner_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 13. REVIEWS AND RATINGS TABLE
-- Allowed only after booking is Completed. UNIQUE(booking_id) prevents duplicates.
-- ============================================================================
CREATE TABLE reviews (
  review_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL UNIQUE,
  farmer_id INT NOT NULL,
  equipment_id INT NOT NULL,
  driver_id INT DEFAULT NULL,
  equipment_rating TINYINT NOT NULL CHECK (equipment_rating BETWEEN 1 AND 5),
  driver_rating TINYINT DEFAULT NULL CHECK (driver_rating IS NULL OR (driver_rating BETWEEN 1 AND 5)),
  review_reason VARCHAR(120) NOT NULL DEFAULT 'Equipment Performance',
  comment TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_review_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_review_farmer
    FOREIGN KEY (farmer_id) REFERENCES farmer_profiles(farmer_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_review_equipment
    FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_review_driver
    FOREIGN KEY (driver_id) REFERENCES driver_profiles(driver_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_review_equipment (equipment_id),
  INDEX idx_review_driver (driver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 14. SAVED EQUIPMENT TABLE
-- Farmer favorites / bookmarks
-- ============================================================================
CREATE TABLE saved_equipment (
  saved_id INT AUTO_INCREMENT PRIMARY KEY,
  farmer_id INT NOT NULL,
  equipment_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_farmer_equipment (farmer_id, equipment_id),
  CONSTRAINT fk_saved_farmer
    FOREIGN KEY (farmer_id) REFERENCES farmer_profiles(farmer_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_saved_equipment
    FOREIGN KEY (equipment_id) REFERENCES equipment(equipment_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 15. MESSAGES / CHAT TABLE
-- Supports Farmer <-> Owner, Farmer <-> Driver, Owner <-> Driver
-- ============================================================================
CREATE TABLE messages (
  message_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT DEFAULT NULL,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  message TEXT NOT NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_status TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_msg_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_msg_sender
    FOREIGN KEY (sender_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_msg_receiver
    FOREIGN KEY (receiver_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_msg_booking (booking_id),
  INDEX idx_msg_participants (sender_id, receiver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 16. NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(60) NOT NULL,
  related_booking_id INT DEFAULT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_notif_booking
    FOREIGN KEY (related_booking_id) REFERENCES bookings(booking_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_notif_user_read (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 17. SUPPORT TICKETS TABLE
-- Categories: Booking, Payment, Equipment, Driver, Owner, Account, Other
-- ============================================================================
CREATE TABLE support_tickets (
  ticket_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category ENUM('Booking', 'Payment', 'Equipment', 'Driver', 'Owner', 'Account', 'Other') NOT NULL DEFAULT 'Booking',
  subject VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('Open', 'In Progress', 'Resolved', 'Closed') NOT NULL DEFAULT 'Open',
  admin_response TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ticket_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_ticket_user (user_id),
  INDEX idx_ticket_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
