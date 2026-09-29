export type UserRole = 'farmer' | 'owner' | 'driver' | 'admin';

export type EquipmentCategory =
  | 'Tractor'
  | 'Harvester'
  | 'JCB'
  | 'Rotavator'
  | 'Seeder'
  | 'Thresher'
  | 'Cultivator'
  | 'Sprayer';

export interface DriverSkill {
  skill_id?: number;
  driver_id?: number;
  user_id?: number;
  category: EquipmentCategory | 'Other';
  experience_years: number;
}

export interface UserProfile {
  user_id: number;
  full_name: string;
  mobile: string;
  email: string;
  role: UserRole;
  address: string;
  area_city: string;
  profile_photo?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  is_demo?: boolean;
  created_at?: string;
  farmer_profile?: {
    preferred_language?: 'en' | 'hi';
    farm_size_acres?: number | null;
    primary_crops?: string;
  };
  saved_equipment_ids?: number[];
  reviews_given?: ReviewRecord[];
  owner_profile?: {
    owner_id: number;
    business_name: string;
    experience_years?: number;
    demo_badge?: string;
    fictional_disclaimer?: string;
    accepts_upi: boolean;
    accepts_bank_transfer: boolean;
    accepts_cash: boolean;
    upi_id?: string;
    bank_account_note?: string;
    total_revenue: number;
    average_rating: number;
  };
  equipment_count?: number;
  total_bookings?: number;
  driver_profile?: {
    driver_id: number;
    service_area: string;
    license_number: string;
    license_photo: string;
    license_status: 'Incomplete' | 'Pending' | 'Pending Verification' | 'Verified' | 'Rejected' | 'Correction Required';
    verification_status?: 'Incomplete' | 'Pending Verification' | 'Verified' | 'Rejected' | 'Correction Required';
    verification_notes?: string;
    total_experience_years: number;
    daily_wage_rate: number;
    is_online: boolean;
    current_location: string;
    total_earnings: number;
    average_rating: number;
  };
  skills?: DriverSkill[];
  reviews?: ReviewRecord[];
}

export interface EquipmentItem {
  equipment_id: number;
  owner_id: number;
  owner_name: string;
  owner_mobile: string;
  owner_profile_photo?: string;
  owner_location?: string;
  owner_experience_years?: number;
  owner_is_demo?: boolean;
  owner_badge?: string;
  listing_badge?: string;
  business_name?: string;
  equipment_name: string;
  category: EquipmentCategory;
  brand: string;
  model: string;
  manufacturing_year: number;
  used_condition_note?: string;
  experience_years?: number;
  image_url: string;
  description: string;
  price_per_hour: number;
  price_per_day: number;
  is_available: boolean;
  location: string;
  latitude: number;
  longitude: number;
  distance_km?: number;
  operator_available: boolean;
  operator_charge_per_day: number;
  required_operator_type: string;
  terms_and_conditions: string;
  average_rating: number;
  review_count: number;
  rating_label?: string;
  is_demo?: boolean;
  accepts_upi?: boolean;
  accepts_bank_transfer?: boolean;
  accepts_cash?: boolean;
  upi_id?: string;
  bank_account_note?: string;
  reviews?: ReviewRecord[];
}

export interface InspectionRecord {
  inspection_id: number;
  booking_id: number;
  owner_id: number;
  equipment_condition: 'Excellent' | 'Good' | 'Fair' | 'Damaged';
  has_damage: boolean;
  damage_description: string;
  additional_notes: string;
  inspection_photo?: string;
  additional_charges: number;
  inspected_at: string;
}

export interface ReviewRecord {
  review_id: number;
  booking_id: number;
  reviewer_id: number;
  equipment_id: number;
  driver_id?: number | null;
  equipment_rating: number;
  driver_rating?: number | null;
  reason_category: string;
  comment: string;
  created_at: string;
}

