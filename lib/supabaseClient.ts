import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase unificado del ecosistema StarSeed OS.
 * Proyecto activo: jhgvhkypqadfdkkqoxta (migro desde pqzdpmedcsgcedkvndzl / nxstilnyidvkqeosofuh).
 * Descubrimiento dinamico mediante StarSeed Link (/api/vinculo/config) tolerante a modo 100% offline.
 */
const PROYECTO_ACTIVO = {
  url: 'https://jhgvhkypqadfdkkqoxta.supabase.co',
  anonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoZ3Zoa3lwcWFkZmRra3FveHRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2NDUzNTcsImV4cCI6MjEwNjIyMTM1N30.egttZeqJm7quC962Hk5Lq_nInGmsCml6n0G37N6y4V0',
};

const PROYECTOS_RETIRADOS = ['pqzdpmedcsgcedkvndzl', 'nxstilnyidvkqeosofuh'];
export const STARSEED_VINCULO_URL = 'https://starseed-os.vercel.app/api/vinculo/config';
export const STARSEED_OS_OFFICIAL_URL = 'https://starseed-os.vercel.app/login';
const CLAVE_VINCULO = 'starseed.vinculo.config.v1';

function configGuardada(): { url: string; anonKey: string } | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const j = JSON.parse(window.localStorage.getItem(CLAVE_VINCULO) || 'null');
    if (
      j &&
      typeof j.url === 'string' &&
      /^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(j.url) &&
      typeof j.anonKey === 'string' &&
      j.anonKey.startsWith('eyJ')
    ) {
      return j;
    }
  } catch {
    /* ignore storage errors */
  }
  return null;
}

function configInicial(): { url: string; anonKey: string } {
  const guardada = configGuardada();
  if (guardada && !PROYECTOS_RETIRADOS.some((r) => guardada.url.includes(r))) {
    return guardada;
  }
  const envUrl = ((import.meta as any).env?.VITE_SUPABASE_URL as string | undefined) || '';
  const envKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined) || '';
  if (envUrl && envKey && !PROYECTOS_RETIRADOS.some((r) => envUrl.includes(r))) {
    return { url: envUrl, anonKey: envKey };
  }
  return PROYECTO_ACTIVO;
}

const CONFIG = configInicial();
export const STARSEED_SUPABASE_URL = CONFIG.url;
export const STARSEED_SUPABASE_ANON_KEY = CONFIG.anonKey;

// Descubrimiento no bloqueante cuando hay red; en offline no realiza peticiones
if (
  typeof window !== 'undefined' &&
  typeof fetch === 'function' &&
  (typeof navigator === 'undefined' || navigator.onLine)
) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 3000) : null;
  fetch(STARSEED_VINCULO_URL, {
    cache: 'no-store',
    signal: ctrl?.signal,
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      const sb = j && j.supabase;
      if (
        sb &&
        typeof sb.url === 'string' &&
        typeof sb.anonKey === 'string' &&
        !PROYECTOS_RETIRADOS.some((r) => sb.url.includes(r)) &&
        sb.url !== STARSEED_SUPABASE_URL
      ) {
        window.localStorage.setItem(CLAVE_VINCULO, JSON.stringify({ url: sb.url, anonKey: sb.anonKey }));
      }
    })
    .catch(() => {
      /* sin red o timeout: seguimos operando de manera autonoma */
    })
    .finally(() => {
      if (timer) clearTimeout(timer);
    });
}

// Una sola instancia compartida para todo Audiomorphic + StarSeed OS (storageKey: 'starseed.auth')
export const supabase = createClient(STARSEED_SUPABASE_URL, STARSEED_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'starseed.auth',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
