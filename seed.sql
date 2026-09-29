-- ============================================================================
-- KHET MITRA — SEED DATA FOR MYSQL DATABASE (seed.sql)
-- Fictional Demo Users, Owners, Drivers, Equipment, Images, Bookings,
-- Status History, Payments, Inspections, Reviews, Messages & Support Tickets
-- Locations: Kota, Baran, Anta, Atru, Sangod, Bundi, Jhalawar, Jaipur (Rajasthan)
-- No real personal data, Aadhaar numbers, private phones, or real licenses used.
-- ============================================================================

USE khet_mitra;

-- Password hash below corresponds to 'password123' using PBKDF2-SHA256
SET @DEMO_HASH = 'pbkdf2:sha256:6b210913d7f6e908c7a38d9a3e2030e27e49e1687314746a9f6579860292f890';

-- 1. USERS
INSERT INTO users (user_id, name, mobile, email, password_hash, role, profile_photo, verification_status, account_status, is_demo) VALUES
(1, 'Ramesh Kumar', '9812011223', 'ramesh@khetmitra.in', @DEMO_HASH, 'farmer', '/src/assets/images/demo_owner_agri_avatar_1790613107070.jpg', 'Verified', 'Active', 1),
(2, 'Bhanwar Lal Hadoti', '9812044556', 'suresh@khetmitra.in', @DEMO_HASH, 'owner', '/src/assets/images/demo_owner_agri_avatar_1790613107070.jpg', 'Verified', 'Active', 1),
(3, 'Madan Mohan Nagar', '0000000102', 'demo.anta@khetmitra.example', @DEMO_HASH, 'owner', '/src/assets/images/demo_owner_agri_avatar_1790613107070.jpg', 'Verified', 'Active', 1),
(4, 'Kesar Lal Meena', '9812099001', 'vikram@khetmitra.in', @DEMO_HASH, 'driver', '/src/assets/images/demo_owner_agri_avatar_1790613107070.jpg', 'Verified', 'Active', 1),
(5, 'Ratan Lal Gurjar', '0000000202', 'demo.driver.kota@khetmitra.example', @DEMO_HASH, 'driver', '/src/assets/images/demo_owner_agri_avatar_1790613107070.jpg', 'Verified', 'Active', 1),
(6, 'Khet Mitra Admin', '9000011111', 'admin@khetmitra.in', @DEMO_HASH, 'admin', '/src/assets/images/demo_owner_agri_avatar_1790613107070.jpg', 'Verified', 'Active', 1),
(7, 'Ramkaran Kalisindh', '0000000103', 'demo.atru@khetmitra.example', @DEMO_HASH, 'owner', '/src/assets/images/demo_owner_agri_avatar_1790613107070.jpg', 'Verified', 'Active', 1),
(8, 'Gopal Lal Chambal', '0000000104', 'demo.kota@khetmitra.example', @DEMO_HASH, 'owner', '/src/assets/images/demo_owner_agri_avatar_1790613107070.jpg', 'Verified', 'Active', 1),
(9, 'Devlal Hada', '0000000105', 'demo.sangod@khetmitra.example', @DEMO_HASH, 'owner', '/src/assets/images/demo_owner_agri_avatar_1790613107070.jpg', 'Verified', 'Active', 1),
(10, 'Kanhaiya Lal Dhakar', '0000000106', 'demo.jaipur@khetmitra.example', @DEMO_HASH, 'owner', '/src/assets/images/demo_owner_agri_avatar_1790613107070.jpg', 'Verified', 'Active', 1),
(11, 'Prabhu Lal Bundi', '0000000107', 'demo.bundi@khetmitra.example', @DEMO_HASH, 'owner', '/src/assets/images/demo_owner_agri_avatar_1790613107070.jpg', 'Verified', 'Active', 1),
(12, 'Heera Lal Patidar', '0000000108', 'demo.jhalawar@khetmitra.example', @DEMO_HASH, 'owner', '/src/assets/images/demo_owner_agri_avatar_1790613107070.jpg', 'Verified', 'Active', 1),
(13, 'Mahendra Singh Shekhawat', '0000000203', 'pending.driver@khetmitra.example', @DEMO_HASH, 'driver', '/src/assets/images/demo_owner_agri_avatar_1790613107070.jpg', 'Pending Verification', 'Active', 1);