export interface PaymentRecord {
  payment_id: number;
  booking_id: number;
  payer_id: number;
  receiver_id: number;
  payment_stage: 'Advance_10_Percent' | 'Remaining_90_Percent';
  payment_method: 'UPI' | 'Bank Transfer' | 'Cash';
  amount: number;
  transaction_ref: string;
  status: string;
  is_demo_payment: boolean;
  paid_at: string;
}

export interface BookingRecord {
  booking_id: number;
  farmer_id: number;
  farmer_name: string;
  farmer_mobile: string;
  equipment_id: number;
  equipment_name: string;
  equipment_category: EquipmentCategory;
  equipment_image: string;
  owner_id: number;
  owner_name: string;
  owner_mobile: string;
  driver_id: number | null;
  driver_name: string | null;
  driver_mobile: string | null;
  start_date: string;
  end_date: string;
  duration_type: 'hours' | 'days';
  duration_value: number;
  work_location: string;
  operator_required: boolean;
  equipment_cost: number;
  operator_cost: number;
  additional_damage_charges: number;
  total_price: number;
  advance_amount: number;
  remaining_amount: number;
  payment_status: 'Pending' | 'Advance Paid' | 'Remaining Pending' | 'Fully Paid' | 'Refunded';
  booking_status:
    | 'Pending'
    | 'Accepted'
    | 'Driver Assigned'
    | 'Active'
    | 'Returned'
    | 'Inspected'
    | 'Completed'
    | 'Cancelled';
  special_instructions: string;
  created_at: string;
  owner_payment_methods: {
    upi: boolean;
    bank_transfer: boolean;
    cash: boolean;
    upi_id: string;
    bank_note: string;
  };
  inspection: InspectionRecord | null;
  review: ReviewRecord | null;
  driver_assignment: {
    assignment_id: number;
    booking_id: number;
    driver_id: number;
    job_amount: number;
    job_status: 'Requested' | 'Accepted' | 'Rejected' | 'On the Way' | 'Started' | 'Completed';
    instructions: string;
  } | null;
  payments: PaymentRecord[];
}

export interface MatchedDriver {
  user_id: number;
  driver_id: number;
  full_name: string;
  mobile: string;
  area_city: string;
  service_area: string;
  current_location: string;
  license_number: string;
  license_status: 'Pending' | 'Verified' | 'Rejected';
  total_experience_years: number;
  daily_wage_rate: number;
  is_online: boolean;
  average_rating: number;
  skills: DriverSkill[];
  operates_requested_category: boolean;
  category_experience_years: number;
  compatibility_score: number;
}

export interface NotificationItem {
  notification_id: number;
  user_id: number;
  title: string;
  message: string;
  event_type: string;
  is_read: boolean;
  created_at: string;
}

export interface ChatMessage {
  message_id: number;
  booking_id: number;
  sender_id: number;
  receiver_id: number;
  sender_name: string;
  message_text: string;
  sent_at: string;
}

export interface SupportTicket {
  ticket_id: number;
  user_id: number;
  user_name?: string;
  user_role?: string;
  category: string;
  subject: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  admin_response: string | null;
  created_at: string;
}

