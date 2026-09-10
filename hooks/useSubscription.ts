import { useCallback, useEffect, useState } from 'react';
import { ThankYouCardRecord } from '../lib/starseedDb';

/**
 * useSubscription.ts
 * ---------------------------------------------------------------------------
 * Sistema de Donaciones Voluntarias Opcionales & Reconocimiento (0% bloqueos).
 *
 * Conecta los precios reales de Stripe existentes:
 *   - Libre / Explorador: $0 MXN
 *   - Aporte Creador: $369 MXN (buy.stripe.com/8x2dRbdxpa0W1F3giv6Na01)
 *   - Aporte Maestro / Donación Plena: $963 MXN (donate.stripe.com/9B6eVfdxp0qmbfD5DR6Na00)
 *   - StarSeed Ecosistema: Libre dentro del OS
 *
 * Ninguna función está bloqueada: todo el visualizador, AR/VR y micrófonos son 100% libres.
 * Se eliminaron todos los códigos de cupones y se entregan Tarjetas 3D interactivas.
 */

export type PlanId = 'free' | 'creator' | 'master' | 'starseed';

export interface SubscriptionState {
  plan: PlanId;
  since: string;
  viaStarSeed?: boolean;
  totalDonated?: number;
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
  amountNumber: number;
  currency: string;
  stripeUrl?: string;
  accent: 'cyan' | 'emerald' | 'purple' | 'amber';
  cardTheme: 'gold' | 'iridescent' | 'holographic' | 'celestial';
  features: string[];
}

export const SUBSCRIPTION_STORAGE_KEY = 'audiomorphic.subscription.v3';

export const STRIPE_BUY_CREATOR = 'https://buy.stripe.com/8x2dRbdxpa0W1F3giv6Na01';
export const STRIPE_DONATE_MASTER = 'https://donate.stripe.com/9B6eVfdxp0qmbfD5DR6Na00';

export const TIERS: TierDefinition[] = [
  {
    id: 'free',
    name: 'Explorador Libre',
    tagline: 'Acceso universal y gratuito para todos',
    price: '$0 MXN',
    amountNumber: 0,
    currency: 'MXN',
    accent: 'emerald',
    cardTheme: 'celestial',
    features: [
      'Visualizador sinestésico 100% desbloqueado',
      'Análisis FFT de audio y micrófono en vivo',
      'Piloto Automático (Deriva, Armónico, Génesis)',
      'Geometría Sagrada (Flor de la Vida, Metatrón)',
      'Modos 3D VR y Realidad Aumentada (AR)',
      'Tarjeta Virtual 3D de Agradecimiento de la Comunidad',
    ],
  },
  {
    id: 'creator',
    name: 'Aporte Creador',
    tagline: 'Apoyo voluntario anual al desarrollo del proyecto',
    price: '$369 MXN',
    amountNumber: 369,
    currency: 'MXN',
    stripeUrl: STRIPE_BUY_CREATOR,
    accent: 'purple',
    cardTheme: 'gold',
    features: [
      'Todo el visualizador completamente libre',
      'Tarjeta Virtual 3D de Oro & Reflejos Especulares',
      'Reactividad al cursor y al giroscopio del móvil',
      'Aporte al desarrollo de nuevas geometrías y audio',
      'Guardado permanente en tu Biblioteca Soberana',
    ],
  },
  {
    id: 'master',
    name: 'Aporte Maestro',
    tagline: 'Donación plena y de por vida a la Fundación StarSeed',
    price: '$963 MXN',
    amountNumber: 963,
    currency: 'MXN',
    stripeUrl: STRIPE_DONATE_MASTER,
    accent: 'amber',
    cardTheme: 'holographic',
    features: [
      'Todo el visualizador completamente libre',
      'Tarjeta Holográfica 3D Tornasol de Mecenas',
      'Financiamiento directo a la Fundación StarSeed (Arte y Conciencia)',
      'Acceso vitalicio a todos los presets maestros',
      'Reconocimiento de por vida en el ecosistema',
    ],
  },
  {
    id: 'starseed',
    name: 'StarSeed Ecosistema',
    tagline: 'Uso soberano e integrado en StarSeed OS',
    price: 'Libre en OS',
    amountNumber: 0,
    currency: 'MXN',
    accent: 'cyan',
    cardTheme: 'iridescent',
    features: [
      'Todo el visualizador completamente libre',
      'Cuenta soberana única en todo el ecosistema',
      'Misma sesión en Audiomorphic, Café, OS y Nexus',
      'Sincronización bidireccional en la nube con StarSeed OS',
      'Tarjeta 3D Iridiscente de la Red',
    ],
  },
];

