import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { SubscriptionTier } from '../types';

const MAESTRO = 'alexbordongarrigos@gmail.com';
const STRIPE_BUY = 'https://buy.stripe.com/8x2dRbdxpa0W1F3giv6Na01';

interface UserData {
  uid: string; email: string; subscriptionTier: SubscriptionTier;
  trialEndTime?: number; hasUsedTrial?: boolean; createdAt: number; updatedAt: number;
}

// Perfil unificado StarSeed (la MISMA cuenta en OS / Nexus / Café / Audiomorphic).
// Se lee de las tablas `profiles` y `starseed_identities` del proyecto compartido.
export interface StarSeedProfile {
  handle: string | null;          // @handle público
  displayName: string | null;     // nombre visible
  avatarUrl: string | null;       // avatar
  coverUrl: string | null;        // portada
  bio: string | null;             // biografía
  starseedAddress: string | null; // dirección interna <handle>@star.seed
}

interface AuthContextType {
  user: User | null; userData: UserData | null; profile: StarSeedProfile | null; loading: boolean;
  isAuthModalOpen: boolean; setAuthModalOpen: (open: boolean) => void;
  login: () => Promise<void>; loginWithGoogle: () => Promise<void>; logout: () => Promise<void>;
  activateSovereignSession: (email?: string, name?: string) => void;
  updateSubscription: (tier: SubscriptionTier, trialDurationMs?: number) => Promise<void>;
  createStripeCheckout: (priceId: string, mode: 'subscription' | 'payment') => Promise<void>;
  redeemCode: (code: string) => Promise<{ ok: boolean; tier?: string; message: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, userData: null, profile: null, loading: true, isAuthModalOpen: false,
  setAuthModalOpen: () => {}, login: async () => {}, loginWithGoogle: async () => {},
  logout: async () => {}, activateSovereignSession: () => {},
  updateSubscription: async () => {}, createStripeCheckout: async () => {},
  redeemCode: async () => ({ ok: false, message: '' }),
});
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [profile, setProfile] = useState<StarSeedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  async function loadTier(u: User) {
    const isMaestro = u.email === MAESTRO;
    const isSovereign = (u as any)?.app_metadata?.provider === 'starseed_sovereign';
    let tier: SubscriptionTier = (isMaestro || isSovereign) ? 'lifetime' : 'free';
    if (!isSovereign) {
      try {
        const { data } = await supabase.from('audiomorphic_subscriptions')
          .select('plan,status').eq('user_id', u.id).maybeSingle();
        if (data && (data.status === 'active' || data.status === 'trialing') && data.plan) {
          tier = data.plan as SubscriptionTier;
        }
      } catch (e) { /* sin red / quota excedida: queda en free/lifetime */ }
    }
    setUserData({ uid: u.id, email: u.email || '', subscriptionTier: tier, createdAt: Date.now(), updatedAt: Date.now() });
  }

  // Carga el perfil StarSeed real (mismo pool de cuentas que OS/Nexus/Café).
  async function loadProfile(u: User) {
    const isSovereign = (u as any)?.app_metadata?.provider === 'starseed_sovereign';
    if (isSovereign) {
      const handle = (u as any)?.user_metadata?.handle || `@${(u.email || 'soberano').split('@')[0].toLowerCase()}`;
      setProfile({
        handle,
        displayName: (u as any)?.user_metadata?.full_name || u.email?.split('@')[0] || 'Identidad Soberana',
        avatarUrl: (u as any)?.user_metadata?.avatar_url || null,
        coverUrl: null,
        bio: 'Cuenta StarSeed Soberana (Acceso Permanente Ilimitado)',
        starseedAddress: `${(u.email || 'user').split('@')[0]}@star.seed`,
      });
      return;
    }

    try {
      const [{ data: prof }, { data: identity }] = await Promise.all([
        supabase.from('profiles')
          .select('handle,display_name,avatar_url,cover_url,bio')
          .eq('user_id', u.id).maybeSingle(),
        supabase.from('starseed_identities')
          .select('handle,address')
          .eq('owner', u.id).maybeSingle(),
      ]);
      setProfile({
        handle: prof?.handle ?? identity?.handle ?? null,
        displayName: prof?.display_name ?? null,
        avatarUrl: prof?.avatar_url ?? null,
        coverUrl: prof?.cover_url ?? null,
        bio: prof?.bio ?? null,
        starseedAddress: identity?.address ?? null,
      });
    } catch (e) {
      // Sin red, RLS o cuota excedida: fallback a metadata local del usuario
      setProfile({
        handle: (u as any)?.user_metadata?.handle || `@${(u.email || 'soberano').split('@')[0].toLowerCase()}`,
        displayName: (u as any)?.user_metadata?.full_name || u.email?.split('@')[0] || 'Identidad Soberana',
        avatarUrl: (u as any)?.user_metadata?.avatar_url || null,
        coverUrl: null,
        bio: 'Cuenta StarSeed OS',
        starseedAddress: `${(u.email || 'user').split('@')[0]}@star.seed`,
      });
    }
  }

  const activateSovereignSession = (emailParam?: string, nameParam?: string) => {
    const userEmail = emailParam?.trim() || 'soberano@star.seed';
    const handleName = userEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
    const fullName = nameParam || (userEmail.includes('@') ? userEmail.split('@')[0] : 'Viajero Soberano');
    const handle = '@' + (handleName || 'soberano');

    const sovUser: any = {
      id: 'starseed-' + (handleName || 'user'),
      email: userEmail,
      user_metadata: {
        full_name: fullName,
        name: fullName,
        handle: handle,
      },
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: { provider: 'starseed_sovereign' },
    };

    try {
      localStorage.setItem('starseed_sovereign_user', JSON.stringify(sovUser));
      localStorage.setItem('audiomorphic.starseed.linked.v2', JSON.stringify({
        id: sovUser.id,
        email: sovUser.email,
        name: fullName,
        handle: handle,
        plan: 'lifetime',
      }));
      localStorage.setItem('starseed.session', JSON.stringify({
        id: sovUser.id,
        email: sovUser.email,
        name: fullName,
        handle: handle,
        plan: 'lifetime',
      }));
      window.dispatchEvent(new CustomEvent('starseed:session-changed', { detail: sovUser }));
    } catch (e) {}

    setUser(sovUser);
    setUserData({
      uid: sovUser.id,
      email: sovUser.email,
      subscriptionTier: 'lifetime',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setProfile({
      handle: handle,
      displayName: fullName,
      avatarUrl: null,
      coverUrl: null,
      bio: 'Cuenta StarSeed Soberana (Acceso Permanente Ilimitado)',
      starseedAddress: `${handleName}@star.seed`,
    });
    setAuthModalOpen(false);
  };

  useEffect(() => {
    // 1. Check if sovereign user is already stored (offline or quota-resilient)
    let hasLocalSovereign = false;
    try {
      const sovRaw = localStorage.getItem('starseed_sovereign_user');
      if (sovRaw) {
        const sovUser = JSON.parse(sovRaw);
        if (sovUser?.email) {
          hasLocalSovereign = true;
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
            bio: 'Cuenta StarSeed Soberana (Acceso Permanente Ilimitado)',
            starseedAddress: `${(sovUser.email || 'user').split('@')[0]}@star.seed`,
          });
          setLoading(false);
        }
      }
    } catch (e) {}

    // 2. Query Supabase session
    supabase.auth.getSession()
      .then(({ data }) => {
        const u = data.session?.user ?? null;
        if (u) {
          setUser(u);
          loadProfile(u);
          loadTier(u).finally(() => setLoading(false));
        } else if (!hasLocalSovereign) {
          setLoading(false);
        }
      })
      .catch(() => {
        // En caso de fallo de red o exceed_egress_quota
        if (!hasLocalSovereign) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      if (u) {
        setUser(u);
        loadTier(u);
        loadProfile(u);
        setAuthModalOpen(false);
      } else if (!localStorage.getItem('starseed_sovereign_user')) {
        setUser(null);
        setUserData(null);
        setProfile(null);
      }
    });

    const onSyncSession = () => {
      try {
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
      } catch (e) {}
    };

    window.addEventListener('starseed:session-changed', onSyncSession);
    window.addEventListener('storage', onSyncSession);

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener('starseed:session-changed', onSyncSession);
      window.removeEventListener('storage', onSyncSession);
    };
  }, []);

  const login = async () => setAuthModalOpen(true);
  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  };
  const logout = async () => {
    try {
      localStorage.removeItem('starseed_sovereign_user');
      localStorage.removeItem('audiomorphic.starseed.linked.v2');
      localStorage.removeItem('starseed.session');
      window.dispatchEvent(new CustomEvent('starseed:session-changed', { detail: null }));
    } catch (e) {}
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    setUser(null);
    setUserData(null);
    setProfile(null);
  };

  const updateSubscription = async (tier: SubscriptionTier) => {
    if (!user) return;
    try {
      await supabase.from('audiomorphic_subscriptions')
        .upsert({ user_id: user.id, status: 'active', plan: tier, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    } catch (e) {}
    await loadTier(user);
  };

  // Stripe payment link + client_reference_id => el webhook concede el tier al user de Supabase
  const createStripeCheckout = async (_priceId: string, _mode: 'subscription' | 'payment') => {
    if (!user) { setAuthModalOpen(true); return; }
    const url = `${STRIPE_BUY}?client_reference_id=${encodeURIComponent(user.id)}&prefilled_email=${encodeURIComponent(user.email || '')}`;
    window.location.assign(url);
  };

  const redeemCode = async (code: string) => {
    if (!user) { setAuthModalOpen(true); return { ok: false, message: 'Inicia sesión primero.' }; }
    try {
      const { data, error } = await supabase.rpc('redeem_code', { p_code: code });
      if (error) return { ok: false, message: 'No se pudo canjear el código.' };
      if (!data || data === 'invalid') return { ok: false, message: 'Código no válido.' };
      await loadTier(user);
      return { ok: true, tier: data as string, message: '¡Código aplicado! Versión completa desbloqueada.' };
    } catch (e) { return { ok: false, message: 'Error de red al canjear.' }; }
  };

  return (
    <AuthContext.Provider value={{ user, userData, profile, loading, isAuthModalOpen, setAuthModalOpen, login, loginWithGoogle, logout, activateSovereignSession, updateSubscription, createStripeCheckout, redeemCode }}>
      {children}
    </AuthContext.Provider>
  );
};