-- 2. FARMER PROFILES (No Aadhaar required)
INSERT INTO farmer_profiles (farmer_id, user_id, state, district, city, village, address, pincode, latitude, longitude) VALUES
(1, 1, 'Rajasthan', 'Kota', 'Kota', 'Borkhera Rural', 'Farm Sector, Kota-Baran Road', '324001', 25.2138000, 75.8648000);

-- 3. OWNER PROFILES
INSERT INTO owner_profiles (owner_id, user_id, business_name, experience_years, state, district, city, village, address, pincode, latitude, longitude, accepts_upi, accepts_bank_transfer, accepts_cash, upi_id, verification_status, verification_notes, verified_at) VALUES
(1, 2, 'Baran Kisan Custom Hiring', 12, 'Rajasthan', 'Baran', 'Baran', 'Baran Rural', 'Krishi Yard, Baran Agricultural Zone', '325205', 25.1011000, 76.5132000, 1, 1, 1, 'baran@upi', 'Verified', 'Verified agricultural machinery provider', NOW()),
(2, 3, 'Anta Krishi Yantra Kendra', 9, 'Rajasthan', 'Baran', 'Anta', 'Anta', 'Farm Sector, Anta Tehsil', '325202', 25.1500000, 76.3000000, 1, 1, 1, 'anta@upi', 'Verified', 'Verified agricultural machinery provider', NOW()),
(3, 7, 'Atru Kalisindh Farm Machinery', 14, 'Rajasthan', 'Baran', 'Atru', 'Atru', 'Krishi Block, Atru Rural Zone', '325219', 24.8722000, 76.6472000, 1, 0, 1, 'atru@upi', 'Verified', 'Verified agricultural machinery provider', NOW()),
(4, 8, 'Kota Chambal Krishi Seva', 11, 'Rajasthan', 'Kota', 'Kota', 'Kaithoon Road', 'Farm Yard, Kota Rural Belt', '324001', 25.2138000, 75.8648000, 1, 1, 1, 'kota@upi', 'Verified', 'Verified agricultural machinery provider', NOW()),
(5, 9, 'Sangod Khet Mitra Implements', 8, 'Rajasthan', 'Kota', 'Sangod', 'Sangod', 'Agri Center, Sangod Tehsil', '325601', 24.9250000, 76.2833000, 1, 1, 1, 'sangod@upi', 'Verified', 'Verified agricultural machinery provider', NOW()),
(6, 10, 'Jaipur & Kaithoon Gramin Tractor Center', 10, 'Rajasthan', 'Jaipur', 'Jaipur', 'Chomu', 'Agri Machinery Park, Chomu Road, Jaipur', '303702', 26.9124000, 75.7873000, 1, 1, 1, 'jaipur@upi', 'Verified', 'Verified agricultural machinery provider', NOW()),
(7, 11, 'Bundi Hadoti Farm Equipment', 15, 'Rajasthan', 'Bundi', 'Bundi', 'Talera', 'Krishi Kendra, Bundi Agricultural Belt', '323001', 25.4305000, 75.6499000, 1, 1, 1, 'bundi@upi', 'Verified', 'Verified agricultural machinery provider', NOW()),
(8, 12, 'Jhalawar Malwa Agro Machinery', 13, 'Rajasthan', 'Jhalawar', 'Jhalawar', 'Jhalrapatan', 'Farm Machinery Yard, Jhalawar Rural', '326001', 24.5973000, 76.1610000, 1, 1, 1, 'jhalawar@upi', 'Verified', 'Verified agricultural machinery provider', NOW());

