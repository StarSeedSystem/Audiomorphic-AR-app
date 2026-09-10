/**
 * starseedDb.ts
 * ---------------------------------------------------------------------------
 * Conexión soberana con la nueva base de datos de StarSeed OS.
 * Proyecto activo (migrado el 2026-08-30): pqzdpmedcsgcedkvndzl
 * URL: https://pqzdpmedcsgcedkvndzl.supabase.co
 *
 * Principios:
 *  - LOCAL ES LA VERDAD: Tolerante a fallos sin conexión; el almacenamiento local
 *    (localStorage) siempre prevalece y mantiene al usuario operativo.
 *  - NUBE SOBERANA: Sincronización bidireccional con las tablas `user_settings`,
 *    `entity_state` y perfiles de `os_profiles`.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const STARSEED_SUPABASE_URL = 'https://pqzdpmedcsgcedkvndzl.supabase.co';
export const STARSEED_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxemRwbWVkY3NnY2Vka3ZuZHpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMTk1MTIsImV4cCI6MjEwMzY5NTUxMn0.PSICGp-7LczYnrcv2oCDpozR3Khfbxe6vADUVNuvC-k';

let clientInstance: SupabaseClient | null = null;

export function getStarSeedDb(): SupabaseClient {
  if (!clientInstance) {
    clientInstance = createClient(STARSEED_SUPABASE_URL, STARSEED_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        storageKey: 'starseed-auth-token-v2',
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return clientInstance;
}

export interface StarSeedProfile {
  id: string;
  user_id?: string;
  handle?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  updated_at?: string;
}

export interface ThankYouCardRecord {
  id: string;
  userId?: string;
  donorName: string;
  tierId: string;
  tierName: string;
  amount: string;
  issuedAt: string;
  folderPath: string; // Ubicación en biblioteca, e.g. "Biblioteca/Donaciones/Tarjetas"
  cardTheme: 'gold' | 'iridescent' | 'holographic' | 'celestial';
  message?: string;
}

export interface AudiomorphicPresetRecord {
  id: string;
  title: string;
  description: string;
  category: 'genesis' | 'harmonic' | 'drift' | 'quantum' | 'community' | 'custom';
  author: {
    id?: string;
    name: string;
    handle?: string;
  };
  isOfficial: boolean;
  isPublic: boolean;
  orderIndex: number;
  folderPath: string;
  params: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
