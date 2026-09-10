import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThankYouCardRecord } from '../lib/starseedDb';

/**
 * useSubscription
 * ---------------------------------------------------------------------------
 * Sistema de Donaciones Exclusivas Opcionales & Reconocimiento (sin bloqueo).
 *
 * Transforma las antiguas opciones de suscripción de pago en donaciones voluntarias:
 *   - Los mismos importes y opciones (0€, Código, StarSeed, 4,99€).
 *   - NINGUNA opción bloquea el acceso. El visualizador, micrófono, AR/VR y filtros
 *     son 100% libres y soberanos para todos los usuarios.
 *   - Al donar u optar por cualquier nivel, se otorga una Tarjeta Virtual 3D
 *     de agradecimiento dinámicamente animada.
 */

export type PlanId = 'free' | 'code' | 'starseed' | 'premium';

export interface SubscriptionState {
  plan: PlanId;
  since: string;
  redeemedCode?: string;
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
  accent: 'cyan' | 'emerald' | 'purple' | 'amber';
  cardTheme: 'gold' | 'iridescent' | 'holographic' | 'celestial';
  features: TierFeature[];
}

export const SUBSCRIPTION_STORAGE_KEY = 'audiomorphic.subscription.v2';

const DEMO_CODES: Record<string, PlanId> = {
  'AUDIO-PREMIUM': 'premium',
  'MORPH-VIP': 'premium',
  'STARSEED-FREE': 'free',
  'COSMOS-2025': 'premium',
  'NEON-DREAM': 'code',
};

