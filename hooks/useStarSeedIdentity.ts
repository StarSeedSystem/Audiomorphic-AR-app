import { useEffect, useState, useCallback } from 'react';
import { getStarSeedDb, StarSeedProfile } from '../lib/starseedDb';

export interface StarSeedSession {
  id?: string;
  name?: string;
  email?: string;
  handle?: string;
  avatarUrl?: string;
  plan?: string;
  [key: string]: unknown;
}

export interface StarSeedIdentity {
  /** True when a StarSeed session (or OS hand-off) was detected. */
  isLoggedIn: boolean;
  /** The raw session object, if any could be parsed. */
  session: StarSeedSession | null;
  /** Friendly display name for the UI (falls back to handle, email, or a default). */
  displayName: string | null;
  /** Sovereign handle (e.g. @alex) */
  handle: string | null;
  /** Avatar URL if present */
  avatarUrl: string | null;
  /** True when the user arrived from the StarSeed OS via URL/global handoff. */
  cameFromOS: boolean;
  /** Manually mark this device as linked to StarSeed (persisted). */
  linkStarSeed: (session?: StarSeedSession) => void;
  /** Remove any local StarSeed link (does not touch external sessions). */
  unlinkStarSeed: () => void;
  /** Re-run detection on demand. */
  refresh: () => void;
  /** Supabase Auth: Sign in with email and password */
  loginWithEmail: (email: string, pass: string) => Promise<{ ok: boolean; error?: string }>;
  /** Supabase Auth: Sign up with email and password */
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<{ ok: boolean; error?: string }>;
  /** Supabase Auth: Sign out */
  logout: () => Promise<void>;
}

// Keys a StarSeed bridge is likely to write a session under.
const SESSION_KEYS = [
  'sb-pqzdpmedcsgcedkvndzl-auth-token',
  'starseed-auth-token-v2',
  'starseed.session',
  'starseed.user',
  'star.seed.session',
  'starseedSession',
  'starseed-os.session',
  'starseed.os.session',
  'ss.session',
];

// Our own persisted "this device is linked to StarSeed" marker.
const LOCAL_LINK_KEY = 'audiomorphic.starseed.linked.v2';

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
  if (trimmed[0] !== '{' && trimmed[0] !== '[') {
    return { id: trimmed, name: undefined };
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      // If it's a Supabase session token object
      if (parsed.user && typeof parsed.user === 'object') {
        const u = parsed.user;
        return {
          id: u.id,
          email: u.email,
          name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0],
          handle: u.user_metadata?.handle || u.user_metadata?.username,
          avatarUrl: u.user_metadata?.avatar_url,
        };
      }
      return parsed as StarSeedSession;
    }
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
    (typeof s.handle === 'string' && s.handle) ||
    (typeof s.email === 'string' && s.email?.split('@')[0]) ||
    null;
  return candidate || 'Identidad Soberana';
};

export const useStarSeedIdentity = (): StarSeedIdentity => {
  const [session, setSession] = useState<StarSeedSession | null>(null);
  const [cameFromOS, setCameFromOS] = useState(false);
  const [profile, setProfile] = useState<StarSeedProfile | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const db = getStarSeedDb();
      const { data } = await db
        .from('os_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        setProfile(data as StarSeedProfile);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const refresh = useCallback(() => {
    try {
      const fromUrl = detectFromUrl();
      let detectedSession = detectGlobal();

      if (!detectedSession) {
        for (const key of SESSION_KEYS) {
          const parsed = safeParse(safeGet(key));
          if (parsed) {
            detectedSession = parsed;
            break;
          }
        }
      }

      if (!detectedSession) {
        const linked = safeParse(safeGet(LOCAL_LINK_KEY));
        if (linked) detectedSession = linked;
      }

      if (!detectedSession && fromUrl) {
        detectedSession = { id: 'starseed-os', name: 'Identidad StarSeed OS' };
      }

      setSession(detectedSession);
      setCameFromOS(fromUrl);

      if (detectedSession?.id && detectedSession.id !== 'starseed-os') {
        fetchProfile(detectedSession.id);
      }
    } catch {
      setSession(null);
      setCameFromOS(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    refresh();

    // Supabase auth state listener
    try {
      const db = getStarSeedDb();
      const { data: authSub } = db.auth.onAuthStateChange((event, s) => {
        if (s?.user) {
          const sObj: StarSeedSession = {
            id: s.user.id,
            email: s.user.email,
            name: s.user.user_metadata?.full_name || s.user.email?.split('@')[0],
            handle: s.user.user_metadata?.handle,
            avatarUrl: s.user.user_metadata?.avatar_url,
          };
          setSession(sObj);
          fetchProfile(s.user.id);
        } else if (event === 'SIGNED_OUT') {
          refresh();
        }
      });

      return () => {
        authSub.subscription.unsubscribe();
      };
    } catch {
      /* ignore */
    }
  }, [refresh, fetchProfile]);

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
    refresh();
  }, [refresh]);

  const loginWithEmail = useCallback(async (email: string, pass: string) => {
    try {
      const db = getStarSeedDb();
      const { data, error } = await db.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });
      if (error) return { ok: false, error: error.message };
      if (data.user) {
        const sObj: StarSeedSession = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
        };
        linkStarSeed(sObj);
        return { ok: true };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Error al iniciar sesión' };
    }
  }, [linkStarSeed]);

  const signUpWithEmail = useCallback(async (email: string, pass: string, name?: string) => {
    try {
      const db = getStarSeedDb();
      const { data, error } = await db.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          data: {
            full_name: name || email.split('@')[0],
          },
        },
      });
      if (error) return { ok: false, error: error.message };
      if (data.user) {
        const sObj: StarSeedSession = {
          id: data.user.id,
          email: data.user.email,
          name: name || data.user.email?.split('@')[0],
        };
        linkStarSeed(sObj);
        return { ok: true };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Error al registrarse' };
    }
  }, [linkStarSeed]);

  const logout = useCallback(async () => {
    try {
      const db = getStarSeedDb();
      await db.auth.signOut();
    } catch {
      /* ignore */
    }
    unlinkStarSeed();
  }, [unlinkStarSeed]);

  return {
    isLoggedIn: !!session,
    session,
    displayName: profile?.display_name || resolveDisplayName(session),
    handle: profile?.handle || (session?.handle as string) || (session?.name ? `@${session.name.toLowerCase().replace(/\s+/g, '')}` : null),
    avatarUrl: profile?.avatar_url || (session?.avatarUrl as string) || null,
    cameFromOS,
    linkStarSeed,
    unlinkStarSeed,
    refresh,
    loginWithEmail,
    signUpWithEmail,
    logout,
  };
};

export default useStarSeedIdentity;
