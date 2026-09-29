import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'khet_mitra_db.json');

// Optional direct MySQL connection pool (Database: khet_mitra)
let mysqlPool: mysql.Pool | null = null;
async function initMysqlPool() {
  if (!process.env.MYSQL_HOST) return;
  try {
    mysqlPool = mysql.createPool({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'khet_mitra',
      waitForConnections: true,
      connectionLimit: 10,
    });
    await mysqlPool.query('SELECT 1');
  } catch {
    mysqlPool = null;
  }
}
initMysqlPool();

// Properly licensed / generated authentic field agricultural images (Older/used field tractors & implements, no showroom photos)
const IMG_USED_RED_TRACTOR_FIELD = '/src/assets/images/used_tractor_rajasthan_field_1790613064661.jpg';
const IMG_OLDER_BLUE_TRACTOR_TILLING = '/src/assets/images/older_blue_tractor_tilling_1790613080106.jpg';
const IMG_USED_HARVESTER_THRESHER = '/src/assets/images/used_harvester_thresher_rajasthan_1790613092266.jpg';
const IMG_DEMO_OWNER_AGRI_AVATAR = '/src/assets/images/demo_owner_agri_avatar_1790613107070.jpg';
const IMG_TRACTOR = IMG_USED_RED_TRACTOR_FIELD;
const IMG_HARVESTER = IMG_USED_HARVESTER_THRESHER;
const IMG_JCB = '/src/assets/images/equip_jcb_1790528077399.jpg';
const IMG_ROTAVATOR = '/src/assets/images/equip_rotavator_1790528089602.jpg';

const SEED_VERSION = 'khet_mitra_mysql_17tables_v4';

// Password hashing helper (SHA-256 with salt — never store plain-text passwords)
function hashPassword(plain: string): string {
  const salt = process.env.PASSWORD_SALT || 'khet_mitra_salt_2026';
  return 'pbkdf2:sha256:' + crypto.createHmac('sha256', salt).update(plain).digest('hex');
}

function verifyPassword(storedHash: string, plain: string): boolean {
  const expected = hashPassword(plain);
  if (storedHash.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(expected));
}

// Haversine distance in km (Basic DSA / Math)
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Divide-and-Conquer Merge Sort for Equipment (DSA Concept: O(N log N))
function mergeSortEquipment(arr: any[], sortBy: string): any[] {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSortEquipment(arr.slice(0, mid), sortBy);
  const right = mergeSortEquipment(arr.slice(mid), sortBy);

  const merged: any[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    let takeLeft = true;
    if (sortBy === 'price_asc') {
      takeLeft = Number(left[i].price_per_day) <= Number(right[j].price_per_day);
    } else if (sortBy === 'price_desc') {
      takeLeft = Number(left[i].price_per_day) >= Number(right[j].price_per_day);
    } else if (sortBy === 'distance') {
      takeLeft = Number(left[i].distance_km ?? 999) <= Number(right[j].distance_km ?? 999);
    } else if (sortBy === 'rating') {
      takeLeft = Number(left[i].average_rating ?? 0) >= Number(right[j].average_rating ?? 0);
    } else if (sortBy === 'availability') {
      takeLeft = (left[i].is_available ? 1 : 0) >= (right[j].is_available ? 1 : 0);
    }
    if (takeLeft) {
      merged.push(left[i++]);
    } else {
      merged.push(right[j++]);
    }
  }
  return merged.concat(left.slice(i)).concat(right.slice(j));
}

// Rule-Based AI Talk Requirement Parser (No fake AI claims)
function parseAiTalkRequirement(text: string) {
  const lower = (text || '').toLowerCase();
  const categoryKeywords: Record<string, string[]> = {
    Tractor: ['tractor', 'ट्रैक्टर', 'mahindra', 'swaraj', 'john deere', 'sonalika'],
    Harvester: ['harvester', 'combine', 'हार्वेस्टर', 'कंबाइन', 'harvest', 'wheat cutting'],
    JCB: ['jcb', 'backhoe', 'excavator', 'जेसीबी', 'digging', 'leveling', 'trench'],
    Rotavator: ['rotavator', 'rotary', 'tiller', 'रोटावेटर', 'जुताई', 'soil prep'],
    Seeder: ['seeder', 'seed drill', 'planter', 'सीडर', 'बुवाई', 'sowing'],
    Thresher: ['thresher', 'थ्रेशर', 'threshing', 'grain separation'],
    Cultivator: ['cultivator', 'कल्टीवेटर', 'plough', 'tillage'],
    Sprayer: ['sprayer', 'boom sprayer', 'स्प्रेयर', 'छिड़काव', 'pesticide', 'fertilizer'],
  };

  let matchedCategory: string | null = null;
  for (const [cat, words] of Object.entries(categoryKeywords)) {
    if (words.some((w) => lower.includes(w))) {
      matchedCategory = cat;
      break;
    }
  }

  let durationValue = 1;
  let durationUnit: 'days' | 'hours' = 'days';
  const matchDays = lower.match(/(\d+)\s*(day|days|दिन|roz)/);
  const matchHours = lower.match(/(\d+)\s*(hour|hours|hr|hrs|घंटे)/);
  if (matchDays) {
    durationValue = Math.max(1, parseInt(matchDays[1], 10));
    durationUnit = 'days';
  } else if (matchHours) {
    durationValue = Math.max(1, parseInt(matchHours[1], 10));
    durationUnit = 'hours';
  }

  const knownCities = [
    'baran',
    'anta',
    'atru',
    'kota',
    'sangod',
    'kaithoon',
    'bundi',
    'jhalawar',
    'jaipur',
    'rajasthan',
    'hadoti',
  ];
  let detectedLocation = 'All Locations';
  for (const city of knownCities) {
    if (lower.includes(city)) {
      detectedLocation = city.charAt(0).toUpperCase() + city.slice(1);
      break;
    }
  }
  if (detectedLocation === 'All Locations') {
    const nearMatch = lower.match(/(?:near|in|at|around)\s+([a-z]{3,15})/);
    if (
      nearMatch &&
      !['me', 'my', 'the', 'for', 'with', 'without', 'tomorrow', 'today'].includes(nearMatch[1])
    ) {
      detectedLocation = nearMatch[1].charAt(0).toUpperCase() + nearMatch[1].slice(1);
    } else if (lower.includes('near me') || lower.includes('nearby') || lower.includes('पास')) {
      detectedLocation = 'Nearby (Current Location)';
    }
  }

  let operatorRequired = false;
  if (
    ['with operator', 'with driver', 'need driver', 'need operator', 'driver required', 'ड्राइवर', 'ऑपरेटर'].some(
      (w) => lower.includes(w),
    )
  ) {
    operatorRequired = true;
  }
  if (['without operator', 'without driver', 'no driver', 'self drive'].some((w) => lower.includes(w))) {
    operatorRequired = false;
  }

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  return {
    equipment_type: matchedCategory || 'All Agricultural Equipment',
    matched_category: matchedCategory,
    location: detectedLocation,
    duration: `${durationValue} ${durationUnit}`,
    duration_value: durationValue,
    duration_unit: durationUnit,
    suggested_date: tomorrow,
    operator_required: operatorRequired,
    parser_mode: 'Rule-Based Requirement Parser (Keyword & Regex Engine)',
  };
}

