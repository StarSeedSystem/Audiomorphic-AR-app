import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { VisualizerParams } from '../types';
import { Preset } from '../lib/starseedDb';
import { supabase } from '../lib/supabaseClient';
import {
  AUDIOMORPHIC_ESSENTIALS_PRESETS,
  BrainNeuronDevice,
  BrainUserIdentity,
  canWriteBrain,
  createStarseedBrain,
  DEFAULT_FOLDERS,
  ESSENTIAL_IDS,
  ESSENTIALS_FOLDER_NAME,
  fetchUserBrains,
  getOrCreateLocalNeuronInfo,
  getPendingBrainSync,
  MEMORY_FILE_NAME,
  mergePresetsWithEssentials,
  parseBrainArchiveRaw,
  persistBrainSelection,
  pullBrainLibraryFromOS,
  pushBrainLibraryToOS,
  registerNeuronHeartbeat,
  StarseedBrain,
  SyncState,
} from '../lib/starseedBrains';

export { ESSENTIALS_FOLDER_NAME, AUDIOMORPHIC_ESSENTIALS_PRESETS };
export type { Preset };

const LOCAL_KEY = 'audiomorphic_presets_local';
const LOCAL_FOLDERS_KEY = 'audiomorphic_folders_local';
const accountBrainStorageKey = (uid: string, brainId: string) => `audiomorphic_brain_${uid}_${brainId}`;

function readLocalPresets(): Preset[] {
  try {
    if (typeof window === 'undefined') return AUDIOMORPHIC_ESSENTIALS_PRESETS;
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) {
      writeLocalPresets(AUDIOMORPHIC_ESSENTIALS_PRESETS);
      return AUDIOMORPHIC_ESSENTIALS_PRESETS;
    }
    const list = JSON.parse(raw);
    const merged = mergePresetsWithEssentials(Array.isArray(list) ? list : []);
    writeLocalPresets(merged);
    return merged;
  } catch {
    return AUDIOMORPHIC_ESSENTIALS_PRESETS;
  }
}

function writeLocalPresets(list: Preset[]): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function readLocalFolders(): string[] {
  try {
    if (typeof window === 'undefined') return DEFAULT_FOLDERS;
    const raw = localStorage.getItem(LOCAL_FOLDERS_KEY);
    let list: string[] | null = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(list) || list.length === 0) {
      list = [...DEFAULT_FOLDERS];
    }
    if (!list.includes(ESSENTIALS_FOLDER_NAME)) {
      list = [ESSENTIALS_FOLDER_NAME, ...list];
    }
    writeLocalFolders(list);
    return list;
  } catch {
    return [...DEFAULT_FOLDERS];
  }
}

function writeLocalFolders(folders: string[]): void {
  try {
    localStorage.setItem(LOCAL_FOLDERS_KEY, JSON.stringify(folders));
  } catch {
    /* ignore */
  }
}

