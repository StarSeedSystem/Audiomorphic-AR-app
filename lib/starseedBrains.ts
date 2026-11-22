import { supabase } from './supabaseClient';
import { Preset, ThankYouCardRecord } from './starseedDb';

export type BrainAccessLevel = 'admin' | 'escritura' | 'lectura';

export interface BrainStorageMethod {
  id: string;
  kind: string;
  name: string;
  status: string;
  enabled: boolean;
  isPrimary: boolean;
}

export interface BrainNeuronDevice {
  id: string;
  name: string;
  kind: string;
  platform?: string;
  lastSeenAt?: string;
  isOnline: boolean;
  isCurrentDevice: boolean;
}

export interface StarseedBrain {
  id: string;
  owner: string;
  ownerHandle?: string;
  name: string;
  scope: string;
  scopeRef?: string | null;
  description?: string;
  accessLevel: BrainAccessLevel;
  isOwner: boolean;
  storageMethods: BrainStorageMethod[];
  devices: BrainNeuronDevice[];
  updatedAt: number;
  isVirtualFallback?: boolean;
}

export type SyncState =
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'offline_queued'
  | 'read_only'
  | 'local_only'
  | 'error';

export interface AudiomorphicLibraryArchiveV2 {
  schema: 'audiomorphic.library.v2';
  exportedAt: number;
  revision: number;
  source: 'starseed_brain' | 'local_device' | 'export';
  accountId?: string | null;
  brainId?: string | null;
  brainName?: string | null;
  updatedByNeuronId?: string;
  updatedByNeuronName?: string;
  folders: string[];
  presets: Preset[];
  thankYouCards?: ThankYouCardRecord[];
}

export interface BrainUserIdentity {
  id: string;
  email?: string;
  handle?: string | null;
  displayName?: string | null;
}

export const AUDIOMORPHIC_CONTEXT = 'audiomorphic';
export const AUDIOMORPHIC_CONTEXT_REF = 'preset_library';
export const OS_FILES_BUCKET = 'os-files';
export const MEMORY_FILE_NAME = 'audiomorphic_library.json';
export const NEURON_DEVICE_ID_KEY = 'starseed.neuron.device-id';
export const ONLINE_WINDOW_MS = 12 * 60_000;
const HEARTBEAT_TTL_MS = 5 * 60_000;
const VIRTUAL_DEFAULT_BRAIN_PREFIX = 'am-personal-';

export const ESSENTIALS_FOLDER_NAME = 'Audiomorphic Essentials';

export const DEFAULT_FOLDERS = [
  ESSENTIALS_FOLDER_NAME,
  'Ritmos en Vivo',
  'Sesión Meditativa',
  'Favoritos',
];

