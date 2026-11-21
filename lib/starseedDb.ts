/**
 * starseedDb.ts
 * ---------------------------------------------------------------------------
 * Re-exporta el cliente Supabase compartido del ecosistema StarSeed OS
 * junto con las definiciones de tipos para perfiles, tarjetas 3D y presets.
 *
 * Principios:
 *  - LOCAL ES LA VERDAD: la aplicacion opera al 100% de manera autonoma sin
 *    necesidad de conexion previa ni dependencias externas.
 *  - NUBE SOBERANA: cuando hay sesion e internet, sincroniza en tiempo real
 *    con los cerebros, folders y neuronas de StarSeed OS.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase, STARSEED_SUPABASE_URL, STARSEED_SUPABASE_ANON_KEY } from './supabaseClient';

export { STARSEED_SUPABASE_URL, STARSEED_SUPABASE_ANON_KEY };

export function getStarSeedDb(): SupabaseClient {
  return supabase;
}

export interface Preset {
  id: string;
  name: string;
  description?: string;
  params: string; // JSON string
  createdAt: number;
  updatedAt?: number;
  folder?: string;
  category?: string;
}

export interface StarSeedProfile {
  id: string;
  user_id?: string;
  handle?: string;
  display_name?: string;
  avatar_url?: string;
  cover_url?: string;
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
  folderPath: string;
  cardTheme: 'gold' | 'iridescent' | 'holographic' | 'celestial';
  message?: string;
}

export interface AudiomorphicPresetRecord {
  id: string;
  title: string;
  description: string;
  category: 'genesis' | 'harmonic' | 'drift' | 'quantum' | 'community' | 'custom' | 'rhythmic' | 'sacred' | 'essentials';
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