function readBrainCache(uid: string, brainId: string): { presets: Preset[]; folders: string[]; revision: number } | null {
  try {
    const raw = localStorage.getItem(accountBrainStorageKey(uid, brainId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.presets)) {
      return {
        presets: mergePresetsWithEssentials(parsed.presets),
        folders: Array.isArray(parsed.folders)
          ? Array.from(new Set([ESSENTIALS_FOLDER_NAME, ...parsed.folders]))
          : [...DEFAULT_FOLDERS],
        revision: Number(parsed.revision) || 0,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeBrainCache(uid: string, brainId: string, folders: string[], presets: Preset[], revision: number): void {
  try {
    localStorage.setItem(
      accountBrainStorageKey(uid, brainId),
      JSON.stringify({ folders, presets, revision, updatedAt: Date.now() })
    );
  } catch {
    /* ignore */
  }
}

// --- MODULE-LEVEL SHARED REACTIVE STORE ---

interface PresetsStoreState {
  presets: Preset[];
  folders: string[];
  user: BrainUserIdentity | null;
  brains: StarseedBrain[];
  selectedBrainId: string | null;
  selectedBrain: StarseedBrain | null;
  canWriteCurrentBrain: boolean;
  neurons: BrainNeuronDevice[];
  syncState: SyncState;
  syncMessage: string | null;
  lastSyncedAt: number | null;
  isOnline: boolean;
  isLoadingBrains: boolean;
  loading: boolean;
  hasLocalDevicePresets: boolean;
}

const initialLocalPresets = readLocalPresets();
const initialLocalFolders = readLocalFolders();

let storeState: PresetsStoreState = {
  presets: initialLocalPresets,
  folders: initialLocalFolders,
  user: null,
  brains: [],
  selectedBrainId: null,
  selectedBrain: null,
  canWriteCurrentBrain: true,
  neurons: [],
  syncState: 'local_only',
  syncMessage: 'Almacenamiento local autónomo (funciona 100% sin conexión)',
  lastSyncedAt: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isLoadingBrains: false,
  loading: false,
  hasLocalDevicePresets: initialLocalPresets.some((p) => !ESSENTIAL_IDS.has(p.id)),
};

const subscribers = new Set<(state: PresetsStoreState) => void>();
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let realtimeChannel: any = null;
let broadcastChannel: BroadcastChannel | null = null;
let initializedGlobals = false;
let currentAuthKey = 'guest';
let currentRevision = Date.now();

const emit = () => {
  subscribers.forEach((cb) => {
    try {
      cb(storeState);
    } catch {
      /* isolate */
    }
  });
};

const setStore = (patch: Partial<PresetsStoreState>) => {
  storeState = { ...storeState, ...patch };
  emit();
};

const broadcastSameDeviceChange = () => {
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'presets-updated',
        brainId: storeState.selectedBrainId,
        presets: storeState.presets,
        folders: storeState.folders,
        revision: currentRevision,
      });
    }
  } catch {
    /* ignore */
  }
};

const cleanupRealtime = () => {
  if (realtimeChannel) {
    try {
      supabase.removeChannel(realtimeChannel);
    } catch {
      /* ignore */
    }
    realtimeChannel = null;
  }
};

