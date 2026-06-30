import { useEffect, useState, useCallback } from 'react';

/**
 * useStarSeedIdentity
 * ---------------------------------------------------------------------------
 * Defensive, dependency-free detection of a "StarSeed OS" identity/session.
 *
 * A previous task was meant to add a unified StarSeed login (sin Aurora). That
 * code is NOT present at this revision, so instead of hard-coupling to it we
 * detect a StarSeed session *if it exists* by probing the conventions such an
 * integration would most likely use:
 *
 *   1. localStorage keys commonly used by a StarSeed session bridge.
 *   2. A URL parameter signalling the user arrived from the StarSeed OS
 *      (e.g. ?source=starseed, ?from=starseed, ?starseed=1).
 *   3. A window-level global injected by a host shell (window.StarSeed).
 *
 * If any of these are present we treat the user as logged-in via StarSeed and
 * surface the free plan. If none are present we degrade gracefully to a
 * logged-out state. Detection is best-effort and never throws.
 */

export interface StarSeedSession {
  id?: string;
  name?: string;
  email?: string;
  plan?: string;
  [key: string]: unknown;
}

export interface StarSeedIdentity {
  /** True when a StarSeed session (or OS hand-off) was detected. */
  isLoggedIn: boolean;
  /** The raw session object, if any could be parsed. */
  session: StarSeedSession | null;
  /** Friendly display name for the UI (falls back to email or a default). */
  displayName: string | null;
  /** True when the user arrived from the StarSeed OS via URL/global handoff. */
  cameFromOS: boolean;
  /** Manually mark this device as linked to StarSeed (persisted). */
  linkStarSeed: (session?: StarSeedSession) => void;
  /** Remove any local StarSeed link (does not touch external sessions). */
  unlinkStarSeed: () => void;
  /** Re-run detection on demand. */
  refresh: () => void;
}

// Keys a StarSeed bridge is likely to write a session under.
const SESSION_KEYS = [
  'starseed.session',
  'starseed.user',
  'star.seed.session',
  'starseedSession',
  'starseed-os.session',
  'starseed.os.session',
  'ss.session',
];

// Our own persisted "this device is linked to StarSeed" marker.
const LOCAL_LINK_KEY = 'audiomorphic.starseed.linked.v1';

const safeGet = (key: string): string | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeParse = (raw: string | null): StarSeedSession | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Some bridges store a bare token/string instead of JSON.
  if (trimmed[0] !== '{' && trimmed[0] !== '[') {
    return { id: trimmed, name: undefined };
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') return parsed as StarSeedSession;
  } catch {
    /* ignore malformed JSON */
  }
  return null;
};

const detectFromUrl = (): boolean => {
  try {
    if (typeof window === 'undefined' || !window.location) return false;
    const params = new URLSearchParams(window.location.search);
    const source = (params.get('source') || params.get('from') || '').toLowerCase();
    if (source.includes('starseed') || source.includes('star-seed')) return true;
    const flag = (params.get('starseed') || params.get('star_seed') || '').toLowerCase();
    if (flag === '1' || flag === 'true' || flag === 'yes') return true;
    // Hash-based handoff (#starseed)
    if ((window.location.hash || '').toLowerCase().includes('starseed')) return true;
  } catch {
    /* ignore */
  }
  return false;
};

const detectGlobal = (): StarSeedSession | null => {
  try {
    const w = window as any;
    const g = w?.StarSeed || w?.starSeed || w?.STARSEED;
    if (!g) return null;
    if (g.session && typeof g.session === 'object') return g.session as StarSeedSession;
    if (g.user && typeof g.user === 'object') return g.user as StarSeedSession;
    if (typeof g === 'object') return g as StarSeedSession;
  } catch {
    /* ignore */
  }
  return null;
};

const resolveDisplayName = (s: StarSeedSession | null): string | null => {
  if (!s) return null;
  const candidate =
    (typeof s.name === 'string' && s.name) ||
    (typeof (s as any).displayName === 'string' && (s as any).displayName) ||
    (typeof (s as any).username === 'string' && (s as any).username) ||
    (typeof s.email === 'string' && s.email) ||
    null;
  return candidate || 'Cuenta StarSeed';
};

const detect = (): { session: StarSeedSession | null; cameFromOS: boolean } => {
  const cameFromOS = detectFromUrl();

  // 1. Window global injected by a host shell.
  let session = detectGlobal();

  // 2. Known localStorage session keys.
  if (!session) {
    for (const key of SESSION_KEYS) {
      const parsed = safeParse(safeGet(key));
      if (parsed) {
        session = parsed;
        break;
      }
    }
  }

  // 3. Our own persisted link marker (set when arriving from OS or manually).
  if (!session) {
    const linked = safeParse(safeGet(LOCAL_LINK_KEY));
    if (linked) session = linked;
  }

  // If we arrived from the OS but have no concrete session object, synthesize
  // a minimal one so the free plan can still be surfaced.
  if (!session && cameFromOS) {
    session = { id: 'starseed-os', name: 'Cuenta StarSeed' };
  }

  return { session, cameFromOS };
};

export const useStarSeedIdentity = (): StarSeedIdentity => {
  const [session, setSession] = useState<StarSeedSession | null>(null);
  const [cameFromOS, setCameFromOS] = useState(false);

  const refresh = useCallback(() => {
    try {
      const result = detect();
      setSession(result.session);
      setCameFromOS(result.cameFromOS);
      // Persist a link if we detected an OS hand-off so it survives reloads
      // even after the URL params are gone.
      if (result.cameFromOS && result.session) {
        try {
          window.localStorage.setItem(LOCAL_LINK_KEY, JSON.stringify(result.session));
        } catch {
          /* ignore quota/privacy errors */
        }
      }
    } catch {
      setSession(null);
      setCameFromOS(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Re-detect if another tab/app updates the session.
    const onStorage = () => refresh();
    try {
      window.addEventListener('storage', onStorage);
    } catch {
      /* ignore */
    }
    return () => {
      try {
        window.removeEventListener('storage', onStorage);
      } catch {
        /* ignore */
      }
    };
  }, [refresh]);

  const linkStarSeed = useCallback(
    (incoming?: StarSeedSession) => {
      const next: StarSeedSession = incoming || { id: 'starseed-os', name: 'Cuenta StarSeed' };
      try {
        window.localStorage.setItem(LOCAL_LINK_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      setSession(next);
    },
    []
  );

  const unlinkStarSeed = useCallback(() => {
    try {
      window.localStorage.removeItem(LOCAL_LINK_KEY);
    } catch {
      /* ignore */
    }
    // Re-detect: an external session key may still keep the user logged in.
    refresh();
  }, [refresh]);

  return {
    isLoggedIn: !!session,
    session,
    displayName: resolveDisplayName(session),
    cameFromOS,
    linkStarSeed,
    unlinkStarSeed,
    refresh,
  };
};

export default useStarSeedIdentity;
