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
  updateSubscription: (tier: SubscriptionTier, trialDurationMs?: number) => Promise<void>;
  createStripeCheckout: (priceId: string, mode: 'subscription' | 'payment') => Promise<void>;
  redeemCode: (code: string) => Promise<{ ok: boolean; tier?: string; message: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, userData: null, profile: null, loading: true, isAuthModalOpen: false,
  setAuthModalOpen: () => {}, login: async () => {}, loginWithGoogle: async () => {},
  logout: async () => {}, updateSubscription: async () => {}, createStripeCheckout: async () => {},
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
    let tier: SubscriptionTier = isMaestro ? 'lifetime' : 'free';
    try {
      const { data } = await supabase.from('audiomorphic_subscriptions')
        .select('plan,status').eq('user_id', u.id).maybeSingle();
      if (data && (data.status === 'active' || data.status === 'trialing') && data.plan) {
        tier = data.plan as SubscriptionTier;
      }
    } catch (e) { /* sin red: queda en free/lifetime */ }
    setUserData({ uid: u.id, email: u.email || '', subscriptionTier: tier, createdAt: Date.now(), updatedAt: Date.now() });
  }

  // Carga el perfil StarSeed real (mismo pool de cuentas que OS/Nexus/Café).
  async function loadProfile(u: User) {
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
      // Sin red o RLS: no romper la UI, solo no mostramos perfil extendido.
      setProfile(null);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) { loadProfile(u); loadTier(u).finally(() => setLoading(false)); } else setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) { loadTier(u); loadProfile(u); setAuthModalOpen(false); } else { setUserData(null); setProfile(null); }
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const login = async () => setAuthModalOpen(true);
  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  };
  const logout = async () => { await supabase.auth.signOut(); };

  const updateSubscription = async (tier: SubscriptionTier) => {
    if (!user) return;
    await supabase.from('audiomorphic_subscriptions')
      .upsert({ user_id: user.id, status: 'active', plan: tier, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
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
    <AuthContext.Provider value={{ user, userData, profile, loading, isAuthModalOpen, setAuthModalOpen, login, loginWithGoogle, logout, updateSubscription, createStripeCheckout, redeemCode }}>
      {children}
    </AuthContext.Provider>
  );
};