const setupRealtimeForBrain = (user: BrainUserIdentity, brain: StarseedBrain) => {
  cleanupRealtime();
  if (brain.isVirtualFallback || (typeof navigator !== 'undefined' && !navigator.onLine)) return;

  const localNeuron = getOrCreateLocalNeuronInfo();
  try {
    realtimeChannel = supabase
      .channel(`am-brain-sync-${brain.id}-${Math.random().toString(36).slice(2, 7)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'brain_memory_files',
          filter: `brain_id=eq.${brain.id}`,
        },
        (payload: any) => {
          const row = payload?.new;
          if (!row || row.name !== MEMORY_FILE_NAME) return;
          if (row?.meta?.updated_by_neuron_id === localNeuron.id) return;
          if (typeof row.content === 'string') {
            const archive = parseBrainArchiveRaw(row.content);
            if (archive && storeState.selectedBrainId === brain.id) {
              if (archive.revision > currentRevision) {
                currentRevision = archive.revision;
                const mergedFolders = Array.from(
                  new Set([ESSENTIALS_FOLDER_NAME, ...archive.folders])
                );
                const mergedPresets = mergePresetsWithEssentials(archive.presets);
                writeBrainCache(user.id, brain.id, mergedFolders, mergedPresets, currentRevision);
                setStore({
                  presets: mergedPresets,
                  folders: mergedFolders,
                  syncState: canWriteBrain(brain) ? 'synced' : 'read_only',
                  syncMessage: `Sincronizado desde ${archive.updatedByNeuronName || 'otra neurona'} (${brain.name})`,
                  lastSyncedAt: Date.now(),
                });
              }
            }
          }
        }
      )
      .subscribe();
  } catch {
    /* ignore offline realtime */
  }
};

const activateBrain = async (user: BrainUserIdentity, brain: StarseedBrain) => {
  const cached = readBrainCache(user.id, brain.id);
  const initialPresets = cached ? cached.presets : [...AUDIOMORPHIC_ESSENTIALS_PRESETS];
  const initialFolders = cached ? cached.folders : [...DEFAULT_FOLDERS];
  currentRevision = cached?.revision || Date.now();

  if (!cached) {
    writeBrainCache(user.id, brain.id, initialFolders, initialPresets, currentRevision);
  }

  const writable = canWriteBrain(brain);
  setStore({
    presets: initialPresets,
    folders: initialFolders,
    selectedBrainId: brain.id,
    selectedBrain: brain,
    canWriteCurrentBrain: writable,
    syncState: storeState.isOnline ? 'syncing' : writable ? 'offline_queued' : 'read_only',
    syncMessage: `Sincronizando cerebro "${brain.name}"...`,
    loading: true,
  });

  persistBrainSelection(user.id, brain.id).catch(() => {});
  setupRealtimeForBrain(user, brain);

  // Flush queued offline edits first if online
  const pending = getPendingBrainSync(user.id, brain.id);
  if (pending && storeState.isOnline && writable) {
    const pushRes = await pushBrainLibraryToOS(user, brain, pending.folders, pending.presets, pending.revision);
    if (pushRes.ok) {
      currentRevision = pending.revision;
      writeBrainCache(user.id, brain.id, pending.folders, pending.presets, pending.revision);
      setStore({
        presets: pending.presets,
        folders: pending.folders,
        syncState: 'synced',
        syncMessage: `Cambios offline sincronizados en "${brain.name}"`,
        lastSyncedAt: Date.now(),
        loading: false,
      });
      return;
    }
  }

  if (!storeState.isOnline) {
    setStore({
      syncState: writable ? 'offline_queued' : 'read_only',
      syncMessage: `Modo offline · usando caché local de "${brain.name}"`,
      loading: false,
    });
    return;
  }

  const pullRes = await pullBrainLibraryFromOS(user, brain);
  if (storeState.selectedBrainId !== brain.id) return;

  if (pullRes.found && pullRes.archive) {
    const remote = pullRes.archive;
    // Merge non-destructively if local cache had presets missing on remote
    const mergedMap = new Map<string, Preset>();
    for (const p of remote.presets) mergedMap.set(p.id, p);
    for (const p of initialPresets) {
      if (!mergedMap.has(p.id) && !ESSENTIAL_IDS.has(p.id)) {
        mergedMap.set(p.id, p);
      }
    }
    const finalPresets = mergePresetsWithEssentials(Array.from(mergedMap.values()));
    const finalFolders = Array.from(
      new Set([
        ESSENTIALS_FOLDER_NAME,
        ...initialFolders,
        ...remote.folders,
        ...finalPresets.map((p) => p.folder).filter((f): f is string => Boolean(f)),
      ])
    );
    currentRevision = Math.max(currentRevision, remote.revision || Date.now());
    writeBrainCache(user.id, brain.id, finalFolders, finalPresets, currentRevision);

    setStore({
      presets: finalPresets,
      folders: finalFolders,
      syncState: writable ? 'synced' : 'read_only',
      syncMessage: writable
        ? `Sincronizado con "${brain.name}"`
        : `Solo lectura · "${brain.name}"`,
      lastSyncedAt: Date.now(),
      loading: false,
    });
  } else if (pullRes.offline) {
    setStore({
      syncState: writable ? 'offline_queued' : 'read_only',
      syncMessage: `Sin conexión · trabajando offline en "${brain.name}"`,
      loading: false,
    });
  } else {
    // Cloud brain had no Audiomorphic archive yet; initialize cleanly if local custom presets exist or essentials
    if (writable) {
      await pushBrainLibraryToOS(user, brain, initialFolders, initialPresets, currentRevision);
    }
    setStore({
      syncState: writable ? 'synced' : 'read_only',
      syncMessage: writable ? `Cerebro "${brain.name}" conectado y listo` : `Solo lectura · "${brain.name}"`,
      lastSyncedAt: Date.now(),
      loading: false,
    });
  }
};

const scheduleBrainPush = () => {
  const { user, selectedBrain } = storeState;
  currentRevision = Date.now();

  if (!user || !selectedBrain) {
    writeLocalPresets(storeState.presets);
    writeLocalFolders(storeState.folders);
    setStore({
      hasLocalDevicePresets: storeState.presets.some((p) => !ESSENTIAL_IDS.has(p.id)),
      syncState: 'local_only',
      syncMessage: 'Guardado localmente en este dispositivo',
    });
    broadcastSameDeviceChange();
    return;
  }

  writeBrainCache(user.id, selectedBrain.id, storeState.folders, storeState.presets, currentRevision);
  broadcastSameDeviceChange();

  if (!canWriteBrain(selectedBrain)) {
    setStore({
      syncState: 'read_only',
      syncMessage: `Cambios locales · "${selectedBrain.name}" es de solo lectura`,
    });
    return;
  }

  setStore({
    syncState: storeState.isOnline ? 'syncing' : 'offline_queued',
    syncMessage: storeState.isOnline
      ? `Sincronizando con "${selectedBrain.name}"...`
      : `Sin conexión · cambios en cola para "${selectedBrain.name}"`,
  });

  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  const revAtSchedule = currentRevision;
  const targetUser = user;
  const targetBrain = selectedBrain;
  const foldersSnap = [...storeState.folders];
  const presetsSnap = [...storeState.presets];

  syncDebounceTimer = setTimeout(async () => {
    const res = await pushBrainLibraryToOS(targetUser, targetBrain, foldersSnap, presetsSnap, revAtSchedule);
    if (storeState.selectedBrainId === targetBrain.id && storeState.user?.id === targetUser.id) {
      setStore({
        syncState: res.syncState,
        syncMessage: res.ok
          ? `Sincronizado con "${targetBrain.name}"`
          : res.error || `En cola offline para "${targetBrain.name}"`,
        lastSyncedAt: res.ok ? Date.now() : storeState.lastSyncedAt,
      });
    }
  }, 450);
};

async function transitionToGuest() {
  cleanupRealtime();
  const localP = readLocalPresets();
  const localF = readLocalFolders();
  setStore({
    user: null,
    brains: [],
    selectedBrainId: null,
    selectedBrain: null,
    canWriteCurrentBrain: true,
    neurons: [],
    presets: localP,
    folders: localF,
    syncState: 'local_only',
    syncMessage: 'Almacenamiento local autónomo (sin sesión StarSeed OS)',
    isLoadingBrains: false,
    loading: false,
    hasLocalDevicePresets: localP.some((p) => !ESSENTIAL_IDS.has(p.id)),
  });
}

async function transitionToUser(user: BrainUserIdentity) {
  setStore({
    user,
    isLoadingBrains: true,
    syncState: storeState.isOnline ? 'syncing' : 'offline_queued',
    syncMessage: 'Conectando cerebros y neuronas de StarSeed OS...',
  });

  const { brains, selectedBrainId, neurons, offline } = await fetchUserBrains(user);
  const chosen = brains.find((b) => b.id === selectedBrainId) || brains[0];

  setStore({
    brains,
    neurons,
    isOnline: !offline,
    isLoadingBrains: false,
  });

  if (chosen) {
    await activateBrain(user, chosen);
  }
}

function ensureGlobalListeners() {
  if (initializedGlobals || typeof window === 'undefined') return;
  initializedGlobals = true;

  try {
    if ('BroadcastChannel' in window) {
      broadcastChannel = new BroadcastChannel('audiomorphic-presets-sync');
      broadcastChannel.onmessage = (e) => {
        if (e?.data?.type === 'presets-updated') {
          if (
            e.data.brainId === storeState.selectedBrainId &&
            typeof e.data.revision === 'number' &&
            e.data.revision > currentRevision
          ) {
            currentRevision = e.data.revision;
            setStore({
              presets: mergePresetsWithEssentials(e.data.presets || []),
              folders: Array.isArray(e.data.folders) ? e.data.folders : storeState.folders,
            });
          }
        }
      };
    }
  } catch {
    /* ignore */
  }

  window.addEventListener('online', async () => {
    setStore({ isOnline: true });
    const { user, selectedBrain } = storeState;
    if (user) {
      await registerNeuronHeartbeat(user.id, true);
      const res = await fetchUserBrains(user);
      setStore({ brains: res.brains, neurons: res.neurons });
      if (selectedBrain) {
        await activateBrain(user, selectedBrain);
      }
    }
  });

  window.addEventListener('offline', () => {
    setStore({
      isOnline: false,
      syncState: storeState.user ? 'offline_queued' : 'local_only',
      syncMessage: 'Modo offline autónomo: todos los presets funcionan sin conexión',
    });
  });
}

export const usePresets = () => {
  const { user: authUser, profile } = useAuth();
  const [state, setState] = useState<PresetsStoreState>(storeState);

  useEffect(() => {
    ensureGlobalListeners();
    const listener = (next: PresetsStoreState) => setState(next);
    subscribers.add(listener);
    setState(storeState);
    return () => {
      subscribers.delete(listener);
    };
  }, []);

  useEffect(() => {
    const isSovereign = (authUser as any)?.app_metadata?.provider === 'starseed_sovereign';
    const nextKey = authUser && !isSovereign ? `user:${authUser.id}` : 'guest';
    if (nextKey === currentAuthKey) return;
    currentAuthKey = nextKey;

    if (!authUser || isSovereign) {
      void transitionToGuest();
    } else {
      const identityUser: BrainUserIdentity = {
        id: authUser.id,
        email: authUser.email,
        handle: profile?.handle || (authUser.user_metadata as any)?.handle || null,
        displayName:
          profile?.displayName ||
          (authUser.user_metadata as any)?.full_name ||
          authUser.email?.split('@')[0] ||
          null,
      };
      void transitionToUser(identityUser);
    }
  }, [authUser, profile]);

  const selectBrain = useCallback(async (brainId: string) => {
    const { user, brains } = storeState;
    if (!user) return;
    const found = brains.find((b) => b.id === brainId);
    if (!found) return;
    await activateBrain(user, found);
  }, []);

  const createBrain = useCallback(async (name: string, description?: string) => {
    const { user } = storeState;
    if (!user) {
      return { ok: false, error: 'Inicia sesión en StarSeed OS para crear cerebros en la nube.' };
    }
    const res = await createStarseedBrain(user, name, description);
    if (res.ok && res.brain) {
      const updatedBrains = [res.brain, ...storeState.brains.filter((b) => !b.isVirtualFallback)];
      setStore({ brains: updatedBrains });
      await activateBrain(user, res.brain);
    }
    return res;
  }, []);

  const refreshBrainsAndSync = useCallback(async () => {
    const { user, selectedBrainId } = storeState;
    if (!user) {
      setStore({
        presets: readLocalPresets(),
        folders: readLocalFolders(),
      });
      return;
    }
    setStore({ isLoadingBrains: true, syncState: storeState.isOnline ? 'syncing' : 'offline_queued' });
    await registerNeuronHeartbeat(user.id, true);
    const res = await fetchUserBrains(user);
    const chosen =
      res.brains.find((b) => b.id === (selectedBrainId || res.selectedBrainId)) || res.brains[0];
    setStore({
      brains: res.brains,
      neurons: res.neurons,
      isOnline: !res.offline,
      isLoadingBrains: false,
    });
    if (chosen) {
      await activateBrain(user, chosen);
    }
  }, []);

  const createFolder = useCallback((folderName: string) => {
    const trimmed = folderName.trim();
    if (!trimmed) return;
    if (storeState.folders.includes(trimmed)) return;
    const nextFolders = [...storeState.folders, trimmed];
    setStore({ folders: nextFolders });
    scheduleBrainPush();
  }, []);

  const deleteFolder = useCallback((folderName: string) => {
    if (folderName === ESSENTIALS_FOLDER_NAME) return;
    const nextFolders = storeState.folders.filter((f) => f !== folderName);
    const nextPresets = storeState.presets.map((p) =>
      p.folder === folderName ? { ...p, folder: '' } : p
    );
    setStore({ folders: nextFolders, presets: nextPresets });
    scheduleBrainPush();
  }, []);

  const renameFolder = useCallback((oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || oldName === trimmed || oldName === ESSENTIALS_FOLDER_NAME) return;
    const nextFolders = storeState.folders.map((f) => (f === oldName ? trimmed : f));
    const nextPresets = storeState.presets.map((p) =>
      p.folder === oldName ? { ...p, folder: trimmed } : p
    );
    setStore({ folders: nextFolders, presets: nextPresets });
    scheduleBrainPush();
  }, []);

  const movePresetToFolder = useCallback(async (presetId: string, targetFolder: string) => {
    const nextFolders =
      targetFolder && !storeState.folders.includes(targetFolder)
        ? [...storeState.folders, targetFolder]
        : storeState.folders;
    const nextPresets = storeState.presets.map((p) =>
      p.id === presetId ? { ...p, folder: targetFolder, updatedAt: Date.now() } : p
    );
    setStore({ folders: nextFolders, presets: nextPresets });
    scheduleBrainPush();
  }, []);

  const savePreset = useCallback(
    async (
      name: string,
      params: VisualizerParams,
      folder?: string,
      category?: string,
      description?: string
    ): Promise<Preset> => {
      const trimmed = name.trim();
      const resolvedFolder = folder || '';
      const resolvedCat = category || (params.autoRandomMode === 'rhythmic' ? 'rhythmic' : 'custom');
      const idPrefix = storeState.user ? 'cloud_' : 'local_';
      const preset: Preset = {
        id: `${idPrefix}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        name: trimmed,
        description: description?.trim() || undefined,
        params: JSON.stringify(params),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        folder: resolvedFolder,
        category: resolvedCat,
      };
      const nextFolders =
        resolvedFolder && !storeState.folders.includes(resolvedFolder)
          ? [...storeState.folders, resolvedFolder]
          : storeState.folders;
      const nextPresets = mergePresetsWithEssentials([preset, ...storeState.presets]);
      setStore({ folders: nextFolders, presets: nextPresets });
      scheduleBrainPush();
      return preset;
    },
    []
  );

  const addPresetFromLibrary = useCallback(
    async (
      name: string,
      paramsObj: Record<string, unknown> | VisualizerParams,
      folder?: string,
      category?: string,
      description?: string
    ): Promise<Preset> => {
      const trimmed = name.trim();
      const resolvedFolder = folder || '';
      const resolvedCat = category || 'official';
      const idPrefix = storeState.user ? 'cloud_' : 'local_';
      const preset: Preset = {
        id: `${idPrefix}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        name: trimmed,
        description: description?.trim() || undefined,
        params: typeof paramsObj === 'string' ? paramsObj : JSON.stringify(paramsObj),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        folder: resolvedFolder,
        category: resolvedCat,
      };
      const nextFolders =
        resolvedFolder && !storeState.folders.includes(resolvedFolder)
          ? [...storeState.folders, resolvedFolder]
          : storeState.folders;
      const nextPresets = mergePresetsWithEssentials([preset, ...storeState.presets]);
      setStore({ folders: nextFolders, presets: nextPresets });
      scheduleBrainPush();
      return preset;
    },
    []
  );

  const savePresetToBrainFolder = useCallback(
    async (opts: {
      targetBrainId?: string | null;
      folder: string;
      newFolderName?: string;
      name: string;
      description?: string;
      params: VisualizerParams | Record<string, unknown>;
      category?: string;
    }): Promise<{ ok: boolean; preset?: Preset; error?: string }> => {
      const cleanName = opts.name.trim();
      if (!cleanName) return { ok: false, error: 'Asigna un nombre al preset.' };

      if (opts.targetBrainId && opts.targetBrainId !== storeState.selectedBrainId && storeState.user) {
        await selectBrain(opts.targetBrainId);
      }

      if (storeState.user && storeState.selectedBrain && !canWriteBrain(storeState.selectedBrain)) {
        return {
          ok: false,
          error: `El cerebro "${storeState.selectedBrain.name}" es de solo lectura.`,
        };
      }

      const targetFolder = opts.newFolderName?.trim() || opts.folder || '';
      const created = await addPresetFromLibrary(
        cleanName,
        opts.params,
        targetFolder,
        opts.category || 'custom',
        opts.description
      );
      return { ok: true, preset: created };
    },
    [addPresetFromLibrary, selectBrain]
  );

  const deletePreset = useCallback(async (id: string) => {
    if (ESSENTIAL_IDS.has(id)) return;
    const nextPresets = storeState.presets.filter((p) => p.id !== id);
    setStore({ presets: nextPresets });
    scheduleBrainPush();
  }, []);

  const exportPresets = useCallback((folderFilter?: string) => {
    const listToExport =
      folderFilter && folderFilter !== 'all'
        ? storeState.presets.filter((p) => (folderFilter === 'none' ? !p.folder : p.folder === folderFilter))
        : storeState.presets;

    if (listToExport.length === 0) {
      alert('No hay presets disponibles para exportar en esta selección.');
      return;
    }

    const payload = {
      schema: 'audiomorphic.library.v2',
      version: '1.5.1',
      exportedAt: new Date().toISOString(),
      brainName: storeState.selectedBrain?.name || 'Dispositivo Local',
      folders: folderFilter && folderFilter !== 'all' ? [folderFilter] : storeState.folders,
      presets: listToExport,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    const suffix = folderFilter && folderFilter !== 'all' ? `_${folderFilter.replace(/\s+/g, '_')}` : '';
    downloadAnchorNode.setAttribute(
      'download',
      `audiomorphic_presets${suffix}_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }, []);

  const importPresets = useCallback(async (file: File, targetFolder?: string) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      let incomingPresets: Preset[] = [];
      let incomingFolders: string[] = [];

      if (Array.isArray(parsed)) {
        incomingPresets = parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.presets)) {
        incomingPresets = parsed.presets;
        if (Array.isArray(parsed.folders)) {
          incomingFolders = parsed.folders;
        }
      } else {
        throw new Error('Formato inválido');
      }

      const idPrefix = storeState.user ? 'cloud_' : 'local_';
      const imported: Preset[] = incomingPresets
        .filter((p) => p && !ESSENTIAL_IDS.has(p.id))
        .map((p) => ({
          id: `${idPrefix}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
          name: p.name ? `${p.name} (Importado)` : 'Preset Importado',
          description: p.description,
          params: typeof p.params === 'string' ? p.params : JSON.stringify(p.params),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          folder: targetFolder !== undefined ? targetFolder : p.folder || '',
          category: p.category || 'custom',
        }));

      const nextFolders = Array.from(
        new Set([
          ...storeState.folders,
          ...incomingFolders,
          ...(targetFolder ? [targetFolder] : []),
          ...imported.map((p) => p.folder).filter((f): f is string => Boolean(f)),
        ])
      );

      const nextPresets = mergePresetsWithEssentials([...imported, ...storeState.presets]);
      setStore({ folders: nextFolders, presets: nextPresets });
      scheduleBrainPush();
      alert(
        storeState.user
          ? `¡${imported.length} presets importados y sincronizados con "${storeState.selectedBrain?.name || 'tu cerebro'}"!`
          : `¡${imported.length} presets importados correctamente de forma local!`
      );
    } catch (error) {
      console.error('Error importing presets', error);
      alert('Error al importar presets. Asegúrate de que sea un archivo JSON válido.');
    }
  }, []);

  const reorderPresets = useCallback((newOrder: Preset[]) => {
    setStore({ presets: mergePresetsWithEssentials(newOrder) });
    scheduleBrainPush();
  }, []);

  const importLocalPresetsIntoBrain = useCallback(async (): Promise<number> => {
    if (!storeState.user || !storeState.selectedBrain) return 0;
    const localCustom = readLocalPresets().filter((p) => !ESSENTIAL_IDS.has(p.id));
    if (localCustom.length === 0) return 0;

    const existingNames = new Set(storeState.presets.map((p) => `${p.name}::${p.folder || ''}`.toLowerCase()));
    const toAdd = localCustom
      .filter((p) => !existingNames.has(`${p.name}::${p.folder || ''}`.toLowerCase()))
      .map((p) => ({
        ...p,
        id: `cloud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        updatedAt: Date.now(),
      }));

    if (toAdd.length === 0) return 0;

    const nextFolders = Array.from(
      new Set([
        ...storeState.folders,
        ...toAdd.map((p) => p.folder).filter((f): f is string => Boolean(f)),
      ])
    );
    const nextPresets = mergePresetsWithEssentials([...toAdd, ...storeState.presets]);
    setStore({ folders: nextFolders, presets: nextPresets });
    scheduleBrainPush();
    return toAdd.length;
  }, []);

  return {
    cloudPresets: state.presets,
    presets: state.presets,
    folders: state.folders,
    createFolder,
    deleteFolder,
    renameFolder,
    movePresetToFolder,
    loading: state.loading,
    savePreset,
    addPresetFromLibrary,
    deletePreset,
    exportPresets,
    importPresets,
    reorderPresets,
    refreshPresets: refreshBrainsAndSync,
    // StarSeed OS Brain & Neuron sync capabilities
    brains: state.brains,
    selectedBrainId: state.selectedBrainId,
    selectedBrain: state.selectedBrain,
    canWriteCurrentBrain: state.canWriteCurrentBrain,
    neurons: state.neurons,
    currentNeuron: getOrCreateLocalNeuronInfo(),
    syncState: state.syncState,
    syncMessage: state.syncMessage,
    lastSyncedAt: state.lastSyncedAt,
    isOnline: state.isOnline,
    isLoadingBrains: state.isLoadingBrains,
    hasLocalDevicePresets: state.hasLocalDevicePresets,
    selectBrain,
    createBrain,
    refreshBrainsAndSync,
    savePresetToBrainFolder,
    importLocalPresetsIntoBrain,
  };
};
