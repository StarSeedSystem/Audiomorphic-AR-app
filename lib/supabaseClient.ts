import { createClient } from '@supabase/supabase-js';

// Base de datos viva del ecosistema StarSeed OS (migrada a pqzdpmedcsgcedkvndzl el 2026-08-30)
const URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://pqzdpmedcsgcedkvndzl.supabase.co';
const KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxemRwbWVkY3NnY2Vka3ZuZHpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMTk1MTIsImV4cCI6MjEwMzY5NTUxMn0.PSICGp-7LczYnrcv2oCDpozR3Khfbxe6vADUVNuvC-k';

// Una sola cuenta para todo StarSeed: mismo proyecto, storageKey compartido.
export const supabase = createClient(URL, KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'starseed.auth' },
});