-- 4. DRIVER PROFILES (Includes Verified and Pending Verification drivers)
INSERT INTO driver_profiles (driver_id, user_id, driving_license_number, driving_license_photo, years_of_experience, daily_wage_rate, state, district, city, village, address, pincode, latitude, longitude, availability_status, verification_status, verification_notes, verified_at, average_rating, total_earnings) VALUES
(1, 4, 'DEMO-RJ28-2018001', '/src/assets/images/demo_owner_agri_avatar_1790613107070.jpg', 8, 700.00, 'Rajasthan', 'Baran', 'Baran', 'Anta Road', 'Operator Camp, Kota-Baran Highway', '325205', 25.1050000, 76.5100000, 'Available', 'Verified', 'Driving license verified by Admin', NOW(), 4.80, 14200.00),
(2, 5, 'DEMO-RJ20-2019002', '/src/assets/images/demo_owner_agri_avatar_1790613107070.jpg', 6, 650.00, 'Rajasthan', 'Kota', 'Kota', 'Sultanpur', 'Mandi Zone, Kota Rural', '324001', 25.2100000, 75.8600000, 'Available', 'Verified', 'Driving license verified by Admin', NOW(), 4.70, 9800.00),
(3, 13, 'DEMO-RJ14-2023009', '/src/assets/images/demo_owner_agri_avatar_1790613107070.jpg', 4, 700.00, 'Rajasthan', 'Jaipur', 'Jaipur', 'Chomu', 'Chomu Rural Block, Jaipur', '303702', 26.9124000, 75.7873000, 'Offline', 'Pending Verification', 'Awaiting Admin review of uploaded driving license document', NULL, 4.50, 0.00);

-- 5. DRIVER EQUIPMENT EXPERTISE
INSERT INTO driver_equipment (driver_id, equipment_category, experience_years, skill_level) VALUES
(1, 'Tractor', 8, 'Expert'),
(1, 'Harvester', 5, 'Expert'),
(1, 'Rotavator', 7, 'Expert'),
(1, 'Seeder', 6, 'Expert'),
(1, 'Cultivator', 8, 'Expert'),
(2, 'JCB', 5, 'Expert'),
(2, 'Tractor', 6, 'Expert'),
(2, 'Harvester', 4, 'Intermediate'),
(2, 'Thresher', 6, 'Expert'),
(2, 'Sprayer', 5, 'Expert'),
(3, 'Tractor', 4, 'Intermediate'),
(3, 'Rotavator', 3, 'Intermediate');