export const AUDIOMORPHIC_ESSENTIALS_PRESETS: Preset[] = [
  {
    id: 'essential_rhythmic',
    name: 'Ritmos Musicales',
    description:
      'Alineación reactiva a transitorios, bombos y cambios tonales rítmicos en tiempo real con geometría de flor de la vida y cimática.',
    folder: ESSENTIALS_FOLDER_NAME,
    category: 'rhythmic',
    createdAt: 1700000000007,
    params: JSON.stringify({
      autoPilot: true,
      autoPilotMode: 'rhythmic',
      autoRandomMode: 'rhythmic',
      autoRandomOnBeat: true,
      autoRandomOnEmotionChange: true,
      autoEmotionSensitivity: 50,
      autoBeatSensitivity: 65,
      autoStyleFluidity: 55,
      autoRandomReactivitySpeed: 60,
      autoTransitionSmoothness: 70,
      autoRelationshipMode: 'technical',
      autoOffscreenFade: true,
      k: 0.992,
      psi: 2.399,
      sensitivity: 1.5,
      harmonicColor: true,
      sacredGeometryEnabled: true,
      sacredGeometryModes: ['flowerOfLife', 'cymatics', 'goldenSpiral'],
    }),
  },
  {
    id: 'essential_dj',
    name: 'Modo DJ',
    description:
      'Reacción percusiva agresiva con transiciones rápidas en bombos, caídas y drops de música electrónica y mezclas en vivo.',
    folder: ESSENTIALS_FOLDER_NAME,
    category: 'rhythmic',
    createdAt: 1700000000006,
    params: JSON.stringify({
      autoPilot: true,
      autoPilotMode: 'dj',
      autoRandomMode: 'dj',
      autoRandomOnBeat: true,
      autoRandomOnEmotionChange: true,
      autoEmotionSensitivity: 60,
      autoBeatSensitivity: 75,
      autoStyleFluidity: 60,
      autoRandomReactivitySpeed: 75,
      autoTransitionSmoothness: 80,
      autoRelationshipMode: 'rhythmic',
      autoOffscreenFade: true,
      k: 0.995,
      psi: 3.14,
      harmonicColor: true,
      sacredGeometryEnabled: true,
      sacredGeometryModes: ['metatron', 'torus', 'vectorEquilibrium'],
    }),
  },
  {
    id: 'essential_sacred',
    name: 'Resonancias Sagradas',
    description:
      'Evolución suave y profunda de geometrías áureas, activando el Cubo de Metatrón, Sri Yantra y Merkaba para meditación y música sacra.',
    folder: ESSENTIALS_FOLDER_NAME,
    category: 'sacred',
    createdAt: 1700000000005,
    params: JSON.stringify({
      autoPilot: true,
      autoPilotMode: 'sacred',
      autoRandomMode: 'sacred',
      autoRandomOnBeat: false,
      autoRandomOnEmotionChange: true,
      autoEmotionSensitivity: 50,
      autoBeatSensitivity: 50,
      autoStyleFluidity: 70,
      autoRelationshipMode: 'empathetic',
      autoOffscreenFade: true,
      k: 1.002,
      psi: 2.399,
      sacredGeometryEnabled: true,
      sacredGeometryModes: ['metatron', 'flowerOfLife', 'sriYantra', 'merkaba'],
    }),
  },
  {
    id: 'essential_rainbow',
    name: 'Sinfonía Arcoíris',
    description:
      'Recorrido espectral cromático completo con modulación armónica de color según el tono y timbre de la melodía.',
    folder: ESSENTIALS_FOLDER_NAME,
    category: 'harmonic',
    createdAt: 1700000000004,
    params: JSON.stringify({
      autoPilot: true,
      autoPilotMode: 'rainbow',
      autoRandomMode: 'rainbow',
      autoRandomOnBeat: true,
      autoRandomOnEmotionChange: true,
      autoEmotionSensitivity: 55,
      autoBeatSensitivity: 60,
      baseHue: 180,
      hueRange: 360,
      saturation: 100,
      harmonicColor: true,
      sacredGeometryEnabled: true,
      sacredGeometryModes: ['cymatics', 'torus', 'mandala1'],
    }),
  },
  {
    id: 'essential_astral',
    name: 'Astromorphociberpsicodélico',
    description:
      'Viaje dimensional multidireccional con fractales holográficos, ondas cuánticas y distorsiones psicodélicas avanzadas.',
    folder: ESSENTIALS_FOLDER_NAME,
    category: 'quantum',
    createdAt: 1700000000003,
    params: JSON.stringify({
      autoPilot: true,
      autoPilotMode: 'astral',
      autoRandomMode: 'astral',
      autoRandomOnBeat: true,
      autoRandomOnEmotionChange: true,
      autoStyleFluidity: 85,
      autoRandomReactivitySpeed: 70,
      k: 0.998,
      psi: 1.57,
      sacredGeometryEnabled: true,
      sacredGeometryModes: ['quantumWave', 'holographicFractal', 'chakras'],
    }),
  },
  {
    id: 'essential_smart',
    name: 'Modo Inteligente',
    description:
      'Análisis emocional continuo de la música (brillo, calidez, tempo) que transmuta armónicamente todos los parámetros del visualizador.',
    folder: ESSENTIALS_FOLDER_NAME,
    category: 'custom',
    createdAt: 1700000000002,
    params: JSON.stringify({
      autoPilot: true,
      autoPilotMode: 'smart',
      autoRandomMode: 'smart',
      autoRandomOnBeat: true,
      autoRandomOnEmotionChange: true,
      autoEmotionSensitivity: 50,
      autoBeatSensitivity: 50,
      autoStyleFluidity: 50,
      autoRelationshipMode: 'empathetic',
      k: 0.994,
      sacredGeometryEnabled: true,
    }),
  },
  {
    id: 'essential_random',
    name: 'Aleatorio Total',
    description:
      'Exploración y mutación impredecible de patrones cada intervalo de tiempo, descubriendo dimensiones visuales espontáneas.',
    folder: ESSENTIALS_FOLDER_NAME,
    category: 'custom',
    createdAt: 1700000000001,
    params: JSON.stringify({
      autoPilot: true,
      autoPilotMode: 'random',
      autoRandomMode: 'random',
      autoRandomInterval: 10,
      autoRandomOnBeat: false,
      autoRandomOnEmotionChange: false,
    }),
  },
];

export const ESSENTIAL_IDS = new Set(AUDIOMORPHIC_ESSENTIALS_PRESETS.map((p) => p.id));

export const mergePresetsWithEssentials = (rawList: Preset[]): Preset[] => {
  const safeList = Array.isArray(rawList) ? rawList : [];
  const filtered = safeList.filter((p) => p && (ESSENTIAL_IDS.has(p.id) || p.folder !== ESSENTIALS_FOLDER_NAME));
  const userCustom = filtered.filter((p) => !ESSENTIAL_IDS.has(p.id));
  const orderedEssentials = AUDIOMORPHIC_ESSENTIALS_PRESETS.map((essential) => {
    const existing = filtered.find((p) => p.id === essential.id);
    return existing
      ? {
          ...essential,
          ...existing,
          name: essential.name,
          description: essential.description,
          folder: ESSENTIALS_FOLDER_NAME,
          category: essential.category,
        }
      : essential;
  });
  return [...orderedEssentials, ...userCustom];
};

