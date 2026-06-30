import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * useSubscription
 * ---------------------------------------------------------------------------
 * Functional subscription state for Audiomorphic. There is NO real billing
 * backend, so this hook implements a fully working UI-layer subscription:
 *
 *   - Tiers: free (StarSeed OS), code, starseed, premium.
 *   - Persists the active plan in localStorage under
 *     `audiomorphic.subscription.v1`.
 *   - Redeem-code flow: validates format, accepts a few hardcoded demo codes
 *     and any code starting with `SS-` (StarSeed ecosystem codes).
 *
 * All access to localStorage is guarded so it never throws (Vite SPA; no SSR).
 */

export type PlanId = 'free' | 'code' | 'starseed' | 'premium';

export interface SubscriptionState {
  plan: PlanId;
  /** When the plan was selected/redeemed (ISO string). */
  since: string;
  /** The code that was redeemed, if the plan came from a code. */
  redeemedCode?: string;
  /** True when the plan was granted because a StarSeed session was present. */
  viaStarSeed?: boolean;
}

export interface TierFeature {
  label: string;
  included: boolean;
}

export interface TierDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  price: string;
  accent: 'cyan' | 'emerald' | 'purple' | 'amber';
  features: TierFeature[];
}

export const SUBSCRIPTION_STORAGE_KEY = 'audiomorphic.subscription.v1';

const DEMO_CODES: Record<string, PlanId> = {
  'AUDIO-PREMIUM': 'premium',
  'MORPH-VIP': 'premium',
  'STARSEED-FREE': 'free',
  'COSMOS-2025': 'premium',
  'NEON-DREAM': 'code',
};

// Order matters for display (lowest → highest).
export const TIERS: TierDefinition[] = [
  {
    id: 'free',
    name: 'Gratis vía StarSeed OS',
    tagline: 'Gratis con tu cuenta StarSeed',
    price: '0€',
    accent: 'emerald',
    features: [
      { label: 'Visualizador completo y micrófono', included: true },
      { label: 'Piloto Automático (Deriva, Armónico)', included: true },
      { label: 'Génesis Geométrico básico', included: true },
      { label: 'Modos AR / VR experimentales', included: true },
      { label: 'Filtros AR premium', included: false },
      { label: 'Soporte prioritario', included: false },
    ],
  },
  {
    id: 'code',
    name: 'Código',
    tagline: 'Canjea un código de acceso',
    price: 'Código',
    accent: 'cyan',
    features: [
      { label: 'Todo lo de Gratis', included: true },
      { label: 'Desbloqueo según el código canjeado', included: true },
      { label: 'Acceso a betas y campañas', included: true },
      { label: 'Filtros AR premium (si el código lo incluye)', included: true },
      { label: 'Soporte prioritario', included: false },
    ],
  },
  {
    id: 'starseed',
    name: 'StarSeed',
    tagline: 'Plan vinculado al ecosistema',
    price: 'Ecosistema',
    accent: 'purple',
    features: [
      { label: 'Todo lo de Gratis', included: true },
      { label: 'Sincronización con el ecosistema StarSeed', included: true },
      { label: 'Presets compartidos entre apps StarSeed', included: true },
      { label: 'Génesis Geométrico avanzado', included: true },
      { label: 'Filtros AR premium', included: true },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    tagline: 'Todo desbloqueado',
    price: '4,99€/mes',
    accent: 'amber',
    features: [
      { label: 'Todo lo de StarSeed', included: true },
      { label: 'Todos los filtros AR y efectos', included: true },
      { label: 'Exportación y grabación (próximamente)', included: true },
      { label: 'Resolución y detalle máximos', included: true },
      { label: 'Soporte prioritario', included: true },
    ],
  },
];

export const getTier = (plan: PlanId): TierDefinition =>
  TIERS.find((t) => t.id === plan) || TIERS[0];

const DEFAULT_STATE: SubscriptionState = {
  plan: 'free',
  since: new Date(0).toISOString(),
  viaStarSeed: false,
};

const readState = (): SubscriptionState | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.plan === 'string') {
      const validPlans: PlanId[] = ['free', 'code', 'starseed', 'premium'];
      if (validPlans.includes(parsed.plan)) return parsed as SubscriptionState;
    }
  } catch {
    /* ignore malformed/inaccessible storage */
  }
  return null;
};