-- 6. EQUIPMENT TABLE (8 Categories across Kota, Baran, Anta, Atru, Sangod, Bundi, Jhalawar, Jaipur)
INSERT INTO equipment (equipment_id, owner_id, equipment_name, category, brand, model, manufacturing_year, used_condition_note, description, hourly_price, daily_price, operator_charge_per_day, location_state, location_district, location_city, location_village, address, pincode, latitude, longitude, operator_available, availability_status, verification_status, average_rating, review_count, is_demo) VALUES
(1, 1, 'Mahindra 275 DI TU (39 HP Older/Used Field Tractor)', 'Tractor', 'Mahindra', '275 DI TU Bhumiputra (2015 Used Model)', 2015, 'Older 2015 Used Model — Weathered paint and field-worn tires, mechanically overhauled engine & hydraulics', 'Field-tested 2015 model Mahindra 275 DI TU 39 HP tractor actively used in Baran district black-cotton soil for mustard, wheat, and soybean ploughing, cultivator pulling, and trolley transport.', 350.00, 2100.00, 600.00, 'Rajasthan', 'Baran', 'Baran', 'Baran Rural', 'Krishi Yard, Baran', '325205', 25.1011000, 76.5132000, 1, 'Available', 'Approved', 4.80, 14, 1),
(2, 2, 'Swaraj 744 FE (48 HP Used Agricultural Tractor & Rotavator)', 'Rotavator', 'Swaraj / Shaktiman', 'Swaraj 744 FE + 6ft Rotavator (2016 Used Model)', 2016, 'Older 2016 Used Model — Active field tractor with 6ft rotary tiller, reliable PTO gearbox', 'Used 2016 Swaraj 744 FE blue tractor paired with a 6-foot Shaktiman rotavator working in Anta agricultural fields. Suitable for mustard and wheat seedbed preparation after soybean harvest.', 400.00, 2400.00, 600.00, 'Rajasthan', 'Baran', 'Anta', 'Anta', 'Farm Sector, Anta', '325202', 25.1500000, 76.3000000, 1, 'Available', 'Approved', 4.70, 11, 1),
(3, 3, 'Vishwakarma High-Capacity Multi-Crop Thresher (Used Model)', 'Thresher', 'Vishwakarma Agro', 'Hadoti Special Multi-Crop Drum Thresher (2014 Used)', 2014, 'Older 2014 Used Machine — Repainted sheet metal, new fan belts and sieve screens', 'Older 2014 model PTO-operated multi-crop thresher in Atru (Baran district). Widely used by local farmers for threshing wheat, mustard (sarson), chana, and coriander (dhaniya) crops right in the field.', 320.00, 1800.00, 550.00, 'Rajasthan', 'Baran', 'Atru', 'Atru', 'Krishi Block, Atru', '325219', 24.8722000, 76.6472000, 1, 'Available', 'Approved', 4.60, 9, 1),
(4, 4, 'Kartar 4000 Multi-Crop Combine Harvester (2016 Used Model)', 'Harvester', 'Kartar Agro', 'Kartar 4000 14ft Cutter Bar (2016 Used Machine)', 2016, 'Older 2016 Used Harvester — 6 seasons of field work in Hadoti region, serviced threshing drum', 'Well-maintained older 2016 model self-propelled combine harvester based in Kota rural belt. Configured for wheat, paddy, and soybean harvesting across Kota, Kaithoon, and Bundi canal-irrigated farms.', 1400.00, 8200.00, 900.00, 'Rajasthan', 'Kota', 'Kota', 'Kaithoon Road', 'Farm Yard, Kota', '324001', 25.2138000, 75.8648000, 1, 'Available', 'Approved', 4.80, 16, 1),
(5, 5, 'Massey Ferguson 1035 DI + 9-Tyne Spring Cultivator (Used)', 'Cultivator', 'TAFE / Massey Ferguson', '1035 DI 36 HP + 9-Tyne Cultivator (2013 Used Model)', 2013, 'Older 2013 Used Tractor & Cultivator — Strong low-RPM torque, reversible shovels replaced', 'Classic 2013 used Massey Ferguson 1035 DI tractor with a 9-tyne spring-loaded cultivator in Sangod (Kota district). Ideal for primary soil loosening, weed clearing, and pre-sowing tillage.', 300.00, 1750.00, 550.00, 'Rajasthan', 'Kota', 'Sangod', 'Sangod', 'Agri Center, Sangod', '325601', 24.9250000, 76.2833000, 1, 'Available', 'Approved', 4.70, 8, 1),
(6, 6, 'National 9-Row Seed-Cum-Fertilizer Drill with Used Tractor', 'Seeder', 'National Agro / Eicher', '9-Tyne Seed Drill + Used Eicher 380 (2015 Used Model)', 2015, 'Older 2015 Used Seeder & Tractor — Calibrated metering flutes for mustard, wheat, gram & pearl millet', 'Used 2015 model 9-row seed-cum-fertilizer drill serving Jaipur (Chomu) and Kaithoon farms. Provides accurate row spacing and depth control for rabi mustard, wheat, and bajra sowing.', 260.00, 1450.00, 550.00, 'Rajasthan', 'Jaipur', 'Jaipur', 'Chomu', 'Agri Machinery Park, Jaipur', '303702', 26.9124000, 75.7873000, 1, 'Available', 'Approved', 4.60, 7, 1),
(7, 7, 'Sonalika DI 745 III (50 HP Older Tractor) + 500L Boom Sprayer', 'Sprayer', 'Sonalika / Aspee', 'DI 745 III + 500L Tractor Mounted Sprayer (2016 Used)', 2016, 'Older 2016 Used Model — Field-used blue tractor with 500L tank and brass boom nozzles', 'Older 2016 Sonalika 50 HP tractor fitted with a 500-liter PTO-driven crop sprayer in Bundi. Used for uniform foliar spray and pest protection in paddy, wheat, and mustard fields.', 280.00, 1600.00, 600.00, 'Rajasthan', 'Bundi', 'Bundi', 'Talera', 'Krishi Kendra, Bundi', '323001', 25.4305000, 75.6499000, 1, 'Available', 'Approved', 4.90, 13, 1),
(8, 8, 'JCB 3DX Backhoe Loader (2015 Older Used Farm Earthmover)', 'JCB', 'JCB India', '3DX Standard (2015 Used Model · ~6,100 Working Hours)', 2015, 'Older 2015 Used Earthmover — Visible work wear on bucket teeth, strong hydraulic digging pressure', 'Used 2015 model JCB 3DX backhoe loader in Jhalawar for farm pond (talai) digging, orange orchard trenching, drainage channel clearing, and field bund leveling.', 850.00, 5400.00, 800.00, 'Rajasthan', 'Jhalawar', 'Jhalawar', 'Jhalrapatan', 'Farm Machinery Yard, Jhalawar', '326001', 24.5973000, 76.1610000, 1, 'Available', 'Approved', 4.70, 12, 1);