export const getTier = (plan: PlanId): TierDefinition =>
  TIERS.find((t) => t.id === plan) || TIERS[0];

const DEFAULT_STATE: SubscriptionState = {
  plan: 'free',
  since: new Date().toISOString(),
  viaStarSeed: false,
};

const readState = (): SubscriptionState | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.plan === 'string') {
      const validPlans: PlanId[] = ['free', 'creator', 'master', 'starseed'];
      if (validPlans.includes(parsed.plan)) return parsed as SubscriptionState;
    }
  } catch {
    /* ignore */
  }
  return null;
};

const writeState = (state: SubscriptionState): void => {
  try {
    window.localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
};

export interface UseSubscriptionResult {
  state: SubscriptionState;
  tier: TierDefinition;
  tiers: TierDefinition[];
  hasStarSeed: boolean;
  makeDonation: (plan: PlanId, donorName?: string, userEmail?: string, userId?: string) => ThankYouCardRecord;
  resetToFree: () => void;
  getStripeUrlForPlan: (plan: PlanId, userEmail?: string, userId?: string) => string | null;
}

export const useSubscription = (
  hasStarSeed: boolean = false,
  onCardIssued?: (card: Omit<ThankYouCardRecord, 'id' | 'issuedAt'>) => ThankYouCardRecord
): UseSubscriptionResult => {
  const [state, setState] = useState<SubscriptionState>(() => readState() || DEFAULT_STATE);

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

  const getStripeUrlForPlan = useCallback((plan: PlanId, userEmail?: string, userId?: string): string | null => {
    const t = getTier(plan);
    if (!t.stripeUrl) return null;
    const params = new URLSearchParams();
    if (userEmail) params.append('prefilled_email', userEmail);
    if (userId) params.append('client_reference_id', userId);
    const qs = params.toString();
    return qs ? `${t.stripeUrl}?${qs}` : t.stripeUrl;
  }, []);

  const createCardForPlan = useCallback(
    (plan: PlanId, donorName: string = 'Viajero Cósmico'): ThankYouCardRecord => {
      const t = getTier(plan);
      const cardDraft = {
        donorName,
        tierId: plan,
        tierName: t.name,
        amount: t.price,
        folderPath: 'Biblioteca/Donaciones y Agradecimientos',
        cardTheme: t.cardTheme,
        message:
          plan === 'master'
            ? 'Gracias infinitas por tu donación de Maestro a la Fundación StarSeed. Tu aporte hace posible la investigación y el arte libre.'
            : plan === 'creator'
            ? 'Gracias infinitas por tu aporte de Creador. Tu apoyo nutre la evolución constante de Audiomorphic AR.'
            : plan === 'starseed'
            ? 'Gracias por conectar tu esencia al ecosistema StarSeed. Juntos expandimos la geometría armónica.'
            : 'Bienvenido a Audiomorphic AR. Tu resonancia comunitaria expande la red consciente.',
      };

      if (onCardIssued) {
        return onCardIssued(cardDraft);
      }

      return {
        ...cardDraft,
        id: 'card-' + Date.now(),
        issuedAt: new Date().toISOString(),
      };
    },
    [onCardIssued]
  );

  const makeDonation = useCallback(
    (plan: PlanId, donorName?: string, userEmail?: string, userId?: string): ThankYouCardRecord => {
      const t = getTier(plan);
      const next: SubscriptionState = {
        ...state,
        plan,
        since: new Date().toISOString(),
        totalDonated: (state.totalDonated || 0) + t.amountNumber,
      };
      persist(next);

      // Si tiene enlace de Stripe, abrir en pestaña nueva
      const stripeUrl = getStripeUrlForPlan(plan, userEmail, userId);
      if (stripeUrl && typeof window !== 'undefined') {
        window.open(stripeUrl, '_blank', 'noopener,noreferrer');
      }

      return createCardForPlan(plan, donorName);
    },
    [state, persist, getStripeUrlForPlan, createCardForPlan]
  );

  const resetToFree = useCallback(() => {
    persist(DEFAULT_STATE);
  }, [persist]);

  return {
    state,
    tier: getTier(state.plan),
    tiers: TIERS,
    hasStarSeed,
    makeDonation,
    resetToFree,
    getStripeUrlForPlan,
  };
};