// All features are included for all tiers - no lockouts!
export const TIERS: TierDefinition[] = [
  {
    id: 'free',
    name: 'Semilla Libre',
    tagline: 'Acceso universal y libre',
    price: '0€',
    amountNumber: 0,
    accent: 'emerald',
    cardTheme: 'celestial',
    features: [
      { label: 'Visualizador completo y micrófono en vivo', included: true },
      { label: 'Piloto Automático (Deriva, Armónico, Génesis)', included: true },
      { label: 'Geometría Sagrada (Flor de la Vida, Metatrón, etc.)', included: true },
      { label: 'Modos 3D VR y Realidad Aumentada (AR)', included: true },
      { label: 'Todos los filtros psicodélicos y efectos visuales', included: true },
      { label: 'Tarjeta de Agradecimiento de la Comunidad', included: true },
    ],
  },
  {
    id: 'code',
    name: 'Código Comunitario',
    tagline: 'Canjea un código de la comunidad',
    price: 'Código',
    amountNumber: 0,
    accent: 'cyan',
    cardTheme: 'holographic',
    features: [
      { label: 'Visualizador completo 100% desbloqueado', included: true },
      { label: 'Tarjeta Holográfica 3D exclusiva de Canje', included: true },
      { label: 'Guardado de tarjeta en biblioteca personal', included: true },
      { label: 'Presets de la comunidad compartidos', included: true },
      { label: 'Sincronización con la red StarSeed', included: true },
    ],
  },
  {
    id: 'starseed',
    name: 'StarSeed Ecosistema',
    tagline: 'Donación & Vínculo Soberano',
    price: 'Ecosistema',
    amountNumber: 0,
    accent: 'purple',
    cardTheme: 'iridescent',
    features: [
      { label: 'Visualizador completo 100% desbloqueado', included: true },
      { label: 'Tarjeta 3D Tornasol & Iridiscente interactiva', included: true },
      { label: 'Sincronización en tiempo real con StarSeed OS', included: true },
      { label: 'Biblioteca compartida con Omnifrecuencias y OS', included: true },
      { label: 'Ajuste y memoria automática de carpetas', included: true },
    ],
  },
  {
    id: 'premium',
    name: 'Donación Cósmica',
    tagline: 'Apoyo voluntario a la investigación sonora',
    price: '4,99€',
    amountNumber: 4.99,
    accent: 'amber',
    cardTheme: 'gold',
    features: [
      { label: 'Visualizador completo 100% desbloqueado', included: true },
      { label: 'Tarjeta Virtual de Oro Iridiscente 3D de Mecenas', included: true },
      { label: 'Efectos holográficos reactivos al giroscopio', included: true },
      { label: 'Guardado permanente en la Biblioteca Soberana', included: true },
      { label: 'Agradecimiento especial en el Manifiesto StarSeed', included: true },
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
      const validPlans: PlanId[] = ['free', 'code', 'starseed', 'premium'];
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

export interface RedeemResult {
  ok: boolean;
  message: string;
  plan?: PlanId;
  card?: ThankYouCardRecord;
}

export const isValidCodeFormat = (raw: string): boolean => {
  const code = raw.trim().toUpperCase();
  if (code.length < 3 || code.length > 32) return false;
  return /^[A-Z0-9-]+$/.test(code);
};

export interface UseSubscriptionResult {
  state: SubscriptionState;
  tier: TierDefinition;
  tiers: TierDefinition[];
  hasStarSeed: boolean;
  selectPlan: (plan: PlanId, donorName?: string) => ThankYouCardRecord;
  makeDonation: (plan: PlanId, donorName?: string, customAmount?: string) => ThankYouCardRecord;
  redeemCode: (raw: string, donorName?: string) => RedeemResult;
  resetToFree: () => void;
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

  const createCardForPlan = useCallback(
    (plan: PlanId, donorName: string = 'Viajero Cósmico', customAmount?: string): ThankYouCardRecord => {
      const t = getTier(plan);
      const cardDraft = {
        donorName,
        tierId: plan,
        tierName: t.name,
        amount: customAmount || t.price,
        folderPath: 'Biblioteca/Donaciones y Agradecimientos',
        cardTheme: t.cardTheme,
        message:
          plan === 'premium'
            ? 'Gracias infinitas por tu apoyo generoso y voluntario a la investigación de Audiomorphic y StarSeed OS.'
            : plan === 'starseed'
            ? 'Gracias por formar parte viva del ecosistema StarSeed y resonar con la conciencia armónica.'
            : plan === 'code'
            ? 'Gracias por activar tu código de comunidad y expandir la geometría sagrada.'
            : 'Bienvenido a la comunidad abierta de Audiomorphic. Tu presencia hace resonar la red.',
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

  const selectPlan = useCallback(
    (plan: PlanId, donorName?: string): ThankYouCardRecord => {
      const next: SubscriptionState = {
        plan,
        since: new Date().toISOString(),
        viaStarSeed: plan === 'starseed' || (plan === 'free' && hasStarSeed),
        redeemedCode: undefined,
      };
      persist(next);
      return createCardForPlan(plan, donorName);
    },
    [hasStarSeed, persist, createCardForPlan]
  );

  const makeDonation = useCallback(
    (plan: PlanId, donorName?: string, customAmount?: string): ThankYouCardRecord => {
      const next: SubscriptionState = {
        ...state,
        plan,
        since: new Date().toISOString(),
      };
      persist(next);
      return createCardForPlan(plan, donorName, customAmount);
    },
    [state, persist, createCardForPlan]
  );

  const redeemCode = useCallback(
    (raw: string, donorName?: string): RedeemResult => {
      const code = raw.trim().toUpperCase();
      if (!code) {
        return { ok: false, message: 'Introduce un código.' };
      }
      if (!isValidCodeFormat(code)) {
        return {
          ok: false,
          message: 'Formato inválido. Usa letras, números y guiones (3–32 caracteres).',
        };
      }

      let grantedPlan: PlanId = 'code';

      if (DEMO_CODES[code]) {
        grantedPlan = DEMO_CODES[code];
      } else if (code.startsWith('SS-') || code.startsWith('STAR-')) {
        grantedPlan = 'starseed';
      }

      const next: SubscriptionState = {
        plan: grantedPlan,
        since: new Date().toISOString(),
        redeemedCode: code,
        viaStarSeed: false,
      };
      persist(next);

      const card = createCardForPlan(grantedPlan, donorName || `Donador #${code.slice(-4)}`);
      const tierName = getTier(grantedPlan).name;

      return {
        ok: true,
        message: `¡Código canjeado con éxito! Se ha generado tu Tarjeta 3D (${tierName}).`,
        plan: grantedPlan,
        card,
      };
    },
    [persist, createCardForPlan]
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
    makeDonation,
    redeemCode,
    resetToFree,
  };
};

export default useSubscription;