-- 7. EQUIPMENT IMAGES
INSERT INTO equipment_images (equipment_id, image_path, is_primary) VALUES
(1, '/src/assets/images/used_tractor_rajasthan_field_1790613064661.jpg', 1),
(1, '/src/assets/images/older_blue_tractor_tilling_1790613080106.jpg', 0),
(2, '/src/assets/images/older_blue_tractor_tilling_1790613080106.jpg', 1),
(3, '/src/assets/images/used_harvester_thresher_rajasthan_1790613092266.jpg', 1),
(4, '/src/assets/images/used_harvester_thresher_rajasthan_1790613092266.jpg', 1),
(5, '/src/assets/images/used_tractor_rajasthan_field_1790613064661.jpg', 1),
(6, '/src/assets/images/equip_rotavator_1790528089602.jpg', 1),
(7, '/src/assets/images/older_blue_tractor_tilling_1790613080106.jpg', 1),
(8, '/src/assets/images/equip_jcb_1790528077399.jpg', 1);

-- 8. BOOKINGS
INSERT INTO bookings (booking_id, farmer_id, equipment_id, owner_id, driver_id, start_date, end_date, duration_days, operator_required, work_location, total_amount, advance_amount, remaining_amount, booking_status, payment_status, farmer_notes) VALUES
(101, 1, 1, 1, 1, '2026-09-18', '2026-09-20', 2, 1, 'Farm Plot, Baran Road, Rajasthan', 5400.00, 540.00, 4860.00, 'Completed', 'Fully Paid', 'Deep ploughing for mustard sowing in Baran.'),
(102, 1, 4, 4, 1, '2026-09-28', '2026-09-29', 2, 1, 'Canal Plot, Kota Rural, Rajasthan', 18200.00, 1820.00, 16380.00, 'Active', 'Advance Paid', 'Soybean harvesting on 10 acres near Kota.');