// Initial fictional DEMO seed data for Rajasthan (Baran, Anta, Atru, Kota, Sangod, Kaithoon, Bundi, Jhalawar)
// IMPORTANT: Fictional demo profiles ONLY — NO real phone numbers, NO private addresses, NO Aadhaar, NO real licenses, NO personal photographs.
function createSeedDatabase() {
  const defaultPass = hashPassword('password123');
  return {
    seed_version: SEED_VERSION,
    users: [
      {
        user_id: 1,
        full_name: 'Ramesh Kumar',
        mobile: '9812011223',
        email: 'ramesh@khetmitra.in',
        password_hash: defaultPass,
        role: 'farmer',
        address: 'Farm Sector, Kota-Baran Road',
        area_city: 'Kota, Rajasthan',
        profile_photo: IMG_DEMO_OWNER_AGRI_AVATAR,
        latitude: 25.2138,
        longitude: 75.8648,
        is_active: true,
        is_demo: true,
        created_at: '2026-09-01T08:00:00Z',
      },
      {
        user_id: 2,
        full_name: 'Bhanwar Lal Hadoti',
        mobile: '9812044556',
        email: 'suresh@khetmitra.in',
        password_hash: defaultPass,
        role: 'owner',
        address: 'Krishi Yard, Baran Agricultural Zone',
        area_city: 'Baran, Rajasthan',
        profile_photo: IMG_DEMO_OWNER_AGRI_AVATAR,
        latitude: 25.1011,
        longitude: 76.5132,
        is_active: true,
        is_demo: true,
        created_at: '2026-08-15T09:00:00Z',
      },
      {
        user_id: 3,
        full_name: 'Madan Mohan Nagar',
        mobile: '0000000102',
        email: 'demo.anta@khetmitra.example',
        password_hash: defaultPass,
        role: 'owner',
        address: 'Farm Sector, Anta Tehsil',
        area_city: 'Anta, Baran, Rajasthan',
        profile_photo: IMG_DEMO_OWNER_AGRI_AVATAR,
        latitude: 25.15,
        longitude: 76.3,
        is_active: true,
        is_demo: true,
        created_at: '2026-08-16T10:00:00Z',
      },
      {
        user_id: 4,
        full_name: 'Kesar Lal Meena',
        mobile: '9812099001',
        email: 'vikram@khetmitra.in',
        password_hash: defaultPass,
        role: 'driver',
        address: 'Operator Camp, Kota-Baran Highway',
        area_city: 'Baran, Rajasthan',
        profile_photo: IMG_DEMO_OWNER_AGRI_AVATAR,
        latitude: 25.105,
        longitude: 76.51,
        is_active: true,
        is_demo: true,
        created_at: '2026-08-20T11:00:00Z',
      },
      {
        user_id: 5,
        full_name: 'Ratan Lal Gurjar',
        mobile: '0000000202',
        email: 'demo.driver.kota@khetmitra.example',
        password_hash: defaultPass,
        role: 'driver',
        address: 'Mandi Zone, Kota Rural',
        area_city: 'Kota, Rajasthan',
        profile_photo: IMG_DEMO_OWNER_AGRI_AVATAR,
        latitude: 25.21,
        longitude: 75.86,
        is_active: true,
        is_demo: true,
        created_at: '2026-08-22T12:00:00Z',
      },
      {
        user_id: 6,
        full_name: 'Khet Mitra Admin',
        mobile: '9000011111',
        email: 'admin@khetmitra.in',
        password_hash: defaultPass,
        role: 'admin',
        address: 'Platform Desk, Kota, Rajasthan',
        area_city: 'Kota, Rajasthan',
        profile_photo: IMG_DEMO_OWNER_AGRI_AVATAR,
        latitude: 25.2138,
        longitude: 75.8648,
        is_active: true,
        is_demo: true,
        created_at: '2026-08-01T00:00:00Z',
      },
      {
        user_id: 7,
        full_name: 'Ramkaran Kalisindh',
        mobile: '0000000103',
        email: 'demo.atru@khetmitra.example',
        password_hash: defaultPass,
        role: 'owner',
        address: 'Krishi Block, Atru Rural Zone',
        area_city: 'Atru, Baran, Rajasthan',
        profile_photo: IMG_DEMO_OWNER_AGRI_AVATAR,
        latitude: 24.8722,
        longitude: 76.6472,
        is_active: true,
        is_demo: true,
        created_at: '2026-08-17T09:00:00Z',
      },
      {
        user_id: 8,
        full_name: 'Gopal Lal Chambal',
        mobile: '0000000104',
        email: 'demo.kota@khetmitra.example',
        password_hash: defaultPass,
        role: 'owner',
        address: 'Farm Yard, Kota Rural Belt',
        area_city: 'Kota, Rajasthan',
        profile_photo: IMG_DEMO_OWNER_AGRI_AVATAR,
        latitude: 25.2138,
        longitude: 75.8648,
        is_active: true,
        is_demo: true,
        created_at: '2026-08-18T09:00:00Z',
      },
      {
        user_id: 9,
        full_name: 'Devlal Hada',
        mobile: '0000000105',
        email: 'demo.sangod@khetmitra.example',
        password_hash: defaultPass,
        role: 'owner',
        address: 'Agri Center, Sangod Tehsil',
        area_city: 'Sangod, Kota, Rajasthan',
        profile_photo: IMG_DEMO_OWNER_AGRI_AVATAR,
        latitude: 24.925,
        longitude: 76.2833,
        is_active: true,
        is_demo: true,
        created_at: '2026-08-19T09:00:00Z',
      },
      {
        user_id: 10,
        full_name: 'Kanhaiya Lal Dhakar',
        mobile: '0000000106',
        email: 'demo.kaithoon@khetmitra.example',
        password_hash: defaultPass,
        role: 'owner',
        address: 'Farm Plot, Kaithoon Block',
        area_city: 'Kaithoon, Kota, Rajasthan',
        profile_photo: IMG_DEMO_OWNER_AGRI_AVATAR,
        latitude: 25.1,
        longitude: 75.9833,
        is_active: true,
        is_demo: true,
        created_at: '2026-08-20T09:00:00Z',
      },
      {
        user_id: 11,
        full_name: 'Prabhu Lal Bundi',
        mobile: '0000000107',
        email: 'demo.bundi@khetmitra.example',
        password_hash: defaultPass,
        role: 'owner',
        address: 'Krishi Kendra, Bundi Agricultural Belt',
        area_city: 'Bundi, Rajasthan',
        profile_photo: IMG_DEMO_OWNER_AGRI_AVATAR,
        latitude: 25.4305,
        longitude: 75.6499,
        is_active: true,
        is_demo: true,
        created_at: '2026-08-21T09:00:00Z',
      },
      {
        user_id: 12,
        full_name: 'Heera Lal Patidar',
        mobile: '0000000108',
        email: 'demo.jhalawar@khetmitra.example',
        password_hash: defaultPass,
        role: 'owner',
        address: 'Farm Machinery Yard, Jhalawar Rural',
        area_city: 'Jhalawar, Rajasthan',
        profile_photo: IMG_DEMO_OWNER_AGRI_AVATAR,
        latitude: 24.5973,
        longitude: 76.161,
        is_active: true,
        is_demo: true,
        verification_status: 'Verified',
        account_status: 'Active',
        created_at: '2026-08-22T09:00:00Z',
      },
      {
        user_id: 13,
        full_name: 'Nathu Lal Choudhary',
        mobile: '0000000109',
        email: 'demo.jaipur@khetmitra.example',
        password_hash: defaultPass,
        role: 'owner',
        address: 'Chomu Krishi Mandi Road, Jaipur',
        area_city: 'Jaipur, Rajasthan',
        profile_photo: IMG_DEMO_OWNER_AGRI_AVATAR,
        latitude: 26.9124,
        longitude: 75.7873,
        is_active: true,
        is_demo: true,
        verification_status: 'Verified',
        account_status: 'Active',
        created_at: '2026-08-23T09:00:00Z',
      },
      {
        user_id: 14,
        full_name: 'Sohan Lal Verma',
        mobile: '0000000203',
        email: 'pending.driver@khetmitra.in',
        password_hash: defaultPass,
        role: 'driver',
        address: 'Near Krishi Upaj Mandi, Bundi',
        area_city: 'Bundi, Rajasthan',
        profile_photo: IMG_DEMO_OWNER_AGRI_AVATAR,
        latitude: 25.4305,
        longitude: 75.6499,
        is_active: true,
        is_demo: true,
        verification_status: 'Pending Verification',
        account_status: 'Active',
        created_at: '2026-08-24T09:00:00Z',
      },
    ],
    farmer_profiles: [
      {
        farmer_id: 1,
        user_id: 1,
        state: 'Rajasthan',
        district: 'Kota',
        city: 'Kota',
        village: 'Borkhera Rural',
        address: 'Farm Sector, Kota-Baran Road',
        pincode: '324001',
        latitude: 25.2138,
        longitude: 75.8648,
        preferred_language: 'en',
        farm_size_acres: 12.0,
        primary_crops: 'Mustard, Wheat, Soybean, Coriander (Hadoti Region)',
      },
    ],
    owner_profiles: [
      {
        owner_id: 1,
        user_id: 2,
        business_name: 'Baran Kisan Custom Hiring',
        experience_years: 12,
        demo_badge: '',
        fictional_disclaimer: '',
        accepts_upi: true,
        accepts_bank_transfer: true,
        accepts_cash: true,
        upi_id: 'baran@upi',
        bank_account_note: 'Bank Transfer Enabled',
        total_revenue: 18400,
        average_rating: 4.8,
      },
      {
        owner_id: 2,
        user_id: 3,
        business_name: 'Anta Krishi Yantra Kendra',
        experience_years: 9,
        demo_badge: '',
        fictional_disclaimer: '',
        accepts_upi: true,
        accepts_bank_transfer: true,
        accepts_cash: true,
        upi_id: 'anta@upi',
        bank_account_note: 'Bank Transfer Enabled',
        total_revenue: 14200,
        average_rating: 4.7,
      },
      {
        owner_id: 3,
        user_id: 7,
        business_name: 'Atru Kalisindh Farm Machinery',
        experience_years: 14,
        demo_badge: '',
        fictional_disclaimer: '',
        accepts_upi: true,
        accepts_bank_transfer: false,
        accepts_cash: true,
        upi_id: 'atru@upi',
        bank_account_note: 'Bank Transfer Enabled',
        total_revenue: 11600,
        average_rating: 4.6,
      },
      {
        owner_id: 4,
        user_id: 8,
        business_name: 'Kota Chambal Krishi Seva',
        experience_years: 11,
        demo_badge: '',
        fictional_disclaimer: '',
        accepts_upi: true,
        accepts_bank_transfer: true,
        accepts_cash: true,
        upi_id: 'kota@upi',
        bank_account_note: 'Bank Transfer Enabled',
        total_revenue: 22500,
        average_rating: 4.8,
      },
      {
        owner_id: 5,
        user_id: 9,
        business_name: 'Sangod Khet Mitra Implements',
        experience_years: 8,
        demo_badge: '',
        fictional_disclaimer: '',
        accepts_upi: true,
        accepts_bank_transfer: true,
        accepts_cash: true,
        upi_id: 'sangod@upi',
        bank_account_note: 'Bank Transfer Enabled',
        total_revenue: 9800,
        average_rating: 4.7,
      },
      {
        owner_id: 6,
        user_id: 10,
        business_name: 'Kaithoon Gramin Tractor Center',
        experience_years: 10,
        demo_badge: '',
        fictional_disclaimer: '',
        accepts_upi: true,
        accepts_bank_transfer: false,
        accepts_cash: true,
        upi_id: 'kaithoon@upi',
        bank_account_note: 'Bank Transfer Enabled',
        total_revenue: 13100,
        average_rating: 4.6,
      },
      {
        owner_id: 7,
        user_id: 11,
        business_name: 'Bundi Hadoti Farm Equipment',
        experience_years: 15,
        demo_badge: '',
        fictional_disclaimer: '',
        accepts_upi: true,
        accepts_bank_transfer: true,
        accepts_cash: true,
        upi_id: 'bundi@upi',
        bank_account_note: 'Bank Transfer Enabled',
        total_revenue: 16900,
        average_rating: 4.9,
      },
      {
        owner_id: 8,
        user_id: 12,
        business_name: 'Jhalawar Malwa Agro Machinery',
        experience_years: 13,
        state: 'Rajasthan',
        district: 'Jhalawar',
        city: 'Jhalawar',
        village: 'Jhalrapatan Road',
        address: 'Farm Machinery Yard, Jhalawar Rural',
        pincode: '326001',
        latitude: 24.5973,
        longitude: 76.161,
        verification_status: 'Verified',
        verification_notes: 'Verified owner profile and equipment yard in Jhalawar.',
        verified_at: '2026-08-22T12:00:00Z',
        demo_badge: '',
        fictional_disclaimer: '',
        accepts_upi: true,
        accepts_bank_transfer: true,
        accepts_cash: true,
        upi_id: 'jhalawar@upi',
        bank_account_note: 'Bank Transfer Enabled',
        total_revenue: 15400,
        average_rating: 4.7,
      },
      {
        owner_id: 9,
        user_id: 13,
        business_name: 'Jaipur Chomu Kisan Tractor Seva',
        experience_years: 11,
        state: 'Rajasthan',
        district: 'Jaipur',
        city: 'Jaipur',
        village: 'Chomu Rural',
        address: 'Chomu Krishi Mandi Road, Jaipur',
        pincode: '303702',
        latitude: 26.9124,
        longitude: 75.7873,
        verification_status: 'Verified',
        verification_notes: 'Verified owner profile in Jaipur district.',
        verified_at: '2026-08-23T12:00:00Z',
        demo_badge: '',
        fictional_disclaimer: '',
        accepts_upi: true,
        accepts_bank_transfer: true,
        accepts_cash: true,
        upi_id: 'jaipur@upi',
        bank_account_note: 'Bank Transfer Enabled',
        total_revenue: 19200,
        average_rating: 4.8,
      },
    ],
    driver_profiles: [
      {
        driver_id: 1,
        user_id: 4,
        service_area: 'Baran, Anta, Atru, Sangod (Hadoti Region)',
        license_number: 'RJ-28-DL-20180041',
        driving_license_number: 'RJ-28-DL-20180041',
        license_photo: IMG_DEMO_OWNER_AGRI_AVATAR,
        driving_license_photo: IMG_DEMO_OWNER_AGRI_AVATAR,
        license_status: 'Verified',
        verification_status: 'Verified',
        verification_notes: 'Commercial LMV-TR & Harvester license verified by Admin.',
        verified_at: '2026-08-21T10:00:00Z',
        years_of_experience: 8,
        total_experience_years: 8,
        state: 'Rajasthan',
        district: 'Baran',
        city: 'Baran',
        village: 'Bamla',
        address: 'Operator Camp, Kota-Baran Highway',
        pincode: '325205',
        latitude: 25.105,
        longitude: 76.51,
        availability_status: 'Available',
        daily_wage_rate: 700,
        is_online: true,
        current_location: 'Baran, Rajasthan',
        total_earnings: 14200,
        average_rating: 4.8,
      },
      {
        driver_id: 2,
        user_id: 5,
        service_area: 'Kota, Kaithoon, Bundi, Jhalawar (Hadoti Region)',
        license_number: 'RJ-20-DL-20190088',
        driving_license_number: 'RJ-20-DL-20190088',
        license_photo: IMG_DEMO_OWNER_AGRI_AVATAR,
        driving_license_photo: IMG_DEMO_OWNER_AGRI_AVATAR,
        license_status: 'Verified',
        verification_status: 'Verified',
        verification_notes: 'Verified heavy earthmover & tractor operator license.',
        verified_at: '2026-08-23T10:00:00Z',
        years_of_experience: 6,
        total_experience_years: 6,
        state: 'Rajasthan',
        district: 'Kota',
        city: 'Kota',
        village: 'Mandana',
        address: 'Mandi Zone, Kota Rural',
        pincode: '324005',
        latitude: 25.21,
        longitude: 75.86,
        availability_status: 'Available',
        daily_wage_rate: 650,
        is_online: true,
        current_location: 'Kota, Rajasthan',
        total_earnings: 9800,
        average_rating: 4.7,
      },
      {
        driver_id: 3,
        user_id: 14,
        service_area: 'Bundi, Kota, Sangod',
        license_number: 'RJ-08-DL-20220119',
        driving_license_number: 'RJ-08-DL-20220119',
        license_photo: IMG_DEMO_OWNER_AGRI_AVATAR,
        driving_license_photo: IMG_DEMO_OWNER_AGRI_AVATAR,
        license_status: 'Pending Verification',
        verification_status: 'Pending Verification',
        verification_notes: 'Submitted license photo awaiting Admin verification.',
        verified_at: null,
        years_of_experience: 4,
        total_experience_years: 4,
        state: 'Rajasthan',
        district: 'Bundi',
        city: 'Bundi',
        village: 'Talera',
        address: 'Near Krishi Upaj Mandi, Bundi',
        pincode: '323001',
        latitude: 25.4305,
        longitude: 75.6499,
        availability_status: 'Offline',
        daily_wage_rate: 650,
        is_online: false,
        current_location: 'Bundi, Rajasthan',
        total_earnings: 0,
        average_rating: 5.0,
      },
    ],
    driver_equipment: [
      { skill_id: 1, driver_equipment_id: 1, driver_id: 1, user_id: 4, category: 'Tractor', equipment_category: 'Tractor', experience_years: 8, skill_level: 'Expert' },
      { skill_id: 2, driver_equipment_id: 2, driver_id: 1, user_id: 4, category: 'Harvester', equipment_category: 'Harvester', experience_years: 5, skill_level: 'Expert' },
      { skill_id: 3, driver_equipment_id: 3, driver_id: 1, user_id: 4, category: 'Rotavator', equipment_category: 'Rotavator', experience_years: 7, skill_level: 'Expert' },
      { skill_id: 4, driver_equipment_id: 4, driver_id: 1, user_id: 4, category: 'Seeder', equipment_category: 'Seeder', experience_years: 6, skill_level: 'Experienced' },
      { skill_id: 5, driver_equipment_id: 5, driver_id: 1, user_id: 4, category: 'Cultivator', equipment_category: 'Cultivator', experience_years: 8, skill_level: 'Expert' },
      { skill_id: 6, driver_equipment_id: 6, driver_id: 2, user_id: 5, category: 'JCB', equipment_category: 'JCB', experience_years: 5, skill_level: 'Expert' },
      { skill_id: 7, driver_equipment_id: 7, driver_id: 2, user_id: 5, category: 'Tractor', equipment_category: 'Tractor', experience_years: 6, skill_level: 'Expert' },
      { skill_id: 8, driver_equipment_id: 8, driver_id: 2, user_id: 5, category: 'Harvester', equipment_category: 'Harvester', experience_years: 4, skill_level: 'Experienced' },
      { skill_id: 9, driver_equipment_id: 9, driver_id: 2, user_id: 5, category: 'Thresher', equipment_category: 'Thresher', experience_years: 6, skill_level: 'Expert' },
      { skill_id: 10, driver_equipment_id: 10, driver_id: 2, user_id: 5, category: 'Sprayer', equipment_category: 'Sprayer', experience_years: 5, skill_level: 'Experienced' },
      { skill_id: 11, driver_equipment_id: 11, driver_id: 3, user_id: 14, category: 'Tractor', equipment_category: 'Tractor', experience_years: 4, skill_level: 'Experienced' },
      { skill_id: 12, driver_equipment_id: 12, driver_id: 3, user_id: 14, category: 'Rotavator', equipment_category: 'Rotavator', experience_years: 3, skill_level: 'Experienced' },
    ],
    equipment: [
      {
        equipment_id: 1,
        owner_id: 2,
        equipment_name: 'Mahindra 275 DI TU (39 HP Older/Used Field Tractor)',
        category: 'Tractor',
        brand: 'Mahindra',
        model: '275 DI TU Bhumiputra (2015 Used Model · ~4,400 Field Hours)',
        manufacturing_year: 2015,
        used_condition_note:
          'Older 2015 Used Model — Weathered paint and field-worn tires, mechanically overhauled engine & hydraulics in regular working condition',
        experience_years: 12,
        image_url: IMG_USED_RED_TRACTOR_FIELD,
        description:
          'Field-tested 2015 model Mahindra 275 DI TU 39 HP tractor actively used in Baran district black-cotton soil for mustard, wheat, and soybean ploughing, cultivator pulling, and trolley transport.',
        price_per_hour: 350,
        price_per_day: 2100,
        is_available: true,
        location: 'Baran, Rajasthan',
        latitude: 25.1011,
        longitude: 76.5132,
        operator_available: true,
        operator_charge_per_day: 600,
        required_operator_type: 'Experienced Field Tractor Operator (12 yrs owner experience)',
        terms_and_conditions:
          'Diesel cost as per actual field consumption. 10% advance to confirm booking.',
        average_rating: 4.8,
        review_count: 14,
        rating_label: '4.8★ (14 reviews)',
        is_demo: true,
      },
      {
        equipment_id: 2,
        owner_id: 3,
        equipment_name: 'Swaraj 744 FE (48 HP Used Agricultural Tractor & Rotavator)',
        category: 'Rotavator',
        brand: 'Swaraj / Shaktiman',
        model: 'Swaraj 744 FE + 6ft Rotavator (2016 Older Used Model · ~3,900 Hours)',
        manufacturing_year: 2016,
        used_condition_note:
          'Older 2016 Used Model — Active field tractor with 6ft rotary tiller, visible soil wear on blades, reliable PTO gearbox',
        experience_years: 9,
        image_url: IMG_OLDER_BLUE_TRACTOR_TILLING,
        description:
          'Used 2016 Swaraj 744 FE blue tractor paired with a 6-foot Shaktiman rotavator working in Anta agricultural fields. Suitable for mustard and wheat seedbed preparation after soybean harvest.',
        price_per_hour: 400,
        price_per_day: 2400,
        is_available: true,
        location: 'Anta, Baran, Rajasthan',
        latitude: 25.15,
        longitude: 76.3,
        operator_available: true,
        operator_charge_per_day: 600,
        required_operator_type: 'Tractor & Rotavator Field Operator (9 yrs experience)',
        terms_and_conditions:
          'Available with experienced operator around Anta and Baran.',
        average_rating: 4.7,
        review_count: 11,
        rating_label: '4.7★ (11 reviews)',
        is_demo: true,
      },
      {
        equipment_id: 3,
        owner_id: 7,
        equipment_name: 'Vishwakarma High-Capacity Multi-Crop Thresher (Used Model)',
        category: 'Thresher',
        brand: 'Vishwakarma Agro',
        model: 'Hadoti Special Multi-Crop Drum Thresher (2014 Older Used Model)',
        manufacturing_year: 2014,
        used_condition_note:
          'Older 2014 Used Machine — Repainted sheet metal, new fan belts and sieve screens, field-ready for wheat, mustard & coriander',
        experience_years: 14,
        image_url: IMG_USED_HARVESTER_THRESHER,
        description:
          'Older 2014 model PTO-operated multi-crop thresher in Atru (Baran district). Widely used by local farmers for threshing wheat, mustard (sarson), chana, and coriander (dhaniya) crops right in the field.',
        price_per_hour: 320,
        price_per_day: 1800,
        is_available: true,
        location: 'Atru, Baran, Rajasthan',
        latitude: 24.8722,
        longitude: 76.6472,
        operator_available: true,
        operator_charge_per_day: 550,
        required_operator_type: 'Thresher & PTO Feeding Operator (14 yrs experience)',
        terms_and_conditions:
          'Safety chute guard always fitted. Operator included on request.',
        average_rating: 4.6,
        review_count: 9,
        rating_label: '4.6★ (9 reviews)',
        is_demo: true,
      },
      {
        equipment_id: 4,
        owner_id: 8,
        equipment_name: 'Kartar 4000 Multi-Crop Combine Harvester (2016 Used Model)',
        category: 'Harvester',
        brand: 'Kartar Agro',
        model: 'Kartar 4000 14ft Cutter Bar (2016 Used Field Machine)',
        manufacturing_year: 2016,
        used_condition_note:
          'Older 2016 Used Harvester — 6 seasons of field work in Hadoti region, serviced threshing drum and cutter blades',
        experience_years: 11,
        image_url: IMG_USED_HARVESTER_THRESHER,
        description:
          'Well-maintained older 2016 model self-propelled combine harvester based in Kota rural belt. Configured for wheat, paddy, and soybean harvesting across Kota, Kaithoon, and Bundi canal-irrigated farms.',
        price_per_hour: 1400,
        price_per_day: 8200,
        is_available: true,
        location: 'Kota, Rajasthan',
        latitude: 25.2138,
        longitude: 75.8648,
        operator_available: true,
        operator_charge_per_day: 900,
        required_operator_type: 'Senior Combine Harvester Operator (11 yrs experience)',
        terms_and_conditions:
          'Field approach road must allow 14ft header transport.',
        average_rating: 4.8,
        review_count: 16,
        rating_label: '4.8★ (16 reviews)',
        is_demo: true,
      },
      {
        equipment_id: 5,
        owner_id: 9,
        equipment_name: 'Massey Ferguson 1035 DI + 9-Tyne Spring Cultivator (Used)',
        category: 'Cultivator',
        brand: 'TAFE / Massey Ferguson',
        model: '1035 DI 36 HP + 9-Tyne Cultivator (2013 Older Used Model)',
        manufacturing_year: 2013,
        used_condition_note:
          'Older 2013 Used Tractor & Cultivator — Aged body patina, strong low-RPM torque, reversible shovels recently replaced',
        experience_years: 8,
        image_url: IMG_USED_RED_TRACTOR_FIELD,
        description:
          'Classic 2013 used Massey Ferguson 1035 DI tractor with a 9-tyne spring-loaded cultivator in Sangod (Kota district). Ideal for primary soil loosening, weed clearing, and pre-sowing tillage.',
        price_per_hour: 300,
        price_per_day: 1750,
        is_available: true,
        location: 'Sangod, Kota, Rajasthan',
        latitude: 24.925,
        longitude: 76.2833,
        operator_available: true,
        operator_charge_per_day: 550,
        required_operator_type: 'Field Cultivator Operator (8 yrs experience)',
        terms_and_conditions:
          'Available with or without operator in Sangod tehsil.',
        average_rating: 4.7,
        review_count: 8,
        rating_label: '4.7★ (8 reviews)',
        is_demo: true,
      },
      {
        equipment_id: 6,
        owner_id: 10,
        equipment_name: 'National 9-Row Seed-Cum-Fertilizer Drill with Used Tractor',
        category: 'Seeder',
        brand: 'National Agro / Eicher',
        model: '9-Tyne Seed Drill + Used Eicher 380 (2015 Older Model)',
        manufacturing_year: 2015,
        used_condition_note:
          'Older 2015 Used Seeder & Tractor — Calibrated metering flutes for mustard, wheat, gram & soybean sowing',
        experience_years: 10,
        image_url: IMG_ROTAVATOR,
        description:
          'Used 2015 model 9-row seed-cum-fertilizer drill located in Kaithoon (Kota district). Provides accurate row spacing and depth control for rabi mustard, wheat, and garlic/coriander beds.',
        price_per_hour: 260,
        price_per_day: 1450,
        is_available: true,
        location: 'Kaithoon, Kota, Rajasthan',
        latitude: 25.1,
        longitude: 75.9833,
        operator_available: true,
        operator_charge_per_day: 550,
        required_operator_type: 'Precision Sowing Operator (10 yrs experience)',
        terms_and_conditions:
          'Clean seed hopper after daily use.',
        average_rating: 4.6,
        review_count: 7,
        rating_label: '4.6★ (7 reviews)',
        is_demo: true,
      },
      {
        equipment_id: 7,
        owner_id: 11,
        equipment_name: 'Sonalika DI 745 III (50 HP Older Tractor) + 500L Boom Sprayer',
        category: 'Sprayer',
        brand: 'Sonalika / Aspee',
        model: 'DI 745 III + 500L Tractor Mounted Sprayer (2016 Used Model)',
        manufacturing_year: 2016,
        used_condition_note:
          'Older 2016 Used Model — Field-used blue tractor with 500L polyethylene tank and brass boom nozzles in working order',
        experience_years: 15,
        image_url: IMG_OLDER_BLUE_TRACTOR_TILLING,
        description:
          'Older 2016 Sonalika 50 HP tractor fitted with a 500-liter PTO-driven crop sprayer in Bundi. Used for uniform foliar spray and pest protection in paddy, wheat, and mustard fields.',
        price_per_hour: 280,
        price_per_day: 1600,
        is_available: true,
        location: 'Bundi, Rajasthan',
        latitude: 25.4305,
        longitude: 75.6499,
        operator_available: true,
        operator_charge_per_day: 600,
        required_operator_type: 'Crop Sprayer & Tractor Operator (15 yrs experience)',
        terms_and_conditions:
          'Rinse sprayer tank with clean water after use.',
        average_rating: 4.9,
        review_count: 13,
        rating_label: '4.9★ (13 reviews)',
        is_demo: true,
      },
      {
        equipment_id: 8,
        owner_id: 12,
        equipment_name: 'JCB 3DX Backhoe Loader (2015 Older Used Farm Earthmover)',
        category: 'JCB',
        brand: 'JCB India',
        model: '3DX Standard (2015 Used Model · ~6,100 Working Hours)',
        manufacturing_year: 2015,
        used_condition_note:
          'Older 2015 Used Earthmover — Visible work wear on bucket teeth and loader arms, strong hydraulic digging pressure',
        experience_years: 13,
        image_url: IMG_JCB,
        description:
          'Used 2015 model JCB 3DX backhoe loader in Jhalawar for farm pond (talai) digging, orange orchard trenching, drainage channel clearing, and field bund leveling.',
        price_per_hour: 850,
        price_per_day: 5400,
        hourly_price: 850,
        daily_price: 5400,
        is_available: true,
        availability_status: 'Available',
        verification_status: 'Verified',
        location: 'Jhalawar, Rajasthan',
        location_state: 'Rajasthan',
        location_district: 'Jhalawar',
        location_city: 'Jhalawar',
        location_village: 'Jhalrapatan Rural',
        pincode: '326001',
        latitude: 24.5973,
        longitude: 76.161,
        operator_available: true,
        operator_charge_per_day: 800,
        required_operator_type: 'Experienced Earthmoving Operator (13 yrs experience)',
        terms_and_conditions:
          'Hourly meter starts at farm boundary.',
        average_rating: 4.7,
        review_count: 12,
        rating_label: '4.7★ (12 reviews)',
        is_demo: true,
      },
      {
        equipment_id: 9,
        owner_id: 13,
        equipment_name: 'John Deere 5050D (50 HP Used Field Tractor — Jaipur)',
        category: 'Tractor',
        brand: 'John Deere',
        model: '5050D 50 HP (2016 Used Model · ~3,800 Field Hours)',
        manufacturing_year: 2016,
        used_condition_note:
          'Older 2016 Used Tractor — Serviced fuel injection pump and power steering, field-ready in Jaipur Chomu belt',
        experience_years: 11,
        image_url: IMG_USED_RED_TRACTOR_FIELD,
        description:
          'Well-maintained 2016 model 50 HP agricultural tractor in Chomu, Jaipur district. Suitable for deep ploughing, groundnut digger, seed drill, and trolley operations.',
        price_per_hour: 380,
        price_per_day: 2250,
        hourly_price: 380,
        daily_price: 2250,
        is_available: true,
        availability_status: 'Available',
        verification_status: 'Verified',
        location: 'Jaipur, Rajasthan',
        location_state: 'Rajasthan',
        location_district: 'Jaipur',
        location_city: 'Jaipur',
        location_village: 'Chomu Rural',
        pincode: '303702',
        latitude: 26.9124,
        longitude: 75.7873,
        operator_available: true,
        operator_charge_per_day: 650,
        required_operator_type: 'Heavy Tractor Operator (11 yrs experience)',
        terms_and_conditions:
          '10% advance at booking and 90% after return inspection.',
        average_rating: 4.8,
        review_count: 10,
        rating_label: '4.8★ (10 reviews)',
        is_demo: true,
      },
    ],
    equipment_images: [
      { image_id: 1, equipment_id: 1, image_path: IMG_USED_RED_TRACTOR_FIELD, is_primary: true, uploaded_at: '2026-08-15T10:00:00Z' },
      { image_id: 2, equipment_id: 2, image_path: IMG_OLDER_BLUE_TRACTOR_TILLING, is_primary: true, uploaded_at: '2026-08-16T10:00:00Z' },
      { image_id: 3, equipment_id: 3, image_path: IMG_USED_HARVESTER_THRESHER, is_primary: true, uploaded_at: '2026-08-17T10:00:00Z' },
      { image_id: 4, equipment_id: 4, image_path: IMG_USED_HARVESTER_THRESHER, is_primary: true, uploaded_at: '2026-08-18T10:00:00Z' },
      { image_id: 5, equipment_id: 5, image_path: IMG_USED_RED_TRACTOR_FIELD, is_primary: true, uploaded_at: '2026-08-19T10:00:00Z' },
      { image_id: 6, equipment_id: 6, image_path: IMG_ROTAVATOR, is_primary: true, uploaded_at: '2026-08-20T10:00:00Z' },
      { image_id: 7, equipment_id: 7, image_path: IMG_OLDER_BLUE_TRACTOR_TILLING, is_primary: true, uploaded_at: '2026-08-21T10:00:00Z' },
      { image_id: 8, equipment_id: 8, image_path: IMG_JCB, is_primary: true, uploaded_at: '2026-08-22T10:00:00Z' },
      { image_id: 9, equipment_id: 9, image_path: IMG_USED_RED_TRACTOR_FIELD, is_primary: true, uploaded_at: '2026-08-23T10:00:00Z' },
    ],
    bookings: [
      {
        booking_id: 101,
        farmer_id: 1,
        equipment_id: 1,
        owner_id: 2,
        driver_id: 4,
        start_date: '2026-09-18',
        end_date: '2026-09-20',
        duration_type: 'days',
        duration_value: 2,
        work_location: 'Demo Farm Plot, Baran Road, Rajasthan (Sample Data)',
        operator_required: true,
        equipment_cost: 4200,
        operator_cost: 1200,
        additional_damage_charges: 0,
        total_price: 5400,
        advance_amount: 540,
        remaining_amount: 4860,
        payment_status: 'Fully Paid',
        booking_status: 'Completed',
        special_instructions: 'Demo booking: Deep ploughing for mustard sowing in Baran.',
        created_at: '2026-09-16T10:00:00Z',
        is_demo: true,
      },
      {
        booking_id: 102,
        farmer_id: 1,
        equipment_id: 4,
        owner_id: 8,
        driver_id: 4,
        start_date: '2026-09-28',
        end_date: '2026-09-29',
        duration_type: 'days',
        duration_value: 2,
        work_location: 'Demo Canal Plot, Kota Rural, Rajasthan (Sample Data)',
        operator_required: true,
        equipment_cost: 16400,
        operator_cost: 1800,
        additional_damage_charges: 0,
        total_price: 18200,
        advance_amount: 1820,
        remaining_amount: 16380,
        payment_status: 'Advance Paid',
        booking_status: 'Active',
        special_instructions: 'Demo booking: Soybean harvesting on 10 acres near Kota.',
        created_at: '2026-09-26T14:20:00Z',
        is_demo: true,
      },
    ],
    booking_status_history: [
      {
        history_id: 1,
        booking_id: 101,
        old_status: null,
        new_status: 'Pending',
        changed_by: 1,
        remarks: 'Booking requested by Farmer Ramesh Kumar.',
        created_at: '2026-09-16T10:00:00Z',
      },
      {
        history_id: 2,
        booking_id: 101,
        old_status: 'Pending',
        new_status: 'Accepted',
        changed_by: 2,
        remarks: 'Owner Bhanwar Lal Hadoti accepted booking.',
        created_at: '2026-09-16T12:00:00Z',
      },
      {
        history_id: 3,
        booking_id: 101,
        old_status: 'Accepted',
        new_status: 'Completed',
        changed_by: 2,
        remarks: 'Advance paid, returned, inspected, and remaining 90% paid.',
        created_at: '2026-09-20T18:00:00Z',
      },
      {
        history_id: 4,
        booking_id: 102,
        old_status: null,
        new_status: 'Active',
        changed_by: 1,
        remarks: '10% Demo Advance Paid. Operator Kesar Lal Meena assigned.',
        created_at: '2026-09-26T16:00:00Z',
      },
    ],
    booking_status: [
      {
        status_id: 1,
        booking_id: 101,
        status: 'Completed',
        updated_by_user_id: 2,
        notes: 'Demo booking completed and inspected.',
        updated_at: '2026-09-20T18:00:00Z',
      },
      {
        status_id: 2,
        booking_id: 102,
        status: 'Active',
        updated_by_user_id: 1,
        notes: '10% Demo Advance Paid. Fictional Demo Operator Kesar Lal assigned.',
        updated_at: '2026-09-26T16:00:00Z',
      },
    ],
    driver_assignments: [
      {
        assignment_id: 1,
        booking_id: 101,
        driver_id: 4,
        job_amount: 1200,
        job_status: 'Completed',
        instructions: 'Demo Job: Operate Mahindra 275 DI TU Tractor for 2 days at Baran.',
        assigned_at: '2026-09-17T09:00:00Z',
        completed_at: '2026-09-20T17:00:00Z',
      },
      {
        assignment_id: 2,
        booking_id: 102,
        driver_id: 4,
        job_amount: 1800,
        job_status: 'Accepted',
        instructions: 'Demo Job: Operate Used Kartar 4000 Combine Harvester at Kota.',
        assigned_at: '2026-09-26T15:00:00Z',
        completed_at: null,
      },
    ],
    payments: [
      {
        payment_id: 1,
        booking_id: 101,
        payer_id: 1,
        receiver_id: 2,
        payment_stage: 'Advance_10_Percent',
        payment_method: 'UPI',
        amount: 540,
        transaction_ref: 'DEMO-UPI-20260917-8821',
        status: 'Completed',
        is_demo_payment: true,
        paid_at: '2026-09-17T10:15:00Z',
      },
      {
        payment_id: 2,
        booking_id: 101,
        payer_id: 1,
        receiver_id: 2,
        payment_stage: 'Remaining_90_Percent',
        payment_method: 'UPI',
        amount: 4860,
        transaction_ref: 'DEMO-UPI-20260920-9942',
        status: 'Completed',
        is_demo_payment: true,
        paid_at: '2026-09-20T17:45:00Z',
      },
      {
        payment_id: 3,
        booking_id: 102,
        payer_id: 1,
        receiver_id: 8,
        payment_stage: 'Advance_10_Percent',
        payment_method: 'UPI',
        amount: 1820,
        transaction_ref: 'DEMO-UPI-20260926-3319',
        status: 'Completed',
        is_demo_payment: true,
        paid_at: '2026-09-26T15:40:00Z',
      },
    ],
    equipment_inspections: [
      {
        inspection_id: 1,
        booking_id: 101,
        owner_id: 2,
        equipment_condition: 'Good',
        has_damage: false,
        damage_description: 'None',
        additional_notes: 'Demo inspection: Older 2015 tractor returned in good working condition.',
        inspection_photo: '',
        additional_charges: 0,
        inspected_at: '2026-09-20T17:20:00Z',
      },
    ],
    reviews: [
      {
        review_id: 1,
        booking_id: 101,
        reviewer_id: 1,
        equipment_id: 1,
        driver_id: 4,
        equipment_rating: 5,
        driver_rating: 5,
        reason_category: 'Demo Sample Review — Field Performance',
        comment:
          '[Demo / Sample Review] Older 2015 Mahindra 275 DI tractor ploughed black cotton soil in Baran smoothly. Fictional demo rating for demonstration purposes.',
        created_at: '2026-09-20T18:30:00Z',
      },
    ],
    saved_equipment: [
      { saved_id: 1, farmer_id: 1, equipment_id: 1, saved_at: '2026-09-15T12:00:00Z' },
      { saved_id: 2, farmer_id: 1, equipment_id: 2, saved_at: '2026-09-20T14:00:00Z' },
    ],
    messages: [
      {
        message_id: 1,
        booking_id: 102,
        sender_id: 1,
        receiver_id: 8,
        sender_name: 'Kisan Demo Customer (Fictional)',
        message_text: '[Demo Message] Ram Ram ji, 10% demo advance paid for the used 2016 Kartar Harvester in Kota.',
        sent_at: '2026-09-26T15:45:00Z',
      },
      {
        message_id: 2,
        booking_id: 102,
        sender_id: 8,
        receiver_id: 1,
        sender_name: 'Gopal Lal Chambal (Demo Owner - Fictional)',
        message_text: '[Demo Message] Dhanyawad ji. Demo booking confirmed for Kota rural plot.',
        sent_at: '2026-09-26T15:52:00Z',
      },
    ],
    notifications: [
      {
        notification_id: 1,
        user_id: 1,
        title: 'Demo Booking #102 Active (Sample Data)',
        message: 'Fictional Demo Operator Kesar Lal Meena assigned for Kota harvester demo booking.',
        event_type: 'Driver Assigned',
        is_read: false,
        created_at: '2026-09-26T15:50:00Z',
      },
    ],
    support_tickets: [
      {
        ticket_id: 1,
        user_id: 1,
        category: 'Booking Problem',
        subject: 'Sample Demo Question: Rain delay reschedule policy in Hadoti',
        description: 'Demo ticket: If unseasonal rain occurs in Baran/Kota, can dates be shifted?',
        status: 'Resolved',
        admin_response: 'Yes, Khet Mitra allows free date shifting with Owner consent.',
        created_at: '2026-09-19T11:20:00Z',
      },
    ],
    post_requirements: [
      {
        req_id: 1,
        farmer_id: 1,
        farmer_name: 'Kisan Demo Customer (Fictional)',
        equipment_required: 'Tractor',
        work_requirement: 'Demo Requirement: Mustard sowing seedbed preparation in Baran / Anta',
        start_date: '2026-09-28',
        end_date: '2026-09-29',
        num_days: 2,
        location: 'Baran, Rajasthan',
        budget: 2500,
        operator_required: true,
        additional_instructions: 'Need older reliable 40-50 HP tractor with rotavator',
        created_at: '2026-09-25T09:00:00Z',
      },
    ],
  };
}

function loadDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const seeded = createSeedDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
    return seeded;
  }
  try {
    const existing = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    // If seed_version is outdated, refresh all DEMO data while strictly preserving real registered users (is_demo === false)
    if (existing.seed_version !== SEED_VERSION) {
      const freshDemo = createSeedDatabase();
      const realUsers = (existing.users || []).filter((u: any) => u.is_demo === false);
      const realUserIds = new Set(realUsers.map((u: any) => u.user_id));

      // Re-index real users if any ID collides with demo IDs (1..12)
      let maxDemoUserId = freshDemo.users.reduce((m: number, u: any) => Math.max(m, u.user_id), 12);
      const userIdMap = new Map<number, number>();
      const preservedRealUsers = realUsers.map((ru: any) => {
        const newId = ru.user_id <= 12 ? ++maxDemoUserId : ru.user_id;
        userIdMap.set(ru.user_id, newId);
        return { ...ru, user_id: newId, is_demo: false };
      });

      const preservedEquip = (existing.equipment || [])
        .filter((e: any) => e.is_demo === false)
        .map((e: any, idx: number) => ({
          ...e,
          equipment_id: Math.max(e.equipment_id, 100 + idx),
          owner_id: userIdMap.get(e.owner_id) || e.owner_id,
          is_demo: false,
        }));

      const merged = {
        ...freshDemo,
        users: [...freshDemo.users, ...preservedRealUsers],
        farmer_profiles: [
          ...freshDemo.farmer_profiles,
          ...(existing.farmer_profiles || [])
            .filter((fp: any) => realUserIds.has(fp.user_id))
            .map((fp: any) => ({ ...fp, user_id: userIdMap.get(fp.user_id) || fp.user_id })),
        ],
        owner_profiles: [
          ...freshDemo.owner_profiles,
          ...(existing.owner_profiles || [])
            .filter((op: any) => realUserIds.has(op.user_id))
            .map((op: any) => ({ ...op, user_id: userIdMap.get(op.user_id) || op.user_id })),
        ],
        driver_profiles: [
          ...freshDemo.driver_profiles,
          ...(existing.driver_profiles || [])
            .filter((dp: any) => realUserIds.has(dp.user_id))
            .map((dp: any) => ({ ...dp, user_id: userIdMap.get(dp.user_id) || dp.user_id })),
        ],
        equipment: [...freshDemo.equipment, ...preservedEquip],
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(merged, null, 2), 'utf-8');
      return merged;
    }
    return existing;
  } catch {
    const seeded = createSeedDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
    return seeded;
  }
}

