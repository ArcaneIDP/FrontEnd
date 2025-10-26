import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get Supabase URL and Key from environment variables
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Create Supabase client only if credentials are provided
let supabase: SupabaseClient | null = null;

// Only create client if we have valid, non-empty strings
if (supabaseUrl.length > 0 && supabaseAnonKey.length > 0 && supabaseUrl !== 'undefined' && supabaseAnonKey !== 'undefined') {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    supabase = null;
  }
} else {
  console.warn('Supabase credentials not found. Using mock data. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export { supabase };

// Database types/interfaces
export interface TokenRequest {
  id: string;
  ts: string;
  agent: string;
  ttl_sec: number;
  decision: string;
  reason: string;
  ip: string;
  token: any; // JSON column
  created_at?: string;
}

export interface SigninAttempt {
  id: string;
  ts: string;
  subject: string;
  method: string;
  status: string;
  reason: string;
  created_at?: string;
}

export interface Agent {
  id: string;
  name: string;
  created_at?: string;
}

export interface Usage {
  resource: string;
  calls: number;
}

export interface Traffic {
  time_label: string;
  granted: number;
  denied: number;
}