const cacheKeyForBrains = (uid: string) => `am_brains_cache_v1_${uid}`;
const cacheKeyForNeurons = (uid: string) => `am_neurons_cache_v1_${uid}`;
const selectionKeyForUser = (uid: string) => `am_selected_brain_v1_${uid}`;
const pendingQueueKeyForBrain = (uid: string, brainId: string) => `am_brain_sync_queue_v1_${uid}_${brainId}`;
const initAttemptKeyForUser = (uid: string) => `am_brain_init_attempted_v1_${uid}`;
const heartbeatStampKey = (uid: string, nid: string) => `am_neuron_hb_v1_${uid}_${nid}`;

export const getBrainLibraryStoragePath = (brainOwnerId: string, brainId: string) =>
  `${brainOwnerId}/cerebros/${brainId}/${AUDIOMORPHIC_CONTEXT}/_library_tree.json`;

export const canWriteBrain = (brain: StarseedBrain | null): boolean => {
  if (!brain) return true;
  return brain.accessLevel === 'admin' || brain.accessLevel === 'escritura';
};

function safeRandomId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateLocalNeuronInfo(): {
  id: string;
  name: string;
  kind: 'desktop' | 'mobile' | 'tablet' | 'other';
  platform: string;
} {
  let id = '';
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      id = window.localStorage.getItem(NEURON_DEVICE_ID_KEY) || '';
      if (!id) {
        id = safeRandomId();
        window.localStorage.setItem(NEURON_DEVICE_ID_KEY, id);
      }
    }
  } catch {
    /* ignore */
  }
  if (!id) id = 'local-neuron';

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const platform =
    /android/i.test(ua)
      ? 'Android'
      : /iphone|ipod/i.test(ua)
      ? 'iOS'
      : /ipad/i.test(ua)
      ? 'iPadOS'
      : /mac os x|macintosh/i.test(ua)
      ? 'macOS'
      : /windows/i.test(ua)
      ? 'Windows'
      : /linux/i.test(ua)
      ? 'Linux'
      : 'Web';

  const isElectron =
    typeof window !== 'undefined' &&
    (Boolean((window as any).electronAPI) || /Electron/i.test(ua));
  const isCapacitor =
    typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());
  const touch =
    typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: coarse)')?.matches);

  const kind: 'desktop' | 'mobile' | 'tablet' | 'other' =
    platform === 'Android' || platform === 'iOS'
      ? 'mobile'
      : platform === 'iPadOS' || (touch && platform !== 'macOS' && platform !== 'Windows')
      ? 'tablet'
      : 'desktop';

  const runtimeLabel = isElectron ? 'Desktop' : isCapacitor ? 'App' : 'Web';
  const name = `Audiomorphic · ${platform} (${runtimeLabel})`;

  return { id, name, kind, platform };
}