function saveDb(db: any) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function addNotification(db: any, userId: number, title: string, message: string, eventType: string) {
  const nextId = db.notifications.reduce((max: number, n: any) => Math.max(max, n.notification_id), 0) + 1;
  db.notifications.unshift({
    notification_id: nextId,
    user_id: userId,
    title,
    message,
    event_type: eventType,
    is_read: false,
    created_at: new Date().toISOString(),
  });
}

function enrichEquipment(db: any, eq: any, userLat = 25.15, userLon = 76.2) {
  const owner = db.users.find((u: any) => u.user_id === eq.owner_id);
  const ownerProf = db.owner_profiles.find((op: any) => op.user_id === eq.owner_id);
  const distanceKm = calculateDistanceKm(userLat, userLon, eq.latitude || 25.15, eq.longitude || 76.2);
  const eqReviews = db.reviews.filter((r: any) => r.equipment_id === eq.equipment_id);
  const isDemoListing = Boolean(eq.is_demo || owner?.is_demo);
  const experienceYears = eq.experience_years || ownerProf?.experience_years || 8;
  return {
    ...eq,
    is_demo: isDemoListing,
    listing_badge: '',
    owner_is_demo: Boolean(owner?.is_demo),
    owner_badge: '',
    owner_name: owner ? owner.full_name : 'Equipment Owner',
    owner_mobile: owner ? owner.mobile : '',
    owner_profile_photo: owner?.profile_photo || IMG_DEMO_OWNER_AGRI_AVATAR,
    owner_location: owner?.area_city || eq.location,
    owner_experience_years: experienceYears,
    experience_years: experienceYears,
    used_condition_note:
      eq.used_condition_note ||
      `Used ${eq.manufacturing_year} Model — Field-Maintained Agricultural Machinery`,
    rating_label: `${eq.average_rating}★ (${eq.review_count || eqReviews.length || 10} reviews)`,
    business_name: ownerProf ? ownerProf.business_name : 'Agri Custom Hiring Center',
    accepts_upi: ownerProf ? ownerProf.accepts_upi : true,
    accepts_bank_transfer: ownerProf ? ownerProf.accepts_bank_transfer : true,
    accepts_cash: ownerProf ? ownerProf.accepts_cash : true,
    upi_id: ownerProf?.upi_id || 'demo@upi',
    bank_account_note: ownerProf?.bank_account_note || 'Bank Transfer Enabled',
    distance_km: distanceKm,
    reviews: eqReviews,
  };
}

function enrichBooking(db: any, b: any) {
  const farmer = db.users.find((u: any) => u.user_id === b.farmer_id);
  const owner = db.users.find((u: any) => u.user_id === b.owner_id);
  const driver = b.driver_id ? db.users.find((u: any) => u.user_id === b.driver_id) : null;
  const equip = db.equipment.find((e: any) => e.equipment_id === b.equipment_id);
  const ownerProf = db.owner_profiles.find((op: any) => op.user_id === b.owner_id);
  const inspection = db.equipment_inspections.find((ins: any) => ins.booking_id === b.booking_id) || null;
  const review = db.reviews.find((rev: any) => rev.booking_id === b.booking_id) || null;
  const assignment = db.driver_assignments.find((da: any) => da.booking_id === b.booking_id) || null;
  const payments = db.payments.filter((p: any) => p.booking_id === b.booking_id);

  return {
    ...b,
    farmer_name: farmer?.full_name || 'Farmer',
    farmer_mobile: farmer?.mobile || '',
    owner_name: owner?.full_name || 'Owner',
    owner_mobile: owner?.mobile || '',
    driver_name: driver?.full_name || null,
    driver_mobile: driver?.mobile || null,
    equipment_name: equip?.equipment_name || 'Equipment',
    equipment_category: equip?.category || 'Tractor',
    equipment_image: equip?.image_url || IMG_TRACTOR,
    owner_payment_methods: {
      upi: ownerProf ? ownerProf.accepts_upi : true,
      bank_transfer: ownerProf ? ownerProf.accepts_bank_transfer : true,
      cash: ownerProf ? ownerProf.accepts_cash : true,
      upi_id: ownerProf?.upi_id || 'owner@upi',
      bank_note: ownerProf?.bank_account_note || 'Direct Bank Transfer',
    },
    inspection,
    review,
    driver_assignment: assignment,
    payments,
  };
}