export const EQUIPMENT_CATEGORIES: {
  name: EquipmentCategory;
  nameHi: string;
  startingPriceDay: number;
  startingPriceHour: number;
  image: string;
  subtitle: string;
}[] = [
  {
    name: 'Tractor',
    nameHi: 'ट्रैक्टर (Tractor)',
    startingPriceDay: 1800,
    startingPriceHour: 320,
    image: '/src/assets/images/used_tractor_rajasthan_field_1790613064661.jpg',
    subtitle: 'Older / Used 35 HP – 55 HP Field Tractors',
  },
  {
    name: 'Harvester',
    nameHi: 'हार्वेस्टर (Harvester)',
    startingPriceDay: 7500,
    startingPriceHour: 1350,
    image: '/src/assets/images/used_harvester_thresher_rajasthan_1790613092266.jpg',
    subtitle: 'Used Multi-Crop Combine Harvesters (Wheat, Mustard, Soybean)',
  },
  {
    name: 'JCB',
    nameHi: 'जेसीबी (JCB Backhoe)',
    startingPriceDay: 5200,
    startingPriceHour: 850,
    image: '/src/assets/images/equip_jcb_1790528077399.jpg',
    subtitle: 'Used Farm Pond Excavation, Trenching & Bund Leveling',
  },
  {
    name: 'Rotavator',
    nameHi: 'रोटावेटर (Rotavator)',
    startingPriceDay: 1100,
    startingPriceHour: 210,
    image: '/src/assets/images/older_blue_tractor_tilling_1790613080106.jpg',
    subtitle: 'Used 6ft – 7ft Rotary Tillers with Tractor',
  },
  {
    name: 'Seeder',
    nameHi: 'सीडर (Seed Drill)',
    startingPriceDay: 1200,
    startingPriceHour: 230,
    image: '/src/assets/images/equip_rotavator_1790528089602.jpg',
    subtitle: 'Used Seed-Cum-Fertilizer Drills for Mustard, Wheat & Gram',
  },
  {
    name: 'Thresher',
    nameHi: 'थ्रेशर (Thresher)',
    startingPriceDay: 1600,
    startingPriceHour: 300,
    image: '/src/assets/images/used_harvester_thresher_rajasthan_1790613092266.jpg',
    subtitle: 'Older / Used Hadoti Multi-Crop Grain & Coriander Threshers',
  },
  {
    name: 'Cultivator',
    nameHi: 'कल्टीवेटर (Cultivator)',
    startingPriceDay: 850,
    startingPriceHour: 160,
    image: '/src/assets/images/older_blue_tractor_tilling_1790613080106.jpg',
    subtitle: 'Used 9-Tyne Spring Loaded Field Cultivators',
  },
  {
    name: 'Sprayer',
    nameHi: 'स्प्रेयर (Boom Sprayer)',
    startingPriceDay: 1000,
    startingPriceHour: 190,
    image: '/src/assets/images/used_tractor_rajasthan_field_1790613064661.jpg',
    subtitle: 'Used Tractor-Mounted 500L Crop Sprayers',
  },
];

export const TRANSLATIONS = {
  en: {
    tagline: 'Your Trusted Agriculture Equipment Rental Partner',
    heroDesc:
      'Find verified tractors, combine harvesters, rotavators, seeders, and licensed operators in your district. Transparent two-stage payments (10% advance, 90% after inspection).',
    howItWorks: 'How It Works',
    categories: 'Equipment Categories',
    browseCatalog: 'Equipment Catalog',
    projectDocs: 'Flask & MySQL Code',
    login: 'Login',
    register: 'Register',
    whatEquipmentNeed: 'What equipment do you need?',
    nearbyEquipment: 'Nearby Equipment',
    postRequirement: 'Post Requirement',
    myBookings: 'My Bookings',
    aiTalk: 'AI Talk',
    bookNow: 'Book Now',
    viewDetails: 'View Details',
  },
  hi: {
    tagline: 'आपका विश्वसनीय कृषि उपकरण किराया साथी (Your Trusted Agriculture Equipment Rental Partner)',
    heroDesc:
      'अपने क्षेत्र में सत्यापित ट्रैक्टर, हार्वेस्टर, रोटावेटर, सीडर और कुशल ड्राइवर/ऑपरेटर बुक करें। आसान 10% एडवांस और 90% काम पूरा होने के बाद भुगतान।',
    howItWorks: 'यह कैसे काम करता है',
    categories: 'उपकरण श्रेणियाँ',
    browseCatalog: 'उपकरण सूची',
    projectDocs: 'प्रोजेक्ट कोड (Flask/MySQL)',
    login: 'लॉगिन (Login)',
    register: 'पंजीकरण (Register)',
    whatEquipmentNeed: 'आपको किस कृषि उपकरण की आवश्यकता है?',
    nearbyEquipment: 'आस-पास के उपकरण',
    postRequirement: 'आवश्यकता दर्ज करें',
    myBookings: 'मेरी बुकिंग',
    aiTalk: 'एआई टॉक (AI Talk)',
    bookNow: 'अभी बुक करें',
    viewDetails: 'विवरण देखें',
  },
};