const writeState = (state: SubscriptionState): void => {
  try {
    window.localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota/privacy errors */
  }
};

export interface RedeemResult {
  ok: boolean;
  message: string;
  plan?: PlanId;
}

/** Validate a code's *format* (does not check redeemability). */
export const isValidCodeFormat = (raw: string): boolean => {
  const code = raw.trim().toUpperCase();
  if (code.length < 4 || code.length > 32) return false;
  // Letters, numbers and dashes only.
  return /^[A-Z0-9-]+$/.test(code);
};

export interface UseSubscriptionResult {
  state: SubscriptionState;
  tier: TierDefinition;
  tiers: TierDefinition[];
  /** Whether a StarSeed identity is currently linked (drives free-plan UX). */
  hasStarSeed: boolean;
  selectPlan: (plan: PlanId) => void;
  redeemCode: (raw: string) => RedeemResult;
  resetToFree: () => void;
}

export const useSubscription = (hasStarSeed: boolean = false): UseSubscriptionResult => {
  const [state, setState] = useState<SubscriptionState>(() => readState() || DEFAULT_STATE);

  // If a StarSeed session appears and the user is still on the default free
  // plan, flag the free plan as granted via StarSeed (prominent UX).
  useEffect(() => {
    if (hasStarSeed && state.plan === 'free' && !state.viaStarSeed) {
      const next: SubscriptionState = { ...state, viaStarSeed: true, since: new Date().toISOString() };
      setState(next);
      writeState(next);
    }
  }, [hasStarSeed, state]);

  const persist = useCallback((next: SubscriptionState) => {
    setState(next);
    writeState(next);
  }, []);

  const selectPlan = useCallback(
    (plan: PlanId) => {
      const next: SubscriptionState = {
        plan,
        since: new Date().toISOString(),
        viaStarSeed: plan === 'free' ? hasStarSeed : false,
        redeemedCode: undefined,
      };
      persist(next);
    },
    [hasStarSeed, persist]
  );

  const redeemCode = useCallback(
    (raw: string): RedeemResult => {
      const code = raw.trim().toUpperCase();
      if (!code) {
        return { ok: false, message: 'Introduce un código.' };
      }
      if (!isValidCodeFormat(code)) {
        return {
          ok: false,
          message: 'Formato inválido. Usa letras, números y guiones (4–32 caracteres).',
        };
      }

      let grantedPlan: PlanId | null = null;

      if (DEMO_CODES[code]) {
        grantedPlan = DEMO_CODES[code];
      } else if (code.startsWith('SS-')) {
        // StarSeed ecosystem codes grant the StarSeed plan.
        grantedPlan = 'starseed';
      }

      if (!grantedPlan) {
        return { ok: false, message: 'Código no reconocido. Verifica e inténtalo de nuevo.' };
      }

      const next: SubscriptionState = {
        plan: grantedPlan,
        since: new Date().toISOString(),
        redeemedCode: code,
        viaStarSeed: false,
      };
      persist(next);

      const tierName = getTier(grantedPlan).name;
      return { ok: true, message: `¡Código canjeado! Plan activo: ${tierName}.`, plan: grantedPlan };
    },
    [persist]
  );

  const resetToFree = useCallback(() => {
    persist({
      plan: 'free',
      since: new Date().toISOString(),
      viaStarSeed: hasStarSeed,
      redeemedCode: undefined,
    });
  }, [hasStarSeed, persist]);

  const tier = useMemo(() => getTier(state.plan), [state.plan]);

  return {
    state,
    tier,
    tiers: TIERS,
    hasStarSeed,
    selectPlan,
    redeemCode,
    resetToFree,
  };
};

export default useSubscription;
