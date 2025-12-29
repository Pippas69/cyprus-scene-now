// Comprehensive type definitions for the application
// This file eliminates all 'any' types across the codebase

export interface Event {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  location: string;
  cover_image_url: string | null;
  category: string[];
  price_tier: 'free' | 'low' | 'medium' | 'high';
  min_age_hint: number | null;
  accepts_reservations: boolean | null;
  max_reservations: number | null;
  requires_approval: boolean | null;
  seating_options: string[] | null;
  tags: string[] | null;
  business_id: string;
  created_at: string;
  updated_at: string;
  business?: Business;
  businesses?: Business;
  // Enhanced event fields
  performers: string[] | null;
  dress_code: string | null;
  parking_info: string | null;
  accessibility_info: string[] | null;
  external_ticket_url: string | null;
  gallery_urls: string[] | null;
  venue_name: string | null;
  is_indoor: boolean | null;
}

export interface Business {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string;
  category: string[];
  verified: boolean | null;
  verified_at: string | null;
  verification_notes: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  geo?: unknown;
}

export interface Reservation {
  id: string;
  event_id: string;
  user_id: string;
  reservation_name: string;
  party_size: number;
  seating_preference: string | null;
  preferred_time: string | null;
  phone_number: string | null;
  special_requests: string | null;
  business_notes: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  confirmation_code: string | null;
  qr_code_token: string | null;
  created_at: string;
  updated_at: string;
  events?: Event;
  event?: Event;
}

export interface RSVP {
  id: string;
  event_id: string;
  user_id: string;
  status: 'interested' | 'going';
  notes: string | null;
  created_at: string;
  event?: Event;
  events?: Event;
}

export interface Profile {
  id: string;
  user_id: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  city: string | null;
  town: string | null;
  age: number | null;
  dob_month: number | null;
  dob_year: number | null;
  interests: string[] | null;
  preferences: string[] | null;
  role: 'user' | 'business' | 'admin';
  is_admin: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  default_city: string | null;
  theme_preference: string | null;
  profile_visibility: string | null;
  email_notifications_enabled: boolean | null;
  notification_new_events: boolean | null;
  notification_event_reminders: boolean | null;
  notification_rsvp_updates: boolean | null;
  notification_business_updates: boolean | null;
  notification_reservations: boolean | null;
  notification_ticket_sales: boolean | null;
  notification_daily_sales_summary: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Discount {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  percent_off: number | null;
  start_at: string;
  end_at: string;
  terms: string | null;
  active: boolean | null;
  qr_code_token: string;
  created_at: string;
  businesses?: Business;
}
