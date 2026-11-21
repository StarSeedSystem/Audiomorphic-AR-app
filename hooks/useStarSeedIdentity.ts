import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

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
  /** True when a StarSeed session (or OS hand-off) is active. */
  isLoggedIn: boolean;
  /** Unified user reference (aliased cleanly so callers reading identity.user work seamlessly). */
  user: StarSeedSession | null;
  /** The raw session object, if any. */
  session: StarSeedSession | null;
  /** Friendly display name for the UI. */
  displayName: string | null;
  /** Sovereign handle (e.g. @alex) */
  handle: string | null;
  /** Avatar URL if present */
  avatarUrl: string | null;
  /** Address <handle>@star.seed if available */
  starseedAddress: string | null;
  /** True when the user arrived from StarSeed OS via URL/global handoff. */
  cameFromOS: boolean;
  /** Manually mark this device as linked to StarSeed. */
  linkStarSeed: (session?: StarSeedSession) => void;
  /** Remove any local StarSeed link. */
  unlinkStarSeed: () => void;
  /** Re-run detection on demand. */
  refresh: () => void;
  /** StarSeed OS login with email or @handle + password */
  loginWithEmail: (identifier: string, pass: string) => Promise<{ ok: boolean; error?: string }>;
  /** StarSeed OS sign up */
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<{ ok: boolean; error?: string }>;
  /** Sign out */
  logout: () => Promise<void>;
}

const SESSION_KEYS = [
  'audiomorphic.starseed.linked.v2',
  'starseed_sovereign_user',
  'starseed.session',
  'starseed.user',
  'star.seed.session',
  'starseedSession',
  'starseed-os.session',
  'starseed.os.session',
  'ss.session',
];

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
      if (parsed.user && typeof parsed.user === 'object') {
        const u = parsed.user;
        return {
          id: u.id,
          email: u.email,
          name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0],
          handle: u.user_metadata?.handle || u.user_metadata?.username,
          avatarUrl: u.user_metadata?.avatar_url,
          access_token: parsed.access_token,
          refresh_token: parsed.refresh_token,
        };
      }
      return parsed as StarSeedSession;
    }
  } catch {
    /* ignore */
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
    const g =
      w?.StarSeed ||
      w?.starSeed ||
      w?.STARSEED ||
      w?.__STARSEED_OS__ ||
      w?.parent?.StarSeed ||
      w?.parent?.starSeed;
    if (!g) return null;
    if (g.session && typeof g.session === 'object') return g.session as StarSeedSession;
    if (g.user && typeof g.user === 'object') return g.user as StarSeedSession;
    if (typeof g === 'object') return g as StarSeedSession;
  } catch {
    /* ignore */
  }
  return null;
};

export const useStarSeedIdentity = (): StarSeedIdentity => {
  const {
    user: authUser,
    profile: authProfile,
    loginWithIdentifier,
    signUpWithIdentifier,
    activateSovereignSession,
    logout: authLogout,
  } = useAuth();

  const [fallbackSession, setFallbackSession] = useState<StarSeedSession | null>(null);
  const [cameFromOS, setCameFromOS] = useState(false);

  const refresh = useCallback(() => {
    try {
      const fromUrl = detectFromUrl();
      setCameFromOS(fromUrl);

      let detected = detectGlobal();
      if (!detected) {
        for (const key of SESSION_KEYS) {
          const parsed = safeParse(safeGet(key));
          if (parsed && (parsed.id || parsed.email)) {
            detected = parsed;
            break;
          }
        }
      }
      if (!detected && fromUrl) {
        detected = { id: 'starseed-os', name: 'Identidad StarSeed OS' };
      }
      setFallbackSession(detected);
    } catch {
      setFallbackSession(null);
      setCameFromOS(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onSync = () => refresh();
    window.addEventListener('starseed:session-changed', onSync);
    window.addEventListener('storage', onSync);
    return () => {
      window.removeEventListener('starseed:session-changed', onSync);
      window.removeEventListener('storage', onSync);
    };
  }, [refresh]);

  const activeSession = useMemo<StarSeedSession | null>(() => {
    if (authUser) {
      return {
        id: authUser.id,
        email: authUser.email,
        name:
          authProfile?.displayName ||
          (authUser.user_metadata as any)?.full_name ||
          authUser.email?.split('@')[0] ||
          'Viajero StarSeed',
        handle: authProfile?.handle || (authUser.user_metadata as any)?.handle || undefined,
        avatarUrl: authProfile?.avatarUrl || (authUser.user_metadata as any)?.avatar_url || undefined,
        plan: 'lifetime',
      };
    }
    return fallbackSession;
  }, [authUser, authProfile, fallbackSession]);

  const linkStarSeed = useCallback(
    (incoming?: StarSeedSession) => {
      const next: StarSeedSession = incoming || { id: 'starseed-os', name: 'Cuenta StarSeed' };
      try {
        window.localStorage.setItem(LOCAL_LINK_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      activateSovereignSession(next.email, next.name);
      setFallbackSession(next);
    },
    [activateSovereignSession]
  );

  const unlinkStarSeed = useCallback(() => {
    try {
      window.localStorage.removeItem(LOCAL_LINK_KEY);
    } catch {
      /* ignore */
    }
    setFallbackSession(null);
    void authLogout();
  }, [authLogout]);

  const displayName = useMemo(() => {
    if (authProfile?.displayName) return authProfile.displayName;
    if (activeSession?.name && typeof activeSession.name === 'string') return activeSession.name;
    if (activeSession?.handle && typeof activeSession.handle === 'string') return activeSession.handle;
    if (activeSession?.email && typeof activeSession.email === 'string') {
      return activeSession.email.split('@')[0];
    }
    return activeSession ? 'Identidad StarSeed' : null;
  }, [authProfile, activeSession]);

  const handle = useMemo(() => {
    if (authProfile?.handle) return authProfile.handle;
    if (activeSession?.handle) return String(activeSession.handle);
    return null;
  }, [authProfile, activeSession]);

  return {
    isLoggedIn: Boolean(activeSession),
    user: activeSession,
    session: activeSession,
    displayName,
    handle,
    avatarUrl: authProfile?.avatarUrl || (activeSession?.avatarUrl as string) || null,
    starseedAddress:
      authProfile?.starseedAddress ||
      (handle ? `${handle.replace(/^@/, '')}@star.seed` : null),
    cameFromOS,
    linkStarSeed,
    unlinkStarSeed,
    refresh,
    loginWithEmail: loginWithIdentifier,
    signUpWithEmail: signUpWithIdentifier,
    logout: authLogout,
  };
};

export default useStarSeedIdentity;