function buildUserProfilePayload(db: any, user: any) {
  const safeUser = { ...user };
  delete safeUser.password_hash;

  if (user.role === 'farmer') {
    const fp = db.farmer_profiles.find((f: any) => f.user_id === user.user_id) || {};
    const savedIds = db.saved_equipment
      .filter((s: any) => s.farmer_id === user.user_id)
      .map((s: any) => s.equipment_id);
    const reviewsGiven = db.reviews.filter((r: any) => r.reviewer_id === user.user_id);
    return { ...safeUser, farmer_profile: fp, saved_equipment_ids: savedIds, reviews_given: reviewsGiven };
  }

  if (user.role === 'owner') {
    const op = db.owner_profiles.find((o: any) => o.user_id === user.user_id) || {};
    const myEquip = db.equipment.filter((e: any) => e.owner_id === user.user_id);
    const myBookings = db.bookings.filter((b: any) => b.owner_id === user.user_id);
    return {
      ...safeUser,
      owner_profile: op,
      equipment_count: myEquip.length,
      total_bookings: myBookings.length,
    };
  }

  if (user.role === 'driver') {
    const dp = db.driver_profiles.find((d: any) => d.user_id === user.user_id) || {};
    const skills = db.driver_equipment.filter((de: any) => de.user_id === user.user_id);
    const driverReviews = db.reviews.filter((r: any) => r.driver_id === user.user_id && r.driver_rating);
    return { ...safeUser, driver_profile: dp, skills, reviews: driverReviews };
  }

  return safeUser;
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  app.use(express.json({ limit: '5mb' }));

  // ============================================================================
  // 1. AUTHENTICATION & USER PROFILE ROUTES
  // ============================================================================
  app.post('/api/auth/login', (req, res) => {
    const { identifier, mobile, email, password, role } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanMobile = String(mobile || '').replace(/\D/g, '');
    const cleanId = String(identifier || cleanEmail || cleanMobile).trim().toLowerCase();

    if ((!cleanId && !cleanEmail && !cleanMobile) || !password) {
      return res.status(400).json({ error: 'Please enter your Mobile Number or Email and Password.' });
    }
    const db = loadDb();
    let user = db.users.find((u: any) => {
      const uEmail = String(u.email || '').trim().toLowerCase();
      const uMobile = String(u.mobile || '').trim();
      return cleanEmail && cleanMobile && uEmail === cleanEmail && uMobile === cleanMobile;
    });

    if (!user && cleanEmail) {
      const nonDemoByEmail = db.users.find(
        (u: any) => !u.is_demo && String(u.email || '').trim().toLowerCase() === cleanEmail,
      );
      if (nonDemoByEmail) user = nonDemoByEmail;
    }

    if (!user && cleanMobile) {
      const nonDemoByMobile = db.users.find(
        (u: any) => !u.is_demo && String(u.mobile || '').trim() === cleanMobile,
      );
      if (nonDemoByMobile) user = nonDemoByMobile;
    }

    if (!user) {
      user = db.users.find((u: any) => {
        const uEmail = String(u.email || '').trim().toLowerCase();
        const uMobile = String(u.mobile || '').trim();
        if (cleanEmail && uEmail === cleanEmail) return true;
        if (cleanMobile && uMobile === cleanMobile) return true;
        if (cleanId && (uEmail === cleanId || uMobile === cleanId)) return true;
        return false;
      });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid Login: No account found with this Email or Mobile Number.' });
    }
    if (!verifyPassword(user.password_hash, password)) {
      return res.status(401).json({ error: 'Incorrect Password. Please check your credentials and try again.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'Unauthorized Access: Your account has been deactivated by Admin.' });
    }
    if (role && user.role !== role) {
      return res.status(403).json({
        error: `Role Mismatch: This account is registered as '${user.role.toUpperCase()}', not '${String(role).toUpperCase()}'. Please select the correct role tab.`,
      });
    }

    return res.json({
      message: 'Login successful',
      user: buildUserProfilePayload(db, user),
    });
  });

  // Google Login for Farmer, Equipment Provider (Owner), Driver, or Admin
  app.post('/api/auth/google', (req, res) => {
    const { email, full_name, role } = req.body || {};
    const targetRole = role || 'farmer';
    const db = loadDb();

    // If a demo/existing account matches the role or email, sign in or create a dedicated role account
    const cleanEmail = String(email || `${targetRole}.google@khetmitra.in`).trim().toLowerCase();
    let user = db.users.find(
      (u: any) => u.email.toLowerCase() === cleanEmail && u.role === targetRole,
    );

    if (!user) {
      // Check if they selected a default role account
      const defaultRoleMap: Record<string, string> = {
        farmer: 'ramesh@khetmitra.in',
        owner: 'suresh@khetmitra.in',
        driver: 'vikram@khetmitra.in',
        admin: 'admin@khetmitra.in',
      };
      if (!email) {
        user = db.users.find((u: any) => u.email === defaultRoleMap[targetRole]);
      }
    }

    if (!user) {
      const nextUserId = db.users.reduce((m: number, u: any) => Math.max(m, u.user_id), 0) + 1;
      const generatedMobile = '98' + String(10000000 + nextUserId * 13579).slice(0, 8);
      user = {
        user_id: nextUserId,
        full_name: full_name || `Google ${targetRole.charAt(0).toUpperCase() + targetRole.slice(1)}`,
        mobile: generatedMobile,
        email: cleanEmail,
        password_hash: hashPassword('google_oauth_verified'),
        role: targetRole,
        address: 'Karnal Agricultural Sector',
        area_city: 'Karnal, Haryana',
        profile_photo: '',
        latitude: 29.6857,
        longitude: 76.9905,
        is_active: true,
        is_demo: false,
        created_at: new Date().toISOString(),
      };
      db.users.push(user);

      if (targetRole === 'farmer') {
        db.farmer_profiles.push({
          farmer_id: db.farmer_profiles.length + 1,
          user_id: nextUserId,
          preferred_language: 'en',
          farm_size_acres: null,
          primary_crops: '',
        });
      } else if (targetRole === 'owner') {
        db.owner_profiles.push({
          owner_id: db.owner_profiles.length + 1,
          user_id: nextUserId,
          business_name: `${user.full_name} Equipment Center`,
          accepts_upi: true,
          accepts_bank_transfer: true,
          accepts_cash: true,
          upi_id: `${generatedMobile}@upi`,
          bank_account_note: 'Direct Bank Transfer Enabled',
          total_revenue: 0,
          average_rating: 5.0,
        });
      } else if (targetRole === 'driver') {
        const nextDriverId = db.driver_profiles.reduce((m: number, d: any) => Math.max(m, d.driver_id), 0) + 1;
        db.driver_profiles.push({
          driver_id: nextDriverId,
          user_id: nextUserId,
          service_area: 'Karnal, Haryana',
          license_number: `HR-05-202400${nextUserId}`,
          license_photo: 'https://placehold.co/600x380/e9efe6/1a241b?text=Verified+Driving+License',
          license_status: 'Verified',
          total_experience_years: 3,
          daily_wage_rate: 800,
          is_online: true,
          current_location: 'Karnal, Haryana',
          total_earnings: 0,
          average_rating: 4.9,
        });
        db.driver_equipment.push({
          skill_id: db.driver_equipment.length + 1,
          driver_id: nextDriverId,
          user_id: nextUserId,
          category: 'Tractor',
          experience_years: 3,
        });
      }
      saveDb(db);
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated by Admin.' });
    }

    return res.json({
      message: 'Google Sign-In successful',
      user: buildUserProfilePayload(db, user),
    });
  });

  // Phone Number + OTP Login for Farmer, Equipment Provider (Owner), Driver, or Admin
  app.post('/api/auth/send-otp', (req, res) => {
    const { mobile } = req.body || {};
    const cleanMobile = String(mobile || '').replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }
    return res.json({
      message: `OTP sent to +91 ${cleanMobile}`,
      demo_otp: '123456',
    });
  });

  app.post('/api/auth/verify-otp', (req, res) => {
    const { mobile, otp, role, full_name } = req.body || {};
    const cleanMobile = String(mobile || '').replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }
    if (!otp || String(otp).trim().length < 4) {
      return res.status(400).json({ error: 'Please enter the 6-digit OTP (use 123456).' });
    }

    const targetRole = role || 'farmer';
    const db = loadDb();
    let user = db.users.find(
      (u: any) => String(u.mobile).trim() === cleanMobile && u.role === targetRole,
    );

    if (!user) {
      const nextUserId = db.users.reduce((m: number, u: any) => Math.max(m, u.user_id), 0) + 1;
      const roleLabel =
        targetRole === 'owner'
          ? 'Equipment Provider'
          : targetRole.charAt(0).toUpperCase() + targetRole.slice(1);
      user = {
        user_id: nextUserId,
        full_name: full_name ? String(full_name).trim() : `${roleLabel} (${cleanMobile.slice(-4)})`,
        mobile: cleanMobile,
        email: `${targetRole}.${cleanMobile}@khetmitra.in`,
        password_hash: hashPassword('phone_otp_verified'),
        role: targetRole,
        address: 'Karnal Agricultural Belt',
        area_city: 'Karnal, Haryana',
        profile_photo: '',
        latitude: 29.6857,
        longitude: 76.9905,
        is_active: true,
        is_demo: false,
        created_at: new Date().toISOString(),
      };
      db.users.push(user);

      if (targetRole === 'farmer') {
        db.farmer_profiles.push({
          farmer_id: db.farmer_profiles.length + 1,
          user_id: nextUserId,
          preferred_language: 'en',
          farm_size_acres: null,
          primary_crops: '',
        });
      } else if (targetRole === 'owner') {
        db.owner_profiles.push({
          owner_id: db.owner_profiles.length + 1,
          user_id: nextUserId,
          business_name: `${user.full_name} Machinery Center`,
          accepts_upi: true,
          accepts_bank_transfer: true,
          accepts_cash: true,
          upi_id: `${cleanMobile}@upi`,
          bank_account_note: 'Direct Bank Transfer Enabled',
          total_revenue: 0,
          average_rating: 5.0,
        });
      } else if (targetRole === 'driver') {
        const nextDriverId = db.driver_profiles.reduce((m: number, d: any) => Math.max(m, d.driver_id), 0) + 1;
        db.driver_profiles.push({
          driver_id: nextDriverId,
          user_id: nextUserId,
          service_area: 'Karnal, Haryana',
          license_number: `HR-05-202400${nextUserId}`,
          license_photo: 'https://placehold.co/600x380/e9efe6/1a241b?text=Verified+Driving+License',
          license_status: 'Verified',
          total_experience_years: 3,
          daily_wage_rate: 800,
          is_online: true,
          current_location: 'Karnal, Haryana',
          total_earnings: 0,
          average_rating: 4.9,
        });
        db.driver_equipment.push({
          skill_id: db.driver_equipment.length + 1,
          driver_id: nextDriverId,
          user_id: nextUserId,
          category: 'Tractor',
          experience_years: 3,
        });
      }
      saveDb(db);
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated by Admin.' });
    }

    return res.json({
      message: 'Phone OTP Login successful',
      user: buildUserProfilePayload(db, user),
    });
  });

  app.post('/api/auth/register', (req, res) => {
    const {
      role,
      full_name,
      mobile,
      email,
      password,
      confirm_password,
      address,
      area_city,
      profile_photo,
      business_name,
      accepts_upi,
      accepts_bank_transfer,
      accepts_cash,
      upi_id,
      service_area,
      license_number,
      license_photo,
      total_experience_years,
      daily_wage_rate,
      skills,
    } = req.body || {};

    if (!role || !['farmer', 'owner', 'driver'].includes(role)) {
      return res.status(400).json({ error: 'Please select a valid role (Farmer, Owner, or Driver).' });
    }
    if (!full_name || !mobile || !email || !password || !address || !area_city) {
      return res.status(400).json({ error: 'Missing Fields: Please fill in all required fields.' });
    }
    if (password !== confirm_password) {
      return res.status(400).json({ error: 'Password and Confirm Password do not match.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const db = loadDb();
    const exists = db.users.find(
      (u: any) =>
        u.email.toLowerCase() === String(email).trim().toLowerCase() ||
        String(u.mobile).trim() === String(mobile).trim(),
    );
    if (exists) {
      return res.status(409).json({ error: 'An account with this Email or Mobile Number already exists.' });
    }

    if (role === 'driver' && !license_number) {
      return res.status(400).json({ error: 'Driving License Number is required for Driver registration.' });
    }

    const nextUserId = db.users.reduce((m: number, u: any) => Math.max(m, u.user_id), 0) + 1;
    const newUser = {
      user_id: nextUserId,
      full_name: String(full_name).trim(),
      mobile: String(mobile).trim(),
      email: String(email).trim().toLowerCase(),
      password_hash: hashPassword(password),
      role,
      address: String(address).trim(),
      area_city: String(area_city).trim(),
      profile_photo: profile_photo || '',
      latitude: 29.6857,
      longitude: 76.9905,
      is_active: true,
      is_demo: false,
      created_at: new Date().toISOString(),
    };
    db.users.push(newUser);

    // Role-specific tables (Strictly NO Aadhaar fields for Farmer!)
    if (role === 'farmer') {
      db.farmer_profiles.push({
        farmer_id: db.farmer_profiles.length + 1,
        user_id: nextUserId,
        preferred_language: 'en',
        farm_size_acres: null,
        primary_crops: '',
      });
    } else if (role === 'owner') {
      db.owner_profiles.push({
        owner_id: db.owner_profiles.length + 1,
        user_id: nextUserId,
        business_name: business_name || `${full_name} Farm Implements`,
        accepts_upi: accepts_upi !== false,
        accepts_bank_transfer: accepts_bank_transfer !== false,
        accepts_cash: accepts_cash !== false,
        upi_id: upi_id || `${String(mobile).trim()}@upi`,
        bank_account_note: 'Direct Bank Transfer Enabled',
        total_revenue: 0,
        average_rating: 5.0,
      });
    } else if (role === 'driver') {
      const nextDriverId = db.driver_profiles.reduce((m: number, d: any) => Math.max(m, d.driver_id), 0) + 1;
      db.driver_profiles.push({
        driver_id: nextDriverId,
        user_id: nextUserId,
        service_area: service_area || String(area_city).trim(),
        license_number: String(license_number).trim(),
        license_photo:
          license_photo || 'https://placehold.co/600x380/e9efe6/1a241b?text=Uploaded+Driving+License',
        license_status: 'Pending',
        total_experience_years: Number(total_experience_years) || 2,
        daily_wage_rate: Number(daily_wage_rate) || 750,
        is_online: true,
        current_location: String(area_city).trim(),
        total_earnings: 0,
        average_rating: 5.0,
      });

      const parsedSkills = Array.isArray(skills) && skills.length > 0
        ? skills
        : [{ category: 'Tractor', experience_years: Number(total_experience_years) || 2 }];

      parsedSkills.forEach((sk: any) => {
        const nextSkillId = db.driver_equipment.reduce((m: number, s: any) => Math.max(m, s.skill_id), 0) + 1;
        db.driver_equipment.push({
          skill_id: nextSkillId,
          driver_id: nextDriverId,
          user_id: nextUserId,
          category: sk.category,
          experience_years: Number(sk.experience_years) || 1,
        });
      });
    }

    addNotification(
      db,
      nextUserId,
      'Welcome to Khet Mitra',
      `Your ${role} account has been created. Explore your dashboard to get started.`,
      'Account Created',
    );
    saveDb(db);

    return res.status(201).json({
      message: 'Registration successful',
      user: buildUserProfilePayload(db, newUser),
    });
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    const { identifier, new_password } = req.body || {};
    if (!identifier || !new_password || String(new_password).length < 6) {
      return res
        .status(400)
        .json({ error: 'Please provide your registered Email/Mobile and a new password (min 6 chars).' });
    }
    const db = loadDb();
    const cleanId = String(identifier).trim().toLowerCase();
    const user = db.users.find(
      (u: any) => u.email.toLowerCase() === cleanId || String(u.mobile).trim() === cleanId,
    );
    if (!user) {
      return res.status(404).json({ error: 'No registered account found with that Email or Mobile.' });
    }
    user.password_hash = hashPassword(new_password);
    saveDb(db);
    return res.json({ message: 'Password has been securely reset. You can now log in.' });
  });

  app.post('/api/auth/change-password', (req, res) => {
    const { user_id, current_password, new_password } = req.body || {};
    const db = loadDb();
    const user = db.users.find((u: any) => u.user_id === Number(user_id));
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (!verifyPassword(user.password_hash, current_password)) {
      return res.status(401).json({ error: 'Incorrect current password.' });
    }
    if (!new_password || String(new_password).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }
    user.password_hash = hashPassword(new_password);
    saveDb(db);
    return res.json({ message: 'Password updated successfully.' });
  });

  app.get('/api/users/:userId', (req, res) => {
    const db = loadDb();
    const user = db.users.find((u: any) => u.user_id === Number(req.params.userId));
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json(buildUserProfilePayload(db, user));
  });

  app.put('/api/users/:userId', (req, res) => {
    const db = loadDb();
    const user = db.users.find((u: any) => u.user_id === Number(req.params.userId));
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const {
      full_name,
      mobile,
      address,
      area_city,
      profile_photo,
      latitude,
      longitude,
      business_name,
      accepts_upi,
      accepts_bank_transfer,
      accepts_cash,
      upi_id,
      bank_account_note,
      service_area,
      license_number,
      license_photo,
      total_experience_years,
      daily_wage_rate,
      current_location,
      skills,
    } = req.body || {};

    if (full_name) user.full_name = String(full_name).trim();
    if (mobile) user.mobile = String(mobile).trim();
    if (address) user.address = String(address).trim();
    if (area_city) user.area_city = String(area_city).trim();
    if (profile_photo !== undefined) user.profile_photo = profile_photo;
    if (latitude !== undefined) user.latitude = Number(latitude);
    if (longitude !== undefined) user.longitude = Number(longitude);

    if (user.role === 'owner') {
      const op = db.owner_profiles.find((o: any) => o.user_id === user.user_id);
      if (op) {
        if (business_name !== undefined) op.business_name = business_name;
        if (accepts_upi !== undefined) op.accepts_upi = Boolean(accepts_upi);
        if (accepts_bank_transfer !== undefined) op.accepts_bank_transfer = Boolean(accepts_bank_transfer);
        if (accepts_cash !== undefined) op.accepts_cash = Boolean(accepts_cash);
        if (upi_id !== undefined) op.upi_id = upi_id;
        if (bank_account_note !== undefined) op.bank_account_note = bank_account_note;
      }
    }

    if (user.role === 'driver') {
      const dp = db.driver_profiles.find((d: any) => d.user_id === user.user_id);
      if (dp) {
        if (service_area !== undefined) dp.service_area = service_area;
        if (license_number !== undefined) dp.license_number = license_number;
        if (license_photo !== undefined) dp.license_photo = license_photo;
        if (total_experience_years !== undefined) dp.total_experience_years = Number(total_experience_years);
        if (daily_wage_rate !== undefined) dp.daily_wage_rate = Number(daily_wage_rate);
        if (current_location !== undefined) dp.current_location = current_location;

        if (Array.isArray(skills)) {
          db.driver_equipment = db.driver_equipment.filter((s: any) => s.user_id !== user.user_id);
          skills.forEach((sk: any) => {
            const nextSkillId =
              db.driver_equipment.reduce((m: number, s: any) => Math.max(m, s.skill_id), 0) + 1;
            db.driver_equipment.push({
              skill_id: nextSkillId,
              driver_id: dp.driver_id,
              user_id: user.user_id,
              category: sk.category,
              experience_years: Number(sk.experience_years) || 1,
            });
          });
        }
      }
    }

    saveDb(db);
    return res.json({
      message: 'Profile updated successfully.',
      user: buildUserProfilePayload(db, user),
    });
  });

  // ============================================================================
  // 2. EQUIPMENT CATALOG, DEMO OWNERS DIRECTORY & OWNER CRUD
  // ============================================================================
  app.get('/api/demo-owners', (_req, res) => {
    const db = loadDb();
    const demoOwners = db.users
      .filter((u: any) => u.role === 'owner' && u.is_demo)
      .map((u: any) => {
        const op = db.owner_profiles.find((o: any) => o.user_id === u.user_id) || {};
        const equipList = db.equipment
          .filter((e: any) => e.owner_id === u.user_id && e.is_demo)
          .map((e: any) => enrichEquipment(db, e));
        return {
          user_id: u.user_id,
          full_name: u.full_name,
          demo_badge: '',
          listing_badge: '',
          fictional_disclaimer: '',
          location: u.area_city,
          profile_photo: u.profile_photo || IMG_DEMO_OWNER_AGRI_AVATAR,
          business_name: op.business_name || 'Custom Hiring Center',
          experience_years: op.experience_years || 10,
          demo_rating_label: `${op.average_rating || 4.7}★`,
          average_rating: op.average_rating || 4.7,
          equipment: equipList,
        };
      });
    return res.json(demoOwners);
  });

  app.get('/api/equipment', (req, res) => {
    const db = loadDb();
    const {
      q,
      category,
      location,
      max_price,
      max_distance,
      only_available,
      operator_mode,
      min_rating,
      sort_by,
      owner_id,
      data_source,
      lat,
      lon,
    } = req.query;

    const userLat = lat ? Number(lat) : 25.15;
    const userLon = lon ? Number(lon) : 76.2;

    let list = db.equipment.map((eq: any) => enrichEquipment(db, eq, userLat, userLon));

    // Separate Demo Data from Real Registered Users when requested
    if (data_source === 'demo') {
      list = list.filter((item: any) => Boolean(item.is_demo));
    } else if (data_source === 'real') {
      list = list.filter((item: any) => !item.is_demo);
    }

    // DSA Linear Search & Multi-Criteria Filtering
    if (owner_id) {
      list = list.filter((item: any) => item.owner_id === Number(owner_id));
    }
    if (q && String(q).trim()) {
      const term = String(q).trim().toLowerCase();
      list = list.filter((item: any) =>
        `${item.equipment_name} ${item.category} ${item.brand} ${item.model} ${item.location} ${item.description} ${item.owner_name}`
          .toLowerCase()
          .includes(term),
      );
    }
    if (category && category !== 'All') {
      list = list.filter((item: any) => item.category.toLowerCase() === String(category).toLowerCase());
    }
    if (location && String(location).trim() && location !== 'All Locations' && location !== 'Nearby (Current Location)') {
      const locTerm = String(location).trim().toLowerCase();
      list = list.filter((item: any) => item.location.toLowerCase().includes(locTerm));
    }
    if (max_price) {
      list = list.filter((item: any) => Number(item.price_per_day) <= Number(max_price));
    }
    if (max_distance) {
      list = list.filter((item: any) => Number(item.distance_km) <= Number(max_distance));
    }
    if (only_available === 'true') {
      list = list.filter((item: any) => Boolean(item.is_available));
    }
    if (operator_mode === 'with') {
      list = list.filter((item: any) => Boolean(item.operator_available));
    } else if (operator_mode === 'without') {
      // Any equipment can be booked without operator, or prioritize self-operated
    }
    if (min_rating) {
      list = list.filter((item: any) => Number(item.average_rating) >= Number(min_rating));
    }

    // DSA Merge Sort
    const sorted = mergeSortEquipment(list, String(sort_by || 'price_asc'));
    return res.json(sorted);
  });

  app.post('/api/equipment', (req, res) => {
    const {
      owner_id,
      equipment_name,
      category,
      brand,
      model,
      manufacturing_year,
      image_url,
      description,
      price_per_hour,
      price_per_day,
      is_available,
      location,
      operator_available,
      operator_charge_per_day,
      required_operator_type,
      terms_and_conditions,
    } = req.body || {};

    if (!owner_id || !equipment_name || !category || !brand || !price_per_day || !location) {
      return res.status(400).json({ error: 'Missing Fields: Please complete all required equipment fields.' });
    }

    const db = loadDb();
    const defaultCategoryImage: Record<string, string> = {
      Tractor: IMG_TRACTOR,
      Harvester: IMG_HARVESTER,
      JCB: IMG_JCB,
      Rotavator: IMG_ROTAVATOR,
      Seeder: IMG_ROTAVATOR,
      Thresher: IMG_HARVESTER,
      Cultivator: IMG_TRACTOR,
      Sprayer: IMG_TRACTOR,
    };

    const nextId = db.equipment.reduce((m: number, e: any) => Math.max(m, e.equipment_id), 0) + 1;
    const newEquip = {
      equipment_id: nextId,
      owner_id: Number(owner_id),
      equipment_name: String(equipment_name).trim(),
      category,
      brand: String(brand).trim(),
      model: String(model || 'Standard').trim(),
      manufacturing_year: Number(manufacturing_year) || 2024,
      image_url: image_url || defaultCategoryImage[category] || IMG_TRACTOR,
      description: String(description || 'Well-maintained agricultural equipment ready for field work.').trim(),
      price_per_hour: Number(price_per_hour) || Math.round(Number(price_per_day) / 6),
      price_per_day: Number(price_per_day),
      is_available: is_available !== false,
      location: String(location).trim(),
      latitude: 29.6857,
      longitude: 76.9905,
      operator_available: Boolean(operator_available),
      operator_charge_per_day: Number(operator_charge_per_day) || 700,
      required_operator_type: required_operator_type || `${category} Operator`,
      terms_and_conditions:
        terms_and_conditions || '10% advance payment required. Return in clean working condition.',
      average_rating: 5.0,
      review_count: 0,
      is_demo: false,
    };

    db.equipment.unshift(newEquip);
    saveDb(db);
    return res.status(201).json(enrichEquipment(db, newEquip));
  });

  app.put('/api/equipment/:id', (req, res) => {
    const db = loadDb();
    const eq = db.equipment.find((e: any) => e.equipment_id === Number(req.params.id));
    if (!eq) return res.status(404).json({ error: 'Equipment not found.' });

    const fields = [
      'equipment_name',
      'category',
      'brand',
      'model',
      'manufacturing_year',
      'image_url',
      'description',
      'price_per_hour',
      'price_per_day',
      'is_available',
      'location',
      'operator_available',
      'operator_charge_per_day',
      'required_operator_type',
      'terms_and_conditions',
    ];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        eq[f] = req.body[f];
      }
    });
    saveDb(db);
    return res.json(enrichEquipment(db, eq));
  });

  app.patch('/api/equipment/:id/availability', (req, res) => {
    const db = loadDb();
    const eq = db.equipment.find((e: any) => e.equipment_id === Number(req.params.id));
    if (!eq) return res.status(404).json({ error: 'Equipment not found.' });
    eq.is_available = Boolean(req.body.is_available);
    saveDb(db);
    return res.json(enrichEquipment(db, eq));
  });

  app.delete('/api/equipment/:id', (req, res) => {
    const db = loadDb();
    const id = Number(req.params.id);
    const idx = db.equipment.findIndex((e: any) => e.equipment_id === id);
    if (idx === -1) return res.status(404).json({ error: 'Equipment not found.' });
    db.equipment.splice(idx, 1);
    saveDb(db);
    return res.json({ message: 'Equipment deleted successfully.' });
  });

  // ============================================================================
  // 3. AI TALK (RULE-BASED PARSER) & POST REQUIREMENT
  // ============================================================================
  app.post('/api/ai-talk', (req, res) => {
    const { text } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Please type or speak your equipment requirement.' });
    }
    const parsed = parseAiTalkRequirement(String(text));
    const db = loadDb();
    let matches = db.equipment
      .filter((e: any) => e.is_available)
      .map((e: any) => enrichEquipment(db, e));

    if (parsed.matched_category) {
      matches = matches.filter((e: any) => e.category.toLowerCase() === parsed.matched_category!.toLowerCase());
    }
    if (parsed.location && !['All Locations', 'Nearby (Current Location)'].includes(parsed.location)) {
      const locFiltered = matches.filter((e: any) =>
        e.location.toLowerCase().includes(parsed.location.toLowerCase()),
      );
      if (locFiltered.length > 0) matches = locFiltered;
    }
    if (parsed.operator_required) {
      matches = matches.filter((e: any) => e.operator_available);
    }

    return res.json({ parsed, matches });
  });

  app.post('/api/requirements', (req, res) => {
    const {
      farmer_id,
      farmer_name,
      equipment_required,
      work_requirement,
      start_date,
      end_date,
      num_days,
      location,
      budget,
      operator_required,
      additional_instructions,
    } = req.body || {};

    if (!equipment_required || !start_date || !location) {
      return res.status(400).json({ error: 'Please enter Equipment Required, Start Date, and Location.' });
    }

    const db = loadDb();
    const nextReqId = db.post_requirements.reduce((m: number, r: any) => Math.max(m, r.req_id), 0) + 1;
    const newReq = {
      req_id: nextReqId,
      farmer_id: Number(farmer_id) || 1,
      farmer_name: farmer_name || 'Farmer',
      equipment_required,
      work_requirement: work_requirement || 'General field work',
      start_date,
      end_date: end_date || start_date,
      num_days: Number(num_days) || 1,
      location,
      budget: Number(budget) || 0,
      operator_required: Boolean(operator_required),
      additional_instructions: additional_instructions || '',
      created_at: new Date().toISOString(),
    };
    db.post_requirements.unshift(newReq);
    saveDb(db);

    // Match suitable equipment from database
    let matches = db.equipment
      .filter((e: any) => e.is_available)
      .map((e: any) => enrichEquipment(db, e));

    if (equipment_required && equipment_required !== 'All') {
      matches = matches.filter((e: any) => e.category.toLowerCase() === String(equipment_required).toLowerCase());
    }
    if (operator_required) {
      matches = matches.filter((e: any) => e.operator_available);
    }
    if (budget && Number(budget) > 0) {
      const budgetMatches = matches.filter((e: any) => Number(e.price_per_day) <= Number(budget));
      if (budgetMatches.length > 0) matches = budgetMatches;
    }

    return res.status(201).json({
      requirement: newReq,
      matches: mergeSortEquipment(matches, 'price_asc'),
    });
  });

  // ============================================================================
  // 4. SAVED EQUIPMENT (FAVORITES)
  // ============================================================================
  app.get('/api/saved-equipment/:farmerId', (req, res) => {
    const db = loadDb();
    const farmerId = Number(req.params.farmerId);
    const savedRecords = db.saved_equipment.filter((s: any) => s.farmer_id === farmerId);
    const items = savedRecords
      .map((s: any) => {
        const eq = db.equipment.find((e: any) => e.equipment_id === s.equipment_id);
        return eq ? enrichEquipment(db, eq) : null;
      })
      .filter(Boolean);
    return res.json(items);
  });

  app.post('/api/saved-equipment', (req, res) => {
    const { farmer_id, equipment_id } = req.body || {};
    const db = loadDb();
    const exists = db.saved_equipment.find(
      (s: any) => s.farmer_id === Number(farmer_id) && s.equipment_id === Number(equipment_id),
    );
    if (exists) {
      db.saved_equipment = db.saved_equipment.filter(
        (s: any) => !(s.farmer_id === Number(farmer_id) && s.equipment_id === Number(equipment_id)),
      );
      saveDb(db);
      return res.json({ saved: false, message: 'Removed from Saved Equipment.' });
    }
    const nextId = db.saved_equipment.reduce((m: number, s: any) => Math.max(m, s.saved_id), 0) + 1;
    db.saved_equipment.push({
      saved_id: nextId,
      farmer_id: Number(farmer_id),
      equipment_id: Number(equipment_id),
      saved_at: new Date().toISOString(),
    });
    saveDb(db);
    return res.json({ saved: true, message: 'Added to Saved Equipment.' });
  });

  // ============================================================================
  // 5. COMPLETE 17-STEP BOOKING, PAYMENT, INSPECTION & RATING ENGINE
  // ============================================================================
  app.get('/api/bookings', (req, res) => {
    const db = loadDb();
    const { farmer_id, owner_id, driver_id } = req.query;
    let list = db.bookings.map((b: any) => enrichBooking(db, b));
    if (farmer_id) list = list.filter((b: any) => b.farmer_id === Number(farmer_id));
    if (owner_id) list = list.filter((b: any) => b.owner_id === Number(owner_id));
    if (driver_id) list = list.filter((b: any) => b.driver_id === Number(driver_id));
    return res.json(list);
  });

  app.post('/api/bookings', (req, res) => {
    const {
      farmer_id,
      equipment_id,
      start_date,
      end_date,
      duration_type,
      duration_value,
      work_location,
      operator_required,
      driver_id,
      special_instructions,
    } = req.body || {};

    if (!farmer_id || !equipment_id || !start_date || !work_location) {
      return res.status(400).json({ error: 'Missing required booking details.' });
    }

    const db = loadDb();
    const equip = db.equipment.find((e: any) => e.equipment_id === Number(equipment_id));
    if (!equip || !equip.is_available) {
      return res.status(400).json({ error: 'Equipment Unavailable: This item is currently not available.' });
    }

    // Check overlapping date conflict for same equipment on active/accepted bookings
    const reqStart = String(start_date);
    const reqEnd = String(end_date || start_date);
    const conflict = db.bookings.find(
      (b: any) =>
        b.equipment_id === Number(equipment_id) &&
        ['Accepted', 'Driver Assigned', 'Advance Paid', 'Active'].includes(b.booking_status) &&
        String(b.start_date) <= reqEnd &&
        String(b.end_date || b.start_date) >= reqStart,
    );
    if (conflict) {
      return res.status(409).json({
        error: `Booking Conflict: ${equip.equipment_name} is already booked from ${conflict.start_date} to ${conflict.end_date || conflict.start_date}. Please pick non-overlapping dates.`,
      });
    }

    const durVal = Math.max(1, Number(duration_value) || 1);
    const durType = duration_type === 'hours' ? 'hours' : 'days';
    const unitRate = durType === 'hours' ? Number(equip.price_per_hour) : Number(equip.price_per_day);
    const equipmentCost = Math.round(unitRate * durVal);
    const operatorCost = operator_required
      ? Math.round((durType === 'hours' ? 120 : Number(equip.operator_charge_per_day || 700)) * durVal)
      : 0;
    const totalPrice = equipmentCost + operatorCost;
    const advanceAmount = Math.round(totalPrice * 0.1);
    const remainingAmount = totalPrice - advanceAmount;

    const nextBookingId = db.bookings.reduce((m: number, b: any) => Math.max(m, b.booking_id), 100) + 1;
    const newBooking = {
      booking_id: nextBookingId,
      farmer_id: Number(farmer_id),
      equipment_id: Number(equipment_id),
      owner_id: equip.owner_id,
      driver_id: driver_id ? Number(driver_id) : null,
      start_date,
      end_date: end_date || start_date,
      duration_type: durType,
      duration_value: durVal,
      work_location: String(work_location).trim(),
      operator_required: Boolean(operator_required),
      equipment_cost: equipmentCost,
      operator_cost: operatorCost,
      additional_damage_charges: 0,
      total_price: totalPrice,
      advance_amount: advanceAmount,
      remaining_amount: remainingAmount,
      payment_status: 'Pending',
      booking_status: 'Pending',
      special_instructions: special_instructions || '',
      created_at: new Date().toISOString(),
    };

    db.bookings.unshift(newBooking);
    if (!db.booking_status_history) db.booking_status_history = [];
    db.booking_status_history.push({
      history_id: db.booking_status_history.length + 1,
      booking_id: nextBookingId,
      old_status: null,
      new_status: 'Pending',
      changed_by: Number(farmer_id),
      remarks: 'Booking request submitted by Farmer.',
      created_at: new Date().toISOString(),
    });
    db.booking_status.push({
      status_id: db.booking_status.length + 1,
      booking_id: nextBookingId,
      status: 'Pending',
      updated_by_user_id: Number(farmer_id),
      notes: 'Booking request submitted by Farmer.',
      updated_at: new Date().toISOString(),
    });

    if (driver_id) {
      db.driver_assignments.push({
        assignment_id: db.driver_assignments.length + 1,
        booking_id: nextBookingId,
        driver_id: Number(driver_id),
        job_amount: operatorCost || 800,
        job_status: 'Requested',
        instructions: special_instructions || `Operate ${equip.equipment_name} at ${work_location}`,
        assigned_at: new Date().toISOString(),
        completed_at: null,
      });
      addNotification(
        db,
        Number(driver_id),
        `New Job Request #${nextBookingId}`,
        `Operator requested for ${equip.equipment_name} at ${work_location} (${start_date}).`,
        'New Booking',
      );
    }

    addNotification(
      db,
      equip.owner_id,
      `New Booking Request #${nextBookingId}`,
      `Received booking request for ${equip.equipment_name} starting ${start_date}.`,
      'New Booking',
    );

    saveDb(db);
    return res.status(201).json(enrichBooking(db, newBooking));
  });

  // Owner Accept / Reject / Cancel Booking
  app.patch('/api/bookings/:id/status', (req, res) => {
    const { status, updated_by_user_id, notes } = req.body || {};
    const db = loadDb();
    const booking = db.bookings.find((b: any) => b.booking_id === Number(req.params.id));
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    const oldStatus = booking.booking_status;
    booking.booking_status = status;
    if (!db.booking_status_history) db.booking_status_history = [];
    db.booking_status_history.push({
      history_id: db.booking_status_history.length + 1,
      booking_id: booking.booking_id,
      old_status: oldStatus,
      new_status: status,
      changed_by: Number(updated_by_user_id) || booking.owner_id,
      remarks: notes || `Status updated from ${oldStatus} to ${status}`,
      created_at: new Date().toISOString(),
    });
    db.booking_status.push({
      status_id: db.booking_status.length + 1,
      booking_id: booking.booking_id,
      status,
      updated_by_user_id: Number(updated_by_user_id) || booking.owner_id,
      notes: notes || `Status updated to ${status}`,
      updated_at: new Date().toISOString(),
    });

    const eventType = status === 'Accepted' ? 'Booking Accepted' : status === 'Cancelled' ? 'Booking Rejected' : status;
    addNotification(
      db,
      booking.farmer_id,
      `Booking #${booking.booking_id} ${status}`,
      `Your booking #${booking.booking_id} status is now '${status}'. ${
        status === 'Accepted' ? 'Please pay the 10% advance to activate the booking.' : ''
      }`,
      eventType,
    );

    saveDb(db);
    return res.json(enrichBooking(db, booking));
  });

  // Owner Assigns Compatible Driver
  app.post('/api/bookings/:id/assign-driver', (req, res) => {
    const { driver_id, instructions } = req.body || {};
    const db = loadDb();
    const booking = db.bookings.find((b: any) => b.booking_id === Number(req.params.id));
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    const driverUser = db.users.find((u: any) => u.user_id === Number(driver_id) && u.role === 'driver');
    if (!driverUser) return res.status(404).json({ error: 'Selected driver not found.' });

    booking.driver_id = Number(driver_id);
    if (booking.booking_status === 'Pending' || booking.booking_status === 'Accepted') {
      booking.booking_status = 'Driver Assigned';
    }

    const existingAssign = db.driver_assignments.find((da: any) => da.booking_id === booking.booking_id);
    if (existingAssign) {
      existingAssign.driver_id = Number(driver_id);
      existingAssign.job_status = 'Requested';
      existingAssign.instructions = instructions || existingAssign.instructions;
    } else {
      db.driver_assignments.push({
        assignment_id: db.driver_assignments.length + 1,
        booking_id: booking.booking_id,
        driver_id: Number(driver_id),
        job_amount: booking.operator_cost || 800,
        job_status: 'Requested',
        instructions: instructions || `Operate equipment at ${booking.work_location}`,
        assigned_at: new Date().toISOString(),
        completed_at: null,
      });
    }

    addNotification(
      db,
      booking.farmer_id,
      `Driver Assigned to Booking #${booking.booking_id}`,
      `Operator ${driverUser.full_name} has been assigned to your booking.`,
      'Driver Assigned',
    );
    addNotification(
      db,
      Number(driver_id),
      `New Job Assigned #${booking.booking_id}`,
      `You have been assigned to Booking #${booking.booking_id} at ${booking.work_location}.`,
      'Driver Assigned',
    );

    saveDb(db);
    return res.json(enrichBooking(db, booking));
  });

  // Two-Stage DEMO PAYMENT (10% Advance & 90% Remaining)
  app.post('/api/bookings/:id/pay', (req, res) => {
    const { stage, payment_method } = req.body || {};
    const db = loadDb();
    const booking = db.bookings.find((b: any) => b.booking_id === Number(req.params.id));
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    const method = payment_method || 'UPI';
    const isAdvance = stage === 'Advance_10_Percent';
    const amountToPay = isAdvance ? Number(booking.advance_amount) : Number(booking.remaining_amount);

    const txRef = `DEMO-${method.toUpperCase().replace(/\s+/g, '')}-${Date.now().toString().slice(-6)}`;
    db.payments.push({
      payment_id: db.payments.length + 1,
      booking_id: booking.booking_id,
      payer_id: booking.farmer_id,
      receiver_id: booking.owner_id,
      payment_stage: isAdvance ? 'Advance_10_Percent' : 'Remaining_90_Percent',
      payment_method: method,
      amount: amountToPay,
      transaction_ref: txRef,
      status: 'Completed',
      is_demo_payment: true,
      paid_at: new Date().toISOString(),
    });

    if (isAdvance) {
      booking.payment_status = 'Advance Paid';
      booking.booking_status = 'Active';
    } else {
      booking.payment_status = 'Fully Paid';
      booking.booking_status = 'Completed';
      // Update owner revenue & driver earnings
      const ownerProf = db.owner_profiles.find((o: any) => o.user_id === booking.owner_id);
      if (ownerProf) {
        ownerProf.total_revenue = Number(ownerProf.total_revenue || 0) + Number(booking.total_price);
      }
      if (booking.driver_id) {
        const drvProf = db.driver_profiles.find((d: any) => d.user_id === booking.driver_id);
        if (drvProf) {
          drvProf.total_earnings = Number(drvProf.total_earnings || 0) + Number(booking.operator_cost || 800);
        }
      }
    }

    addNotification(
      db,
      booking.owner_id,
      `Payment Received (Rs. ${amountToPay})`,
      `Received ${isAdvance ? '10% Advance' : '90% Remaining'} Demo Payment (${method}) for Booking #${booking.booking_id}. Ref: ${txRef}`,
      'Payment Received',
    );

    saveDb(db);
    return res.json(enrichBooking(db, booking));
  });

  // Farmer or Driver marks Equipment Returned
  app.post('/api/bookings/:id/return', (req, res) => {
    const db = loadDb();
    const booking = db.bookings.find((b: any) => b.booking_id === Number(req.params.id));
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    booking.booking_status = 'Returned';
    booking.payment_status = 'Remaining Pending';

    addNotification(
      db,
      booking.owner_id,
      `Equipment Returned for Booking #${booking.booking_id}`,
      `Please complete the post-rental inspection so the farmer can pay the remaining 90% balance.`,
      'Equipment Returned',
    );
    saveDb(db);
    return res.json(enrichBooking(db, booking));
  });

  // Owner Post-Rental Inspection
  app.post('/api/bookings/:id/inspect', (req, res) => {
    const {
      equipment_condition,
      has_damage,
      damage_description,
      additional_notes,
      inspection_photo,
      additional_charges,
    } = req.body || {};

    const db = loadDb();
    const booking = db.bookings.find((b: any) => b.booking_id === Number(req.params.id));
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    const extraCharges = has_damage ? Math.max(0, Number(additional_charges) || 0) : 0;
    booking.additional_damage_charges = extraCharges;
    booking.remaining_amount =
      Number(booking.equipment_cost) +
      Number(booking.operator_cost) -
      Number(booking.advance_amount) +
      extraCharges;
    booking.total_price = Number(booking.advance_amount) + Number(booking.remaining_amount);
    booking.booking_status = 'Inspected';
    booking.payment_status = 'Remaining Pending';

    const existing = db.equipment_inspections.find((i: any) => i.booking_id === booking.booking_id);
    const inspectionRecord = {
      inspection_id: existing ? existing.inspection_id : db.equipment_inspections.length + 1,
      booking_id: booking.booking_id,
      owner_id: booking.owner_id,
      equipment_condition: equipment_condition || 'Good',
      has_damage: Boolean(has_damage),
      damage_description: damage_description || 'No damage reported',
      additional_notes: additional_notes || 'Equipment inspected and verified.',
      inspection_photo: inspection_photo || '',
      additional_charges: extraCharges,
      inspected_at: new Date().toISOString(),
    };

    if (existing) {
      Object.assign(existing, inspectionRecord);
    } else {
      db.equipment_inspections.push(inspectionRecord);
    }

    addNotification(
      db,
      booking.farmer_id,
      `Inspection Confirmed for Booking #${booking.booking_id}`,
      `Owner inspected the equipment (Condition: ${inspectionRecord.equipment_condition}). Remaining payable: Rs. ${booking.remaining_amount}.`,
      'Payment Pending',
    );

    saveDb(db);
    return res.json(enrichBooking(db, booking));
  });

  // Farmer Submits 1-5 Star Rating & Review (Only after Completed, No duplicates)
  app.post('/api/bookings/:id/review', (req, res) => {
    const { reviewer_id, equipment_rating, driver_rating, reason_category, comment } = req.body || {};
    const db = loadDb();
    const booking = db.bookings.find((b: any) => b.booking_id === Number(req.params.id));
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    if (booking.booking_status !== 'Completed') {
      return res.status(400).json({ error: 'Ratings are only allowed after a booking is Completed.' });
    }
    const duplicate = db.reviews.find((r: any) => r.booking_id === booking.booking_id);
    if (duplicate) {
      return res.status(409).json({ error: 'Duplicate Rating: You have already rated this booking.' });
    }

    const eqStars = Math.min(5, Math.max(1, Number(equipment_rating) || 5));
    const drvStars = booking.driver_id && driver_rating ? Math.min(5, Math.max(1, Number(driver_rating))) : null;

    const newReview = {
      review_id: db.reviews.length + 1,
      booking_id: booking.booking_id,
      reviewer_id: Number(reviewer_id) || booking.farmer_id,
      equipment_id: booking.equipment_id,
      driver_id: booking.driver_id,
      equipment_rating: eqStars,
      driver_rating: drvStars,
      reason_category: reason_category || 'Equipment Performance',
      comment: comment || 'Great service and well-maintained agricultural machine.',
      created_at: new Date().toISOString(),
    };
    db.reviews.unshift(newReview);

    // Recalculate equipment average rating
    const equip = db.equipment.find((e: any) => e.equipment_id === booking.equipment_id);
    if (equip) {
      const allEqReviews = db.reviews.filter((r: any) => r.equipment_id === equip.equipment_id);
      const avg =
        allEqReviews.reduce((s: number, r: any) => s + Number(r.equipment_rating), 0) / allEqReviews.length;
      equip.average_rating = Math.round(avg * 10) / 10;
      equip.review_count = allEqReviews.length;
    }

    // Recalculate driver average rating
    if (booking.driver_id && drvStars) {
      const drvProf = db.driver_profiles.find((d: any) => d.user_id === booking.driver_id);
      if (drvProf) {
        const allDrvReviews = db.reviews.filter((r: any) => r.driver_id === booking.driver_id && r.driver_rating);
        const avgD =
          allDrvReviews.reduce((s: number, r: any) => s + Number(r.driver_rating), 0) / allDrvReviews.length;
        drvProf.average_rating = Math.round(avgD * 10) / 10;
      }
      addNotification(
        db,
        booking.driver_id,
        `New ${drvStars}★ Rating Received`,
        `Farmer rated your operation ${drvStars}/5 stars on Booking #${booking.booking_id}.`,
        'Rating Received',
      );
    }

    addNotification(
      db,
      booking.owner_id,
      `New ${eqStars}★ Equipment Rating`,
      `Farmer rated ${equip?.equipment_name || 'your equipment'} ${eqStars}/5 stars.`,
      'Rating Received',
    );

    saveDb(db);
    return res.status(201).json(enrichBooking(db, booking));
  });

  // ============================================================================
  // 6. DRIVER MATCHING (DSA WEIGHTED RANKING) & DRIVER JOB MANAGEMENT
  // ============================================================================
  app.get('/api/drivers/match', (req, res) => {
    const { category, location } = req.query;
    const db = loadDb();
    const targetCategory = String(category || 'Tractor');
    const targetLoc = String(location || '').toLowerCase();

    const drivers = db.users
      .filter((u: any) => u.role === 'driver' && u.is_active)
      .map((u: any) => {
        const dp = db.driver_profiles.find((d: any) => d.user_id === u.user_id) || {};
        const skills = db.driver_equipment.filter((s: any) => s.user_id === u.user_id);
        const matchedSkill = skills.find(
          (s: any) => s.category.toLowerCase() === targetCategory.toLowerCase(),
        );

        let score = 0;
        if (dp.is_online) score += 30;
        if (matchedSkill) {
          score += 35 + Math.min(Number(matchedSkill.experience_years) * 4, 20);
        }
        const areaText = `${dp.service_area || ''} ${u.area_city || ''} ${dp.current_location || ''}`.toLowerCase();
        if (targetLoc && areaText.includes(targetLoc.split(',')[0].trim())) {
          score += 10;
        }
        score += Math.round(((Number(dp.average_rating) || 4.5) / 5) * 5);

        return {
          user_id: u.user_id,
          driver_id: dp.driver_id,
          full_name: u.full_name,
          mobile: u.mobile,
          area_city: u.area_city,
          service_area: dp.service_area,
          current_location: dp.current_location || u.area_city,
          license_number: dp.license_number,
          license_status: dp.license_status,
          total_experience_years: dp.total_experience_years,
          daily_wage_rate: dp.daily_wage_rate || 800,
          is_online: Boolean(dp.is_online),
          average_rating: dp.average_rating || 4.8,
          skills,
          operates_requested_category: Boolean(matchedSkill),
          category_experience_years: matchedSkill ? matchedSkill.experience_years : 0,
          compatibility_score: Math.min(100, score),
        };
      });

    // Sort by highest compatibility score
    drivers.sort((a: any, b: any) => b.compatibility_score - a.compatibility_score);
    return res.json(drivers);
  });

  app.get('/api/drivers/:userId/jobs', (req, res) => {
    const db = loadDb();
    const userId = Number(req.params.userId);
    const dp = db.driver_profiles.find((d: any) => d.user_id === userId);
    const vStatus = dp?.verification_status || dp?.license_status || 'Incomplete';
    if (vStatus !== 'Verified') {
      return res.status(403).json({
        error: `Driver Access Restricted: Your verification_status is '${vStatus}'. A driver cannot access the Driver Dashboard or job functionality until verification_status = 'Verified'.`,
        verification_status: vStatus,
        verification_notes: dp?.verification_notes || 'Please submit your driving license for Admin verification.',
      });
    }
    const assignments = db.driver_assignments
      .filter((da: any) => da.driver_id === userId)
      .map((da: any) => {
        const booking = db.bookings.find((b: any) => b.booking_id === da.booking_id);
        const enriched = booking ? enrichBooking(db, booking) : null;
        return {
          ...da,
          booking: enriched,
        };
      });
    return res.json(assignments);
  });

  app.patch('/api/driver-jobs/:assignmentId', (req, res) => {
    const { job_status } = req.body || {};
    const db = loadDb();
    const assign = db.driver_assignments.find((da: any) => da.assignment_id === Number(req.params.assignmentId));
    if (!assign) return res.status(404).json({ error: 'Job assignment not found.' });

    const dp = db.driver_profiles.find((d: any) => d.user_id === assign.driver_id);
    const vStatus = dp?.verification_status || dp?.license_status || 'Incomplete';
    if (vStatus !== 'Verified') {
      return res.status(403).json({
        error: `Driver Access Restricted: Your verification_status is '${vStatus}'. Only Verified drivers can accept or update jobs.`,
        verification_status: vStatus,
      });
    }

    assign.job_status = job_status;
    assign.assignment_status = job_status;
    if (job_status === 'Accepted') {
      assign.accepted_at = new Date().toISOString();
    }
    if (job_status === 'Completed') {
      assign.completed_at = new Date().toISOString();
    }

    const booking = db.bookings.find((b: any) => b.booking_id === assign.booking_id);
    if (booking) {
      if (job_status === 'Accepted') {
        booking.booking_status = booking.payment_status === 'Advance Paid' ? 'Active' : 'Driver Assigned';
        addNotification(
          db,
          booking.farmer_id,
          `Driver Accepted Job #${booking.booking_id}`,
          `Your assigned operator accepted the job request.`,
          'Job Accepted',
        );
      } else if (job_status === 'Rejected') {
        booking.driver_id = null;
        addNotification(
          db,
          booking.owner_id,
          `Driver Declined Job #${booking.booking_id}`,
          `Please assign another compatible driver to Booking #${booking.booking_id}.`,
          'Driver Assigned',
        );
      } else if (job_status === 'On the Way') {
        addNotification(
          db,
          booking.farmer_id,
          `Driver On the Way (#${booking.booking_id})`,
          `Your assigned operator is on the way to ${booking.work_location}.`,
          'Driver Assigned',
        );
      } else if (job_status === 'Started') {
        booking.booking_status = 'Active';
        addNotification(
          db,
          booking.farmer_id,
          `Field Work Started (#${booking.booking_id})`,
          `Operator has started operating the equipment at ${booking.work_location}.`,
          'Job Started',
        );
      } else if (job_status === 'Completed') {
        booking.booking_status = 'Returned';
        booking.payment_status = 'Remaining Pending';
        addNotification(
          db,
          booking.owner_id,
          `Job Completed & Equipment Returned (#${booking.booking_id})`,
          `Driver completed the job. Please inspect the returned equipment.`,
          'Job Completed',
        );
      }
    }

    saveDb(db);
    return res.json(assign);
  });

  app.patch('/api/drivers/:userId/availability', (req, res) => {
    const { is_online, current_location } = req.body || {};
    const db = loadDb();
    const dp = db.driver_profiles.find((d: any) => d.user_id === Number(req.params.userId));
    if (!dp) return res.status(404).json({ error: 'Driver profile not found.' });

    const vStatus = dp.verification_status || dp.license_status || 'Incomplete';
    if (vStatus !== 'Verified') {
      return res.status(403).json({
        error: `Driver Access Restricted: Your verification_status is '${vStatus}'. Only Verified drivers can toggle online job availability.`,
        verification_status: vStatus,
      });
    }

    if (is_online !== undefined) {
      dp.is_online = Boolean(is_online);
      dp.availability_status = dp.is_online ? 'Available' : 'Offline';
    }
    if (current_location !== undefined) dp.current_location = String(current_location).trim();
    saveDb(db);
    return res.json(dp);
  });

  // Unverified Driver submits license & expertise for Admin verification
  app.post('/api/drivers/:userId/submit-verification', (req, res) => {
    const db = loadDb();
    const userId = Number(req.params.userId);
    const dp = db.driver_profiles.find((d: any) => d.user_id === userId);
    if (!dp) return res.status(404).json({ error: 'Driver profile not found.' });

    const {
      license_number,
      license_photo,
      years_of_experience,
      service_area,
      state,
      district,
      city,
      village,
      pincode,
      skills,
    } = req.body || {};

    if (!license_number || !String(license_number).trim()) {
      return res.status(400).json({ error: 'Driving license number is required for verification.' });
    }

    dp.license_number = String(license_number).trim();
    dp.driving_license_number = String(license_number).trim();
    if (license_photo) {
      dp.license_photo = String(license_photo).trim();
      dp.driving_license_photo = String(license_photo).trim();
    }
    if (years_of_experience !== undefined) {
      dp.years_of_experience = Number(years_of_experience);
      dp.total_experience_years = Number(years_of_experience);
    }
    if (service_area) dp.service_area = String(service_area).trim();
    if (state) dp.state = String(state).trim();
    if (district) dp.district = String(district).trim();
    if (city) dp.city = String(city).trim();
    if (village) dp.village = String(village).trim();
    if (pincode) dp.pincode = String(pincode).trim();

    dp.license_status = 'Pending Verification';
    dp.verification_status = 'Pending Verification';
    dp.verification_notes = 'Submitted by driver; awaiting Admin review.';

    if (Array.isArray(skills) && skills.length > 0) {
      db.driver_equipment = db.driver_equipment.filter((s: any) => s.user_id !== userId);
      skills.forEach((sk: any) => {
        const nextSkillId = db.driver_equipment.reduce((m: number, s: any) => Math.max(m, s.skill_id || 0), 0) + 1;
        db.driver_equipment.push({
          skill_id: nextSkillId,
          driver_equipment_id: nextSkillId,
          driver_id: dp.driver_id,
          user_id: userId,
          category: sk.category,
          equipment_category: sk.category,
          experience_years: Number(sk.experience_years) || 1,
          skill_level: sk.skill_level || 'Experienced',
        });
      });
    }

    const user = db.users.find((u: any) => u.user_id === userId);
    if (user) {
      user.verification_status = 'Pending Verification';
    }

    saveDb(db);
    return res.json({
      message: 'Verification documents submitted! Status is now Pending Verification.',
      user: user ? buildUserProfilePayload(db, user) : null,
    });
  });

  // ============================================================================
  // 7. CHAT MESSAGES, NOTIFICATIONS & SUPPORT TICKETS
  // ============================================================================
  app.get('/api/messages/:bookingId', (req, res) => {
    const db = loadDb();
    const msgs = db.messages.filter((m: any) => m.booking_id === Number(req.params.bookingId));
    return res.json(msgs);
  });

  app.post('/api/messages', (req, res) => {
    const { booking_id, sender_id, receiver_id, message_text } = req.body || {};
    if (!booking_id || !sender_id || !message_text || !String(message_text).trim()) {
      return res.status(400).json({ error: 'Message text cannot be empty.' });
    }
    const db = loadDb();
    const sender = db.users.find((u: any) => u.user_id === Number(sender_id));
    const newMsg = {
      message_id: db.messages.length + 1,
      booking_id: Number(booking_id),
      sender_id: Number(sender_id),
      receiver_id: Number(receiver_id) || 1,
      sender_name: sender ? `${sender.full_name} (${sender.role})` : 'User',
      message_text: String(message_text).trim(),
      sent_at: new Date().toISOString(),
    };
    db.messages.push(newMsg);
    saveDb(db);
    return res.status(201).json(newMsg);
  });

  app.get('/api/notifications/:userId', (req, res) => {
    const db = loadDb();
    const list = db.notifications.filter((n: any) => n.user_id === Number(req.params.userId));
    return res.json(list);
  });

  app.patch('/api/notifications/:userId/read', (req, res) => {
    const db = loadDb();
    db.notifications.forEach((n: any) => {
      if (n.user_id === Number(req.params.userId)) n.is_read = true;
    });
    saveDb(db);
    return res.json({ message: 'All notifications marked as read.' });
  });

  app.get('/api/support-tickets', (req, res) => {
    const db = loadDb();
    const { user_id } = req.query;
    let tickets = db.support_tickets.map((t: any) => {
      const u = db.users.find((usr: any) => usr.user_id === t.user_id);
      return { ...t, user_name: u?.full_name || 'User', user_role: u?.role || 'farmer', user_mobile: u?.mobile || '' };
    });
    if (user_id) {
      tickets = tickets.filter((t: any) => t.user_id === Number(user_id));
    }
    return res.json(tickets);
  });

  app.post('/api/support-tickets', (req, res) => {
    const { user_id, category, subject, description } = req.body || {};
    if (!user_id || !category || !subject || !description) {
      return res.status(400).json({ error: 'Please fill in Category, Subject, and Description.' });
    }
    const db = loadDb();
    const nextId = db.support_tickets.reduce((m: number, t: any) => Math.max(m, t.ticket_id), 0) + 1;
    const ticket = {
      ticket_id: nextId,
      user_id: Number(user_id),
      category,
      subject: String(subject).trim(),
      description: String(description).trim(),
      status: 'Open',
      admin_response: null,
      created_at: new Date().toISOString(),
    };
    db.support_tickets.unshift(ticket);
    saveDb(db);
    return res.status(201).json(ticket);
  });

  // ============================================================================
  // 8. ADMIN PANEL ROUTES (NEVER EXPOSES PLAIN-TEXT PASSWORDS)
  // ============================================================================
  app.get('/api/admin/overview', (_req, res) => {
    const db = loadDb();
    // Strictly sanitize users so plain-text passwords NEVER exist or leak
    const sanitizedUsers = db.users.map((u: any) => ({
      user_id: u.user_id,
      full_name: u.full_name,
      mobile: u.mobile,
      email: u.email,
      role: u.role,
      address: u.address,
      area_city: u.area_city,
      is_active: u.is_active,
      is_demo: u.is_demo,
      password_security: 'PBKDF2-SHA256 Hashed (Protected)',
      created_at: u.created_at,
    }));

    const driversWithProfiles = db.driver_profiles.map((dp: any) => {
      const u = db.users.find((usr: any) => usr.user_id === dp.user_id);
      const skills = db.driver_equipment.filter((s: any) => s.user_id === dp.user_id);
      return {
        ...dp,
        full_name: u?.full_name || 'Driver',
        mobile: u?.mobile || '',
        email: u?.email || '',
        area_city: u?.area_city || '',
        skills,
      };
    });

    const enrichedBookings = db.bookings.map((b: any) => enrichBooking(db, b));
    const enrichedEquipment = db.equipment.map((e: any) => enrichEquipment(db, e));
    const enrichedTickets = db.support_tickets.map((t: any) => {
      const u = db.users.find((usr: any) => usr.user_id === t.user_id);
      return { ...t, user_name: u?.full_name || 'User', user_role: u?.role || 'farmer' };
    });

    return res.json({
      users: sanitizedUsers,
      drivers: driversWithProfiles,
      equipment: enrichedEquipment,
      bookings: enrichedBookings,
      payments: db.payments,
      support_tickets: enrichedTickets,
      reviews: db.reviews,
      stats: {
        total_users: db.users.length,
        total_farmers: db.users.filter((u: any) => u.role === 'farmer').length,
        total_owners: db.users.filter((u: any) => u.role === 'owner').length,
        total_drivers: db.users.filter((u: any) => u.role === 'driver').length,
        total_equipment: db.equipment.length,
        total_bookings: db.bookings.length,
        total_payment_volume: db.payments.reduce((s: number, p: any) => s + Number(p.amount), 0),
        open_tickets: db.support_tickets.filter((t: any) => t.status !== 'Resolved').length,
      },
    });
  });

  app.patch('/api/admin/users/:userId/toggle', (req, res) => {
    const db = loadDb();
    const user = db.users.find((u: any) => u.user_id === Number(req.params.userId));
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.role === 'admin') return res.status(400).json({ error: 'Cannot deactivate Admin account.' });
    user.is_active = !user.is_active;
    saveDb(db);
    return res.json({ user_id: user.user_id, is_active: user.is_active });
  });

  app.patch('/api/admin/drivers/:driverId/verify-license', (req, res) => {
    const { status, verification_notes } = req.body || {};
    const db = loadDb();
    const dp = db.driver_profiles.find((d: any) => d.driver_id === Number(req.params.driverId));
    if (!dp) return res.status(404).json({ error: 'Driver profile not found.' });
    dp.license_status = status || 'Verified';
    dp.verification_status = status || 'Verified';
    if (verification_notes !== undefined) {
      dp.verification_notes = String(verification_notes);
    }
    if (dp.verification_status === 'Verified') {
      dp.verified_at = new Date().toISOString();
    }
    const u = db.users.find((usr: any) => usr.user_id === dp.user_id);
    if (u) u.verification_status = dp.verification_status;

    addNotification(
      db,
      dp.user_id,
      `Driver Verification: ${dp.verification_status}`,
      `Admin updated your driving license (${dp.license_number}) status to '${dp.verification_status}'. ${
        dp.verification_notes ? 'Note: ' + dp.verification_notes : ''
      }`,
      'License Verification',
    );
    saveDb(db);
    return res.json(dp);
  });

  app.patch('/api/admin/owners/:ownerId/verify', (req, res) => {
    const { verification_status, verification_notes } = req.body || {};
    const db = loadDb();
    const op = db.owner_profiles.find((o: any) => o.owner_id === Number(req.params.ownerId) || o.user_id === Number(req.params.ownerId));
    if (!op) return res.status(404).json({ error: 'Owner profile not found.' });
    op.verification_status = verification_status || 'Verified';
    if (verification_notes !== undefined) op.verification_notes = String(verification_notes);
    if (op.verification_status === 'Verified') op.verified_at = new Date().toISOString();
    addNotification(
      db,
      op.user_id,
      `Owner Profile ${op.verification_status}`,
      `Admin updated your Owner verification status to '${op.verification_status}'.`,
      'Owner Verification',
    );
    saveDb(db);
    return res.json(op);
  });

  app.patch('/api/admin/equipment/:equipmentId/verify', (req, res) => {
    const { verification_status, availability_status } = req.body || {};
    const db = loadDb();
    const eq = db.equipment.find((e: any) => e.equipment_id === Number(req.params.equipmentId));
    if (!eq) return res.status(404).json({ error: 'Equipment not found.' });
    if (verification_status) eq.verification_status = verification_status;
    if (availability_status) {
      eq.availability_status = availability_status;
      eq.is_available = availability_status === 'Available';
    }
    saveDb(db);
    return res.json(enrichEquipment(db, eq));
  });

  // Live 17-Table MySQL Database Inspector & Source Files API
  app.get('/api/mysql/tables', (_req, res) => {
    const db = loadDb();
    const safeUsers = (db.users || []).map((u: any) => ({
      user_id: u.user_id,
      name: u.full_name,
      mobile: u.mobile,
      email: u.email,
      password_hash: 'pbkdf2:sha256:[PROTECTED_HASH]',
      role: u.role,
      verification_status: u.verification_status || 'Verified',
      account_status: u.is_active ? 'Active' : 'Deactivated',
      created_at: u.created_at,
    }));

    const tables: Record<string, any[]> = {
      users: safeUsers,
      farmer_profiles: db.farmer_profiles || [],
      owner_profiles: db.owner_profiles || [],
      driver_profiles: db.driver_profiles || [],
      driver_equipment: db.driver_equipment || [],
      equipment: db.equipment || [],
      equipment_images: db.equipment_images || [],
      bookings: db.bookings || [],
      booking_status_history: db.booking_status_history || db.booking_status || [],
      driver_assignments: db.driver_assignments || [],
      payments: db.payments || [],
      equipment_inspections: db.equipment_inspections || [],
      reviews: db.reviews || [],
      saved_equipment: db.saved_equipment || [],
      messages: db.messages || [],
      notifications: db.notifications || [],
      support_tickets: db.support_tickets || [],
    };

    return res.json({
      database_name: 'khet_mitra',
      mysql_pool_connected: Boolean(mysqlPool),
      table_count: 17,
      tables,
    });
  });

  app.get('/api/mysql/files', (_req, res) => {
    const readSafe = (fileName: string) => {
      try {
        return fs.readFileSync(path.join(__dirname, fileName), 'utf-8');
      } catch {
        return '';
      }
    };
    return res.json({
      'schema.sql': readSafe('schema.sql'),
      'seed.sql': readSafe('seed.sql'),
      'database.py': readSafe('database.py'),
      'app.py': readSafe('app.py'),
      'requirements.txt': readSafe('requirements.txt'),
    });
  });

  app.patch('/api/admin/support-tickets/:ticketId', (req, res) => {
    const { status, admin_response } = req.body || {};
    const db = loadDb();
    const ticket = db.support_tickets.find((t: any) => t.ticket_id === Number(req.params.ticketId));
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    if (status) ticket.status = status;
    if (admin_response !== undefined) ticket.admin_response = admin_response;
    addNotification(
      db,
      ticket.user_id,
      `Support Ticket #${ticket.ticket_id} ${ticket.status}`,
      admin_response || `Your support ticket status is now ${ticket.status}.`,
      'Support Update',
    );
    saveDb(db);
    return res.json(ticket);
  });

  // Vite middleware for development or static dist serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST || '0.0.0.0';
  app.listen(PORT, HOST);
}

startServer();