-- 9. BOOKING STATUS HISTORY
INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by, remarks) VALUES
(101, NULL, 'Pending', 1, 'Booking created by farmer'),
(101, 'Pending', 'Accepted', 2, 'Owner accepted booking request'),
(101, 'Accepted', 'Advance Paid', 1, '10% Demo Advance Paid via UPI'),
(101, 'Advance Paid', 'Active', 4, 'Driver started field operation'),
(101, 'Active', 'Returned', 1, 'Equipment returned after 2 days'),
(101, 'Returned', 'Inspection Pending', 2, 'Owner post-return inspection initiated'),
(101, 'Inspection Pending', 'Completed', 1, '90% Remaining Demo Payment completed'),
(102, NULL, 'Pending', 1, 'Booking created by farmer'),
(102, 'Pending', 'Accepted', 8, 'Owner accepted booking request'),
(102, 'Accepted', 'Driver Assigned', 8, 'Assigned verified operator Kesar Lal Meena'),
(102, 'Driver Assigned', 'Active', 1, '10% Demo Advance Paid via UPI');

-- 10. DRIVER ASSIGNMENTS
INSERT INTO driver_assignments (assignment_id, booking_id, driver_id, assigned_by, job_amount, assignment_status, instructions, accepted_at, completed_at) VALUES
(1, 101, 1, 2, 1200.00, 'Completed', 'Operate Mahindra 275 DI TU Tractor for 2 days at Baran.', NOW(), NOW()),
(2, 102, 1, 8, 1800.00, 'Accepted', 'Operate Used Kartar 4000 Combine Harvester at Kota.', NOW(), NULL);

-- 11. PAYMENTS (DEMO PAYMENTS)
INSERT INTO payments (payment_id, booking_id, payment_type, amount, payment_method, transaction_reference, payment_status, is_demo_payment) VALUES
(1, 101, 'Advance', 540.00, 'UPI', 'DEMO-UPI-20260917-8821', 'Completed', 1),
(2, 101, 'Remaining', 4860.00, 'UPI', 'DEMO-UPI-20260920-9942', 'Completed', 1),
(3, 102, 'Advance', 1820.00, 'UPI', 'DEMO-UPI-20260926-3319', 'Completed', 1);

-- 12. EQUIPMENT INSPECTIONS
INSERT INTO equipment_inspections (inspection_id, booking_id, owner_id, condition_status, damage_found, damage_description, additional_charge, inspection_notes) VALUES
(1, 101, 1, 'Good', 0, 'None', 0.00, 'Older 2015 tractor returned in clean working condition.');

-- 13. REVIEWS
INSERT INTO reviews (review_id, booking_id, farmer_id, equipment_id, driver_id, equipment_rating, driver_rating, review_reason, comment) VALUES
(1, 101, 1, 1, 1, 5, 5, 'Equipment Performance', 'Older 2015 Mahindra 275 DI tractor ploughed black cotton soil in Baran smoothly.');

-- 14. SAVED EQUIPMENT
INSERT INTO saved_equipment (farmer_id, equipment_id) VALUES
(1, 1),
(1, 2);

-- 15. MESSAGES
INSERT INTO messages (booking_id, sender_id, receiver_id, message, read_status) VALUES
(102, 1, 8, 'Ram Ram ji, 10% advance paid for the 2016 Kartar Harvester in Kota.', 1),
(102, 8, 1, 'Dhanyawad ji. Booking confirmed for Kota rural plot.', 1);

-- 16. NOTIFICATIONS
INSERT INTO notifications (user_id, title, message, notification_type, related_booking_id, is_read) VALUES
(1, 'Booking #102 Active', 'Operator Kesar Lal Meena assigned for Kota harvester booking.', 'Driver Assigned', 102, 0);

-- 17. SUPPORT TICKETS
INSERT INTO support_tickets (user_id, category, subject, description, status, admin_response) VALUES
(1, 'Booking', 'Rain delay reschedule policy in Hadoti', 'If unseasonal rain occurs in Baran/Kota, can booking dates be shifted?', 'Resolved', 'Yes, Khet Mitra allows free date shifting with Owner consent.');