export async function registerNeuronHeartbeat(userId: string, force = false): Promise<void> {
  if (!userId) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  const neuron = getOrCreateLocalNeuronInfo();
  try {
    if (!force && typeof window !== 'undefined' && window.localStorage) {
      const last = Number(window.localStorage.getItem(heartbeatStampKey(userId, neuron.id)) || '0');
      if (Date.now() - last < HEARTBEAT_TTL_MS) return;
    }
  } catch {
    /* ignore */
  }

  try {
    const payload: Record<string, unknown> = {
      id: neuron.id,
      owner: userId,
      name: neuron.name,
      kind: neuron.kind,
      capabilities: {
        platform: neuron.platform,
        app: 'Audiomorphic',
        version: '1.4.0',
        installedApp:
          typeof window !== 'undefined' &&
          (Boolean((window as any).electronAPI) ||
            Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
            Boolean(window.matchMedia?.('(display-mode: standalone)')?.matches)),
      },
      last_seen_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('neuron_devices').upsert(payload, { onConflict: 'id' });
    if (!error && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(heartbeatStampKey(userId, neuron.id), String(Date.now()));
    }
  } catch {
    /* non-blocking */
  }
}

const sanitizeIdentifier = (s?: string | null) => (s || '').toLowerCase().trim().replace(/^@/, '');

export const resolveUserBrainPermission = (row: any, user: BrainUserIdentity): BrainAccessLevel => {
  if (!row) return 'lectura';
  if (row.owner === user.id) return 'admin';

  const userKeys = new Set(
    [
      sanitizeIdentifier(user.id),
      sanitizeIdentifier(user.email),
      sanitizeIdentifier(user.handle),
      sanitizeIdentifier(user.displayName),
    ].filter(Boolean)
  );

  const perms = Array.isArray(row?.includes?.permissions) ? row.includes.permissions : [];
  for (const entry of perms) {
    const candidates = [
      sanitizeIdentifier(entry?.who),
      sanitizeIdentifier(entry?.user_id),
      sanitizeIdentifier(entry?.userId),
      sanitizeIdentifier(entry?.email),
      sanitizeIdentifier(entry?.handle),
    ].filter(Boolean);

    const matches = candidates.some((c) => userKeys.has(c) || c === '*' || c === 'all');
    if (matches) {
      const rawLevel = sanitizeIdentifier(entry?.level || entry?.role || entry?.access || 'lectura');
      if (rawLevel === 'admin' || rawLevel === 'owner' || rawLevel === 'administrador') return 'admin';
      if (
        rawLevel === 'escritura' ||
        rawLevel === 'write' ||
        rawLevel === 'edit' ||
        rawLevel === 'editor' ||
        rawLevel === 'read_write'
      ) {
        return 'escritura';
      }
      return 'lectura';
    }
  }

  return 'lectura';
};

const normalizeBackend = (b: any): BrainStorageMethod => ({
  id: String(b?.id || safeRandomId()),
  kind: String(b?.kind || 'cloud_supabase'),
  name: String(b?.name || b?.kind || 'Nube StarSeed OS'),
  status: String(b?.status || (b?.enabled === false ? 'offline' : 'active')),
  enabled: b?.enabled !== false,
  isPrimary: Boolean(b?.is_primary),
});

const defaultStorageMethods = (): BrainStorageMethod[] => [
  {
    id: 'starseed-cloud',
    kind: 'cloud_supabase',
    name: 'Nube StarSeed OS (os-files + memoria)',
    status: 'active',
    enabled: true,
    isPrimary: true,
  },
];

export const getCachedBrains = (uid: string): StarseedBrain[] => {
  try {
    const raw = localStorage.getItem(cacheKeyForBrains(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const setCachedBrains = (uid: string, brains: StarseedBrain[]): void => {
  try {
    localStorage.setItem(cacheKeyForBrains(uid), JSON.stringify(brains));
  } catch {
    /* ignore */
  }
};

export const getCachedNeurons = (uid: string): BrainNeuronDevice[] => {
  try {
    const raw = localStorage.getItem(cacheKeyForNeurons(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const setCachedNeurons = (uid: string, neurons: BrainNeuronDevice[]): void => {
  try {
    localStorage.setItem(cacheKeyForNeurons(uid), JSON.stringify(neurons));
  } catch {
    /* ignore */
  }
};

export const getRememberedSelectedBrainId = (uid: string): string | null => {
  try {
    return localStorage.getItem(selectionKeyForUser(uid));
  } catch {
    return null;
  }
};

export const setRememberedSelectedBrainId = (uid: string, brainId: string): void => {
  try {
    localStorage.setItem(selectionKeyForUser(uid), brainId);
  } catch {
    /* ignore */
  }
};

function withTimeout<T>(promise: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, ms);
    Promise.resolve(promise)
      .then((res) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(res);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(fallback);
        }
      });
  });
}

export const buildFallbackBrain = (user: BrainUserIdentity): StarseedBrain => {
  const localNeuron = getOrCreateLocalNeuronInfo();
  return {
    id: `${VIRTUAL_DEFAULT_BRAIN_PREFIX}${user.id.slice(0, 12)}`,
    owner: user.id,
    ownerHandle: user.handle || user.displayName || undefined,
    name: `Cerebro Principal · ${user.displayName || 'StarSeed'}`,
    scope: 'app',
    scopeRef: AUDIOMORPHIC_CONTEXT,
    description: 'Cerebro personal de Audiomorphic sincronizado con tu cuenta StarSeed OS.',
    accessLevel: 'admin',
    isOwner: true,
    storageMethods: defaultStorageMethods(),
    devices: [
      {
        id: localNeuron.id,
        name: localNeuron.name,
        kind: localNeuron.kind,
        platform: localNeuron.platform,
        lastSeenAt: new Date().toISOString(),
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : false,
        isCurrentDevice: true,
      },
    ],
    updatedAt: Date.now(),
    isVirtualFallback: true,
  };
};

export const fetchUserBrains = async (
  user: BrainUserIdentity
): Promise<{
  brains: StarseedBrain[];
  selectedBrainId: string;
  neurons: BrainNeuronDevice[];
  offline: boolean;
}> => {
  const localNeuron = getOrCreateLocalNeuronInfo();
  const cachedFallback = (): {
    brains: StarseedBrain[];
    selectedBrainId: string;
    neurons: BrainNeuronDevice[];
    offline: boolean;
  } => {
    const cached = getCachedBrains(user.id);
    const cachedNeurons = getCachedNeurons(user.id);
    const brains = cached.length > 0 ? cached : [buildFallbackBrain(user)];
    const neurons: BrainNeuronDevice[] =
      cachedNeurons.length > 0
        ? cachedNeurons.map((n) => ({
            ...n,
            isCurrentDevice: n.id === localNeuron.id,
            isOnline: false,
          }))
        : [
            {
              id: localNeuron.id,
              name: localNeuron.name,
              kind: localNeuron.kind,
              platform: localNeuron.platform,
              lastSeenAt: new Date().toISOString(),
              isOnline: false,
              isCurrentDevice: true,
            },
          ];
    const localSelected = getRememberedSelectedBrainId(user.id);
    const selectedBrainId =
      (localSelected && brains.some((b) => b.id === localSelected) && localSelected) || brains[0].id;
    return { brains, selectedBrainId, neurons, offline: true };
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return cachedFallback();
  }

  try {
    // Register current device neuron heartbeat in background
    registerNeuronHeartbeat(user.id).catch(() => {});

    const timeoutSentinel = Symbol('timeout');
    const queryPromise = Promise.all([
      supabase.from('brains').select('*').order('updated_at', { ascending: false }),
      supabase.from('storage_backends').select('*').eq('owner', user.id),
      supabase.from('neuron_devices').select('id, name, kind, capabilities, last_seen_at').limit(30),
      supabase
        .from('brain_selections')
        .select('brain_id')
        .eq('owner', user.id)
        .eq('context', AUDIOMORPHIC_CONTEXT)
        .limit(1)
        .maybeSingle(),
    ]);

    const result = await withTimeout<any>(queryPromise, 4000, timeoutSentinel);
    if (result === timeoutSentinel) {
      return cachedFallback();
    }

    const [brainsRes, backendsRes, devicesRes, selectionRes] = result;
    if (brainsRes?.error) {
      throw brainsRes.error;
    }

    let rows = Array.isArray(brainsRes?.data) ? brainsRes.data : [];

    // Single-init guard: create default cloud brain once if empty
    const hasOwned = rows.some((r: any) => r.owner === user.id);
    if (rows.length === 0 && !hasOwned && !localStorage.getItem(initAttemptKeyForUser(user.id))) {
      localStorage.setItem(initAttemptKeyForUser(user.id), '1');
      try {
        const { data: created, error: createErr } = await supabase
          .from('brains')
          .insert({
            owner: user.id,
            name: 'Cerebro Principal · Audiomorphic',
            scope: 'app',
            scope_ref: AUDIOMORPHIC_CONTEXT,
            description: 'Cerebro inicial para presets, folders y memorias sinestésicas de Audiomorphic.',
            config: { app: AUDIOMORPHIC_CONTEXT },
            includes: { app: AUDIOMORPHIC_CONTEXT, backends: [], permissions: [] },
          })
          .select('*')
          .single();
        if (!createErr && created) {
          rows = [created];
        }
      } catch {
        /* ignore RLS */
      }
    }

    const userBackends: BrainStorageMethod[] =
      Array.isArray(backendsRes?.data) && backendsRes.data.length > 0
        ? backendsRes.data.map(normalizeBackend)
        : defaultStorageMethods();

    const nowMs = Date.now();
    const rawDevices = Array.isArray(devicesRes?.data) ? devicesRes.data : [];
    const devices: BrainNeuronDevice[] = rawDevices.map((d: any) => {
      const lastSeenMs = d.last_seen_at ? new Date(d.last_seen_at).getTime() : 0;
      const isCurrent = String(d.id) === localNeuron.id;
      return {
        id: String(d.id),
        name: String(d.name || 'Dispositivo'),
        kind: String(d.kind || 'desktop'),
        platform: d.capabilities?.platform ? String(d.capabilities.platform) : undefined,
        lastSeenAt: d.last_seen_at,
        isOnline: isCurrent || (lastSeenMs > 0 && nowMs - lastSeenMs < ONLINE_WINDOW_MS),
        isCurrentDevice: isCurrent,
      };
    });

    if (!devices.some((d) => d.id === localNeuron.id)) {
      devices.unshift({
        id: localNeuron.id,
        name: localNeuron.name,
        kind: localNeuron.kind,
        platform: localNeuron.platform,
        lastSeenAt: new Date().toISOString(),
        isOnline: true,
        isCurrentDevice: true,
      });
    }

    let mapped: StarseedBrain[] = rows.map((row: any) => {
      const accessLevel = resolveUserBrainPermission(row, user);
      const isOwner = row.owner === user.id;
      const backendIds: string[] = Array.isArray(row?.includes?.backends) ? row.includes.backends : [];
      const brainBackends =
        isOwner && backendIds.length > 0
          ? userBackends.filter((b) => backendIds.includes(b.id) || b.isPrimary)
          : isOwner
          ? userBackends
          : defaultStorageMethods();

      return {
        id: String(row.id),
        owner: String(row.owner || user.id),
        ownerHandle:
          row?.includes?.owner_handle || (isOwner ? user.handle || user.displayName || undefined : 'Compartido'),
        name: String(row.name || 'Cerebro StarSeed OS'),
        scope: String(row.scope || 'global'),
        scopeRef: row.scope_ref || null,
        description: row.description || undefined,
        accessLevel,
        isOwner,
        storageMethods: brainBackends.length > 0 ? brainBackends : defaultStorageMethods(),
        devices,
        updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
      };
    });

    if (mapped.length === 0) {
      mapped = [buildFallbackBrain(user)];
    }

    setCachedBrains(user.id, mapped);
    setCachedNeurons(user.id, devices);

    const cloudSelected = selectionRes?.data?.brain_id;
    const localSelected = getRememberedSelectedBrainId(user.id);
    const chosenId =
      (cloudSelected && mapped.some((b) => b.id === cloudSelected) && cloudSelected) ||
      (localSelected && mapped.some((b) => b.id === localSelected) && localSelected) ||
      mapped[0].id;

    setRememberedSelectedBrainId(user.id, chosenId);
    return { brains: mapped, selectedBrainId: chosenId, neurons: devices, offline: false };
  } catch {
    return cachedFallback();
  }
};

export const persistBrainSelection = async (userId: string, brainId: string): Promise<void> => {
  setRememberedSelectedBrainId(userId, brainId);
  if (!userId || brainId.startsWith(VIRTUAL_DEFAULT_BRAIN_PREFIX)) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  try {
    await supabase.from('brain_selections').upsert(
      {
        owner: userId,
        context: AUDIOMORPHIC_CONTEXT,
        context_ref: AUDIOMORPHIC_CONTEXT_REF,
        brain_id: brainId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'owner,context,context_ref' }
    );
  } catch {
    /* non-blocking */
  }
};

export const createStarseedBrain = async (
  user: BrainUserIdentity,
  name: string,
  description?: string
): Promise<{ ok: boolean; brain?: StarseedBrain; error?: string }> => {
  const cleanName = name.trim();
  if (!cleanName) return { ok: false, error: 'Ingresa un nombre para el cerebro.' };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { ok: false, error: 'Necesitas conexión a internet para crear un nuevo cerebro en tu cuenta.' };
  }

  try {
    const { data, error } = await supabase
      .from('brains')
      .insert({
        owner: user.id,
        name: cleanName,
        scope: 'app',
        scope_ref: AUDIOMORPHIC_CONTEXT,
        description: description?.trim() || 'Cerebro de presets y configuraciones sinestésicas de Audiomorphic',
        config: { app: AUDIOMORPHIC_CONTEXT },
        includes: { app: AUDIOMORPHIC_CONTEXT, backends: [], permissions: [] },
      })
      .select('*')
      .single();

    if (error || !data) {
      throw error || new Error('No se pudo crear el cerebro en StarSeed OS.');
    }

    const newBrain: StarseedBrain = {
      id: String(data.id),
      owner: user.id,
      ownerHandle: user.handle || user.displayName || undefined,
      name: String(data.name || cleanName),
      scope: String(data.scope || 'app'),
      scopeRef: data.scope_ref || AUDIOMORPHIC_CONTEXT,
      description: data.description || undefined,
      accessLevel: 'admin',
      isOwner: true,
      storageMethods: defaultStorageMethods(),
      devices: getCachedNeurons(user.id),
      updatedAt: Date.now(),
    };

    const existing = getCachedBrains(user.id).filter((b) => !b.isVirtualFallback);
    setCachedBrains(user.id, [newBrain, ...existing]);
    await persistBrainSelection(user.id, newBrain.id);
    return { ok: true, brain: newBrain };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error al crear el cerebro en StarSeed OS.' };
  }
};

export const buildAudiomorphicArchive = (
  folders: string[],
  presets: Preset[],
  opts: {
    source: AudiomorphicLibraryArchiveV2['source'];
    accountId?: string | null;
    brainId?: string | null;
    brainName?: string | null;
    revision?: number;
  }
): AudiomorphicLibraryArchiveV2 => {
  const neuron = getOrCreateLocalNeuronInfo();
  const normalizedFolders = Array.from(
    new Set([
      ESSENTIALS_FOLDER_NAME,
      ...folders.filter(Boolean),
      ...presets.map((p) => p.folder).filter((f): f is string => Boolean(f)),
    ])
  );
  return {
    schema: 'audiomorphic.library.v2',
    exportedAt: Date.now(),
    revision: opts.revision || Date.now(),
    source: opts.source,
    accountId: opts.accountId || null,
    brainId: opts.brainId || null,
    brainName: opts.brainName || null,
    updatedByNeuronId: neuron.id,
    updatedByNeuronName: neuron.name,
    folders: normalizedFolders,
    presets: mergePresetsWithEssentials(presets),
  };
};

export function parseBrainArchiveRaw(rawText?: string | null): AudiomorphicLibraryArchiveV2 | null {
  if (!rawText) return null;
  try {
    const parsed = JSON.parse(rawText);
    if (!parsed || typeof parsed !== 'object') return null;

    if (parsed.schema === 'audiomorphic.library.v2' && Array.isArray(parsed.presets)) {
      return {
        schema: 'audiomorphic.library.v2',
        exportedAt: Number(parsed.exportedAt) || Date.now(),
        revision: Number(parsed.revision || parsed.exportedAt) || 0,
        source: parsed.source || 'starseed_brain',
        accountId: parsed.accountId || null,
        brainId: parsed.brainId || null,
        brainName: parsed.brainName || null,
        updatedByNeuronId: parsed.updatedByNeuronId,
        updatedByNeuronName: parsed.updatedByNeuronName,
        folders: Array.isArray(parsed.folders) ? parsed.folders : DEFAULT_FOLDERS,
        presets: mergePresetsWithEssentials(parsed.presets),
      };
    }

    if (Array.isArray(parsed.presets)) {
      return buildAudiomorphicArchive(
        Array.isArray(parsed.folders) ? parsed.folders : DEFAULT_FOLDERS,
        parsed.presets,
        {
          source: 'starseed_brain',
          revision: Number(parsed.revision || parsed.updatedAt || parsed.exportedAt) || 0,
        }
      );
    }
  } catch {
    /* ignore malformed JSON */
  }
  return null;
}

export const queuePendingBrainSync = (
  uid: string,
  brainId: string,
  archive: AudiomorphicLibraryArchiveV2
): void => {
  try {
    localStorage.setItem(pendingQueueKeyForBrain(uid, brainId), JSON.stringify(archive));
  } catch {
    /* ignore */
  }
};

export const getPendingBrainSync = (uid: string, brainId: string): AudiomorphicLibraryArchiveV2 | null => {
  try {
    const raw = localStorage.getItem(pendingQueueKeyForBrain(uid, brainId));
    if (!raw) return null;
    return parseBrainArchiveRaw(raw);
  } catch {
    return null;
  }
};

export const clearPendingBrainSync = (uid: string, brainId: string): void => {
  try {
    localStorage.removeItem(pendingQueueKeyForBrain(uid, brainId));
  } catch {
    /* ignore */
  }
};

export const pullBrainLibraryFromOS = async (
  user: BrainUserIdentity,
  brain: StarseedBrain
): Promise<{ found: boolean; archive?: AudiomorphicLibraryArchiveV2; offline?: boolean; error?: string }> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { found: false, offline: true };
  }

  let bestArchive: AudiomorphicLibraryArchiveV2 | null = null;
  const considerRaw = (rawText?: string | null) => {
    const candidate = parseBrainArchiveRaw(rawText);
    if (candidate) {
      if (!bestArchive || candidate.revision >= bestArchive.revision) {
        bestArchive = {
          ...candidate,
          accountId: user.id,
          brainId: brain.id,
          brainName: brain.name,
        };
      }
    }
  };

  try {
    if (!brain.isVirtualFallback) {
      // 1. brain_memory_files (primary cross-device realtime sync channel)
      const memRes = await withTimeout<any>(
        supabase
          .from('brain_memory_files')
          .select('content, updated_at')
          .eq('brain_id', brain.id)
          .eq('name', MEMORY_FILE_NAME)
          .order('updated_at', { ascending: false })
          .limit(1),
        3500,
        { data: null }
      );

      if (Array.isArray(memRes?.data) && memRes.data[0]?.content) {
        considerRaw(memRes.data[0].content);
      }

      // 2. os-files storage bucket canonical path
      const canonicalPath = getBrainLibraryStoragePath(brain.owner, brain.id);
      const blobRes = await withTimeout<any>(
        supabase.storage.from(OS_FILES_BUCKET).download(canonicalPath),
        3500,
        { data: null }
      );
      if (blobRes?.data) {
        const text = await blobRes.data.text();
        considerRaw(text);
      }

      // 3. Fallback collaborator path
      if (!bestArchive && !brain.isOwner) {
        const sharedPath = getBrainLibraryStoragePath(user.id, brain.id);
        const sharedRes = await withTimeout<any>(
          supabase.storage.from(OS_FILES_BUCKET).download(sharedPath),
          2500,
          { data: null }
        );
        if (sharedRes?.data) {
          const text = await sharedRes.data.text();
          considerRaw(text);
        }
      }
    }

    // 4. Legacy user_settings.prefs.audiomorphic_presets_v2 migration fallback
    if (!bestArchive) {
      const legacyRes = await withTimeout<any>(
        supabase.from('user_settings').select('prefs').eq('user_id', user.id).maybeSingle(),
        2500,
        { data: null }
      );
      const legacyPresets = legacyRes?.data?.prefs?.audiomorphic_presets_v2;
      if (Array.isArray(legacyPresets) && legacyPresets.length > 0) {
        bestArchive = buildAudiomorphicArchive(DEFAULT_FOLDERS, legacyPresets, {
          source: 'starseed_brain',
          accountId: user.id,
          brainId: brain.id,
          brainName: brain.name,
          revision: 1,
        });
      }
    }

    if (bestArchive) {
      return { found: true, archive: bestArchive };
    }
    return { found: false };
  } catch (err: any) {
    return {
      found: false,
      offline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
      error: err?.message,
    };
  }
};

export const pushBrainLibraryToOS = async (
  user: BrainUserIdentity,
  brain: StarseedBrain,
  folders: string[],
  presets: Preset[],
  revision: number = Date.now()
): Promise<{
  ok: boolean;
  syncState: SyncState;
  archive: AudiomorphicLibraryArchiveV2;
  error?: string;
}> => {
  const archive = buildAudiomorphicArchive(folders, presets, {
    source: 'starseed_brain',
    accountId: user.id,
    brainId: brain.id,
    brainName: brain.name,
    revision,
  });

  if (!canWriteBrain(brain)) {
    return {
      ok: false,
      syncState: 'read_only',
      archive,
      error: `Tu acceso al cerebro "${brain.name}" es de solo lectura.`,
    };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    queuePendingBrainSync(user.id, brain.id, archive);
    return {
      ok: false,
      syncState: 'offline_queued',
      archive,
      error: 'Sin conexión: cambios guardados localmente y en cola para sincronizar.',
    };
  }

  const neuron = getOrCreateLocalNeuronInfo();
  const jsonPayload = JSON.stringify(archive, null, 2);
  let anyChannelSucceeded = false;

  if (!brain.isVirtualFallback) {
    // Channel A: Upload to Storage bucket 'os-files' & upsert 'os_files' catalog row
    const preferredPath = getBrainLibraryStoragePath(brain.isOwner ? user.id : brain.owner, brain.id);
    const fallbackSharedPath = getBrainLibraryStoragePath(user.id, brain.id);
    const paths = preferredPath === fallbackSharedPath ? [preferredPath] : [preferredPath, fallbackSharedPath];

    for (const pathCandidate of paths) {
      try {
        const blob = new Blob([jsonPayload], { type: 'application/json' });
        const { error: uploadErr } = await supabase.storage
          .from(OS_FILES_BUCKET)
          .upload(pathCandidate, blob, { upsert: true, contentType: 'application/json' });

        if (!uploadErr) {
          anyChannelSucceeded = true;
          const { data: pubData } = supabase.storage.from(OS_FILES_BUCKET).getPublicUrl(pathCandidate);
          try {
            const { data: existingRow } = await supabase
              .from('os_files')
              .select('id')
              .eq('path', pathCandidate)
              .limit(1)
              .maybeSingle();

            const fileRow = {
              owner: brain.isOwner ? user.id : brain.owner,
              profile_id: user.id,
              name: '_library_tree.json',
              mime: 'application/json',
              size: blob.size,
              path: pathCandidate,
              url: pubData?.publicUrl || null,
              is_public: false,
              meta: {
                app: AUDIOMORPHIC_CONTEXT,
                brain_id: brain.id,
                brain_name: brain.name,
                revision,
                folders_count: archive.folders.length,
                presets_count: archive.presets.length,
                updated_by: user.id,
                updated_by_neuron_id: neuron.id,
                updated_by_neuron_name: neuron.name,
              },
            };

            if (existingRow?.id) {
              await supabase.from('os_files').update(fileRow).eq('id', existingRow.id);
            } else {
              await supabase.from('os_files').insert(fileRow);
            }
          } catch {
            /* best effort catalog row */
          }
          break;
        }
      } catch {
        /* try fallback path */
      }
    }

    // Channel B: Mirror to brain_memory_files for multi-device/neuron realtime sync
    try {
      const { data: existingMem } = await supabase
        .from('brain_memory_files')
        .select('id')
        .eq('brain_id', brain.id)
        .eq('name', MEMORY_FILE_NAME)
        .limit(1)
        .maybeSingle();

      const memPayload = {
        owner: brain.owner || user.id,
        brain_id: brain.id,
        name: MEMORY_FILE_NAME,
        content: jsonPayload,
        source: AUDIOMORPHIC_CONTEXT,
        meta: {
          app: AUDIOMORPHIC_CONTEXT,
          revision,
          folders_count: archive.folders.length,
          presets_count: archive.presets.length,
          updated_by: user.id,
          updated_by_neuron_id: neuron.id,
          updated_by_neuron_name: neuron.name,
        },
        sync: {
          mode: 'realtime',
          app: AUDIOMORPHIC_CONTEXT,
          revision,
        },
        updated_at: new Date().toISOString(),
      };

      if (existingMem?.id) {
        const { error: updErr } = await supabase
          .from('brain_memory_files')
          .update(memPayload)
          .eq('id', existingMem.id);
        if (!updErr) anyChannelSucceeded = true;
      } else {
        const { error: insErr } = await supabase.from('brain_memory_files').insert(memPayload);
        if (!insErr) anyChannelSucceeded = true;
      }
    } catch {
      /* non-blocking */
    }
  }

  // Channel C: Also mirror presets into user_settings for backward compatibility when primary/virtual brain
  try {
    const { data } = await supabase.from('user_settings').select('prefs').eq('user_id', user.id).maybeSingle();
    const prefs = data?.prefs || {};
    const { error: settingsErr } = await supabase.from('user_settings').upsert({
      user_id: user.id,
      prefs: {
        ...prefs,
        audiomorphic_presets_v2: archive.presets,
        audiomorphic_folders_v2: archive.folders,
        audiomorphic_active_brain_id: brain.id,
      },
      updated_at: new Date().toISOString(),
    });
    if (!settingsErr && brain.isVirtualFallback) {
      anyChannelSucceeded = true;
    }
  } catch {
    /* non-blocking */
  }

  if (anyChannelSucceeded) {
    clearPendingBrainSync(user.id, brain.id);
    return { ok: true, syncState: 'synced', archive };
  }

  queuePendingBrainSync(user.id, brain.id, archive);
  return {
    ok: false,
    syncState: 'offline_queued',
    archive,
    error: 'Sincronización diferida en cola local; se reintentará automáticamente al conectar.',
  };
};
