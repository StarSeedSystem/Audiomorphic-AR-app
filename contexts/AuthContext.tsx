import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { SubscriptionTier } from '../types';

const MAESTRO = 'alexbordongarrigos@gmail.com';
const STRIPE_BUY = 'https://buy.stripe.com/8x2dRbdxpa0W1F3giv6Na01';
const CACHED_STARSEED_USER_KEY = 'audiomorphic.starseed.cached_user.v1';

interface UserData {
  uid: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  trialEndTime?: number;
  hasUsedTrial?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface StarSeedProfile {
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  starseedAddress: string | null;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  profile: StarSeedProfile | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  login: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithIdentifier: (identifier: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUpWithIdentifier: (email: string, password: string, displayName?: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  activateSovereignSession: (email?: string, name?: string) => void;
  updateSubscription: (tier: SubscriptionTier, trialDurationMs?: number) => Promise<void>;
  createStripeCheckout: (priceId: string, mode: 'subscription' | 'payment') => Promise<void>;
  redeemCode: (code: string) => Promise<{ ok: boolean; tier?: string; message: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  profile: null,
  loading: true,
  isAuthModalOpen: false,
  setAuthModalOpen: () => {},
  login: async () => {},
  loginWithGoogle: async () => {},
  loginWithIdentifier: async () => ({ ok: false }),
  signUpWithIdentifier: async () => ({ ok: false }),
  logout: async () => {},
  activateSovereignSession: () => {},
  updateSubscription: async () => {},
  createStripeCheckout: async () => {},
  redeemCode: async () => ({ ok: false, message: '' }),
});

export const useAuth = () => useContext(AuthContext);

function persistCachedStarSeedSession(u: User | null, prof?: StarSeedProfile | null) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (!u) {
      window.localStorage.removeItem(CACHED_STARSEED_USER_KEY);
      window.localStorage.removeItem('audiomorphic.starseed.linked.v2');
      window.localStorage.removeItem('starseed.session');
      return;
    }
    const handle = prof?.handle || (u as any)?.user_metadata?.handle || null;
    const displayName =
      prof?.displayName ||
      (u as any)?.user_metadata?.full_name ||
      (u as any)?.user_metadata?.name ||
      u.email?.split('@')[0] ||
      'StarSeed Explorer';

    const cached = {
      user: {
        id: u.id,
        email: u.email || '',
        aud: u.aud || 'authenticated',
        role: u.role || 'authenticated',
        app_metadata: u.app_metadata || {},
        user_metadata: {
          ...(u.user_metadata || {}),
          full_name: displayName,
          handle,
          avatar_url: prof?.avatarUrl || (u.user_metadata as any)?.avatar_url || null,
        },
      },
      profile: prof || {
        handle,
        displayName,
        avatarUrl: (u.user_metadata as any)?.avatar_url || null,
        coverUrl: null,
        bio: null,
        starseedAddress: handle ? `${handle.replace(/^@/, '')}@star.seed` : null,
      },
    };
    window.localStorage.setItem(CACHED_STARSEED_USER_KEY, JSON.stringify(cached));
    window.localStorage.setItem(
      'audiomorphic.starseed.linked.v2',
      JSON.stringify({
        id: u.id,
        email: u.email,
        name: displayName,
        handle,
        avatarUrl: cached.profile.avatarUrl,
        plan: 'lifetime',
      })
    );
  } catch {
    /* ignore storage errors */
  }
}

function readCachedStarSeedSession(): { user: User; profile: StarSeedProfile } | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(CACHED_STARSEED_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.user?.id) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [profile, setProfile] = useState<StarSeedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  const loadTier = useCallback(async (u: User) => {
    const isMaestro = u.email === MAESTRO;
    const isSovereign = (u as any)?.app_metadata?.provider === 'starseed_sovereign';
    let tier: SubscriptionTier = isMaestro || isSovereign ? 'lifetime' : 'lifetime';
    if (!isSovereign && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const timeout = new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 1500));
        const req = supabase
          .from('audiomorphic_subscriptions')
          .select('plan,status')
          .eq('user_id', u.id)
          .maybeSingle();
        const { data } = (await Promise.race([req, timeout])) as any;
        if (data && (data.status === 'active' || data.status === 'trialing') && data.plan) {
          tier = data.plan as SubscriptionTier;
        }
      } catch {
        /* non-blocking */
      }
    }
    setUserData({
      uid: u.id,
      email: u.email || '',
      subscriptionTier: tier,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }, []);

  const loadProfile = useCallback(async (u: User) => {
    const fallbackProfile: StarSeedProfile = {
      handle: (u as any)?.user_metadata?.handle || `@${(u.email || 'usuario').split('@')[0].toLowerCase()}`,
      displayName: (u as any)?.user_metadata?.full_name || u.email?.split('@')[0] || 'Viajero StarSeed',
      avatarUrl: (u as any)?.user_metadata?.avatar_url || null,
      coverUrl: null,
      bio: null,
      starseedAddress: `${(u.email || 'user').split('@')[0]}@star.seed`,
    };

    const isSovereign = (u as any)?.app_metadata?.provider === 'starseed_sovereign';
    if (isSovereign || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      setProfile(fallbackProfile);
      persistCachedStarSeedSession(u, fallbackProfile);
      return;
    }

    try {
      const timeout = new Promise<any[]>((resolve) =>
        setTimeout(() => resolve([{ data: null }, { data: null }, { data: null }]), 2000)
      );
      const req = Promise.all([
        supabase.from('profiles').select('handle,display_name,avatar_url,cover_url,bio').eq('user_id', u.id).maybeSingle(),
        supabase.from('os_profiles').select('handle,display_name,avatar_url,cover_url').eq('user_id', u.id).maybeSingle(),
        supabase.from('starseed_identities').select('handle,address').eq('owner', u.id).maybeSingle(),
      ]);
      const [{ data: prof }, { data: osProf }, { data: identity }] = (await Promise.race([req, timeout])) as any;

      const resolvedHandle =
        osProf?.handle ?? prof?.handle ?? identity?.handle ?? (u as any)?.user_metadata?.handle ?? null;
      const nextProf: StarSeedProfile = {
        handle: resolvedHandle,
        displayName:
          osProf?.display_name ??
          prof?.display_name ??
          resolvedHandle ??
          (u as any)?.user_metadata?.full_name ??
          u.email?.split('@')[0] ??
          null,
        avatarUrl: osProf?.avatar_url ?? prof?.avatar_url ?? (u as any)?.user_metadata?.avatar_url ?? null,
        coverUrl: osProf?.cover_url ?? prof?.cover_url ?? null,
        bio: prof?.bio ?? null,
        starseedAddress:
          identity?.address ?? (resolvedHandle ? `${String(resolvedHandle).replace(/^@/, '')}@star.seed` : fallbackProfile.starseedAddress),
      };
      setProfile(nextProf);
      persistCachedStarSeedSession(u, nextProf);
    } catch {
      setProfile(fallbackProfile);
      persistCachedStarSeedSession(u, fallbackProfile);
    }
  }, []);

  const activateSovereignSession = useCallback((emailParam?: string, nameParam?: string) => {
    const userEmail = emailParam?.trim() || 'soberano@star.seed';
    const handleName = userEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || 'soberano';
    const fullName = nameParam || (userEmail.includes('@') ? userEmail.split('@')[0] : 'Viajero Soberano');
    const handle = '@' + handleName;

    const sovUser: any = {
      id: 'starseed-' + handleName,
      email: userEmail,
      user_metadata: {
        full_name: fullName,
        name: fullName,
        handle,
      },
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: { provider: 'starseed_sovereign' },
    };

    const nextProfile: StarSeedProfile = {
      handle,
      displayName: fullName,
      avatarUrl: null,
      coverUrl: null,
      bio: 'Cuenta StarSeed Soberana (Modo Local)',
      starseedAddress: `${handleName}@star.seed`,
    };

    try {
      localStorage.setItem('starseed_sovereign_user', JSON.stringify(sovUser));
      persistCachedStarSeedSession(sovUser, nextProfile);
      window.dispatchEvent(new CustomEvent('starseed:session-changed', { detail: sovUser }));
    } catch {
      /* ignore */
    }

    setUser(sovUser);
    setUserData({
      uid: sovUser.id,
      email: sovUser.email,
      subscriptionTier: 'lifetime',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setProfile(nextProfile);
    setAuthModalOpen(false);
  }, []);

  useEffect(() => {
    // 1. Restore any previously signed-in StarSeed session from local storage (works 100% offline)
    let hasCachedUser = false;
    try {
      const cached = readCachedStarSeedSession();
      if (cached?.user) {
        hasCachedUser = true;
        setUser(cached.user);
        setProfile(cached.profile);
        setUserData({
          uid: cached.user.id,
          email: cached.user.email || '',
          subscriptionTier: 'lifetime',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        setLoading(false);
      } else {
        const sovRaw = localStorage.getItem('starseed_sovereign_user');
        if (sovRaw) {
          const sovUser = JSON.parse(sovRaw);
          if (sovUser?.email) {
            hasCachedUser = true;
            setUser(sovUser);
            setUserData({
              uid: sovUser.id,
              email: sovUser.email,
              subscriptionTier: 'lifetime',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
            setProfile({
              handle: sovUser.user_metadata?.handle || '@soberano',
              displayName: sovUser.user_metadata?.full_name || 'Identidad Soberana',
              avatarUrl: sovUser.user_metadata?.avatar_url || null,
              coverUrl: null,
              bio: null,
              starseedAddress: `${(sovUser.email || 'user').split('@')[0]}@star.seed`,
            });
            setLoading(false);
          }
        }
      }
    } catch {
      /* ignore */
    }

    // 2. Always check Supabase local persisted session (getSession reads localStorage without requiring network)
    const sessionTimeout = new Promise<{ data: { session: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { session: null } }), 1200)
    );

    Promise.race([supabase.auth.getSession(), sessionTimeout])
      .then(({ data }) => {
        const u = data?.session?.user ?? null;
        if (u) {
          setUser(u);
          loadProfile(u);
          loadTier(u).finally(() => setLoading(false));
        } else {
          // If offline without a logged-in user, do NOT force a synthetic account:
          // run cleanly in Local Device mode!
          if (!hasCachedUser) setLoading(false);
        }
      })
      .catch(() => {
        if (!hasCachedUser) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      if (u) {
        setUser(u);
        // Defer DB profile/tier calls outside Supabase auth lock callback
        setTimeout(() => {
          loadTier(u);
          loadProfile(u);
        }, 0);
        setAuthModalOpen(false);
        window.dispatchEvent(new CustomEvent('starseed:session-changed', { detail: u }));
      } else if (event === 'SIGNED_OUT' && !localStorage.getItem('starseed_sovereign_user')) {
        persistCachedStarSeedSession(null);
        setUser(null);
        setUserData(null);
        setProfile(null);
        window.dispatchEvent(new CustomEvent('starseed:session-changed', { detail: null }));
      }
    });

    const onSyncSession = () => {
      try {
        const cached = readCachedStarSeedSession();
        if (cached?.user) {
          setUser(cached.user);
          setProfile(cached.profile);
          setLoading(false);
          return;
        }
        const sovRaw = localStorage.getItem('starseed_sovereign_user');
        if (sovRaw) {
          const sovUser = JSON.parse(sovRaw);
          if (sovUser?.email) {
            setUser(sovUser);
            loadTier(sovUser);
            loadProfile(sovUser);
            setLoading(false);
          }
        }
      } catch {
        /* ignore */
      }
    };

    window.addEventListener('starseed:session-changed', onSyncSession);
    window.addEventListener('storage', onSyncSession);

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener('starseed:session-changed', onSyncSession);
      window.removeEventListener('storage', onSyncSession);
    };
  }, [loadProfile, loadTier]);

  const login = async () => setAuthModalOpen(true);

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  };

  const loginWithIdentifier = async (
    identifier: string,
    password: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const trimmed = identifier.trim();
    if (!trimmed) return { ok: false, error: 'Ingresa tu correo o @usuario de StarSeed OS.' };
    if (!password) return { ok: false, error: 'Ingresa tu contraseña.' };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        ok: false,
        error: 'Sin conexión a internet. Puedes seguir usando Audiomorphic en Modo Local sin cuenta.',
      };
    }

    let email = trimmed;
    if (!email.includes('@')) {
      const cleanHandle = trimmed.replace(/^@/, '').toLowerCase();
      try {
        const { data: handleProfile } = await supabase
          .from('os_profiles')
          .select('handle')
          .eq('handle', cleanHandle)
          .maybeSingle();
        email = handleProfile?.handle ? `${handleProfile.handle}@star.seed` : `${cleanHandle}@star.seed`;
      } catch {
        email = `${cleanHandle}@star.seed`;
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
          return {
            ok: false,
            error: 'Credenciales inválidas. Comprueba tu usuario/correo y contraseña registrados en StarSeed OS.',
          };
        }
        if (msg.includes('email not confirmed')) {
          return { ok: false, error: 'Este correo aún no ha sido confirmado en StarSeed OS.' };
        }
        if (msg.includes('failed to fetch') || msg.includes('network')) {
          return { ok: false, error: 'No se pudo contactar a StarSeed OS. Verifica tu conexión.' };
        }
        return { ok: false, error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        await loadProfile(data.user);
        await loadTier(data.user);
        setAuthModalOpen(false);
        return { ok: true };
      }
      return { ok: false, error: 'No se recibió sesión de usuario.' };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Error al iniciar sesión en StarSeed OS.' };
    }
  };

  const signUpWithIdentifier = async (
    email: string,
    password: string,
    displayName?: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      return { ok: false, error: 'Ingresa correo electrónico y contraseña.' };
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { ok: false, error: 'Se requiere internet para registrar una nueva cuenta en la nube.' };
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: displayName?.trim() || cleanEmail.split('@')[0],
          },
        },
      });
      if (error) return { ok: false, error: error.message };
      if (data.user && !data.session) {
        return {
          ok: true,
          error: 'Te enviamos un correo de confirmación. Verifícalo y vuelve a iniciar sesión.',
        };
      }
      if (data.user) {
        setUser(data.user);
        await loadProfile(data.user);
        await loadTier(data.user);
        setAuthModalOpen(false);
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Error al crear la cuenta.' };
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('starseed_sovereign_user');
      persistCachedStarSeedSession(null);
      window.dispatchEvent(new CustomEvent('starseed:session-changed', { detail: null }));
    } catch {
      /* ignore */
    }
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    setUser(null);
    setUserData(null);
    setProfile(null);
  };

  const updateSubscription = async (tier: SubscriptionTier) => {
    if (!user) return;
    try {
      await supabase.from('audiomorphic_subscriptions').upsert(
        { user_id: user.id, status: 'active', plan: tier, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    } catch {
      /* ignore */
    }
    await loadTier(user);
  };

  const createStripeCheckout = async (_priceId: string, _mode: 'subscription' | 'payment') => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    const url = `${STRIPE_BUY}?client_reference_id=${encodeURIComponent(user.id)}&prefilled_email=${encodeURIComponent(user.email || '')}`;
    window.location.assign(url);
  };

  const redeemCode = async (code: string) => {
    if (!user) {
      setAuthModalOpen(true);
      return { ok: false, message: 'Inicia sesión primero.' };
    }
    try {
      const { data, error } = await supabase.rpc('redeem_code', { p_code: code });
      if (error) return { ok: false, message: 'No se pudo canjear el código.' };
      if (!data || data === 'invalid') return { ok: false, message: 'Código no válido.' };
      await loadTier(user);
      return { ok: true, tier: data as string, message: '¡Código aplicado! Versión completa desbloqueada.' };
    } catch {
      return { ok: false, message: 'Error de red al canjear.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        profile,
        loading,
        isAuthModalOpen,
        setAuthModalOpen,
        login,
        loginWithGoogle,
        loginWithIdentifier,
        signUpWithIdentifier,
        logout,
        activateSovereignSession,
        updateSubscription,
        createStripeCheckout,
        redeemCode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
