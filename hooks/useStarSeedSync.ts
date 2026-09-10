import { useState, useEffect, useCallback, useMemo } from 'react';
import { getStarSeedDb, AudiomorphicPresetRecord, ThankYouCardRecord } from '../lib/starseedDb';
import { DEFAULT_PRESETS } from '../lib/defaultPresets';

const PRESETS_STORAGE_KEY = 'audiomorphic.presets.v2';
const CARDS_STORAGE_KEY = 'audiomorphic.thankyou_cards.v2';
const ORDER_STORAGE_KEY = 'audiomorphic.presets_order.v2';
const DEFAULT_CARD_FOLDER_KEY = 'audiomorphic.card_folder.v2';

export const DEFAULT_CARD_FOLDER = 'Biblioteca/Donaciones y Agradecimientos';

export interface UseStarSeedSyncResult {
  presets: AudiomorphicPresetRecord[];
  allPresetsOrdered: AudiomorphicPresetRecord[];
  thankYouCards: ThankYouCardRecord[];
  preferredCardFolder: string;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'offline' | 'error';
  savePreset: (preset: Omit<AudiomorphicPresetRecord, 'id' | 'createdAt' | 'updatedAt' | 'orderIndex'>) => Promise<AudiomorphicPresetRecord>;
  updatePresetOrder: (orderedIds: string[]) => void;
  deletePreset: (id: string) => void;
  addThankYouCard: (card: Omit<ThankYouCardRecord, 'id' | 'issuedAt'>) => ThankYouCardRecord;
  updateCardFolder: (cardId: string, newFolderPath: string) => void;
  setPreferredCardFolder: (folder: string) => void;
  syncWithCloud: () => Promise<void>;
}

export function useStarSeedSync(userId?: string | null): UseStarSeedSyncResult {
  // 1. Initial local state
  const [customPresets, setCustomPresets] = useState<AudiomorphicPresetRecord[]>(() => {
    try {
      if (typeof window === 'undefined') return [];
      const saved = localStorage.getItem(PRESETS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [thankYouCards, setThankYouCards] = useState<ThankYouCardRecord[]>(() => {
    try {
      if (typeof window === 'undefined') return [];
      const saved = localStorage.getItem(CARDS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [orderMap, setOrderMap] = useState<string[]>(() => {
    try {
      if (typeof window === 'undefined') return [];
      const saved = localStorage.getItem(ORDER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [preferredCardFolder, setPreferredCardFolderState] = useState<string>(() => {
    try {
      if (typeof window === 'undefined') return DEFAULT_CARD_FOLDER;
      return localStorage.getItem(DEFAULT_CARD_FOLDER_KEY) || DEFAULT_CARD_FOLDER;
    } catch {
      return DEFAULT_CARD_FOLDER;
    }
  });

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'offline' | 'error'>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // 2. Persist local changes
  const persistCustomPresets = useCallback((list: AudiomorphicPresetRecord[]) => {
    setCustomPresets(list);
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(list));
    } catch {
      /* ignore */
    }
  }, []);

  const persistCards = useCallback((cards: ThankYouCardRecord[]) => {
    setThankYouCards(cards);
    try {
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(cards));
    } catch {
      /* ignore */
    }
  }, []);

  const persistOrder = useCallback((order: string[]) => {
    setOrderMap(order);
    try {
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
    } catch {
      /* ignore */
    }
  }, []);

  const setPreferredCardFolder = useCallback((folder: string) => {
    setPreferredCardFolderState(folder);
    try {
      localStorage.setItem(DEFAULT_CARD_FOLDER_KEY, folder);
    } catch {
      /* ignore */
    }
  }, []);

  // 3. Combined list of presets (defaults + custom presets)
  const presets = useMemo(() => {
    const combined = [...DEFAULT_PRESETS, ...customPresets];
    // deduplicate by id
    const map = new Map<string, AudiomorphicPresetRecord>();
    for (const p of combined) {
      map.set(p.id, p);
    }
    return Array.from(map.values());
  }, [customPresets]);

  // 4. Sorted presets according to orderMap
  const allPresetsOrdered = useMemo(() => {
    const sorted = [...presets];
    if (orderMap.length > 0) {
      sorted.sort((a, b) => {
        const idxA = orderMap.indexOf(a.id);
        const idxB = orderMap.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.orderIndex - b.orderIndex;
      });
    } else {
      sorted.sort((a, b) => a.orderIndex - b.orderIndex);
    }
    return sorted;
  }, [presets, orderMap]);

  // 5. Cloud synchronization with Supabase pqzdpmedcsgcedkvndzl
  const syncWithCloud = useCallback(async () => {
    if (!userId) {
      setSyncStatus('idle');
      return;
    }

    setSyncStatus('syncing');
    try {
      const supabase = getStarSeedDb();

      // Read from user_settings
      const { data, error } = await supabase
        .from('user_settings')
        .select('prefs')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[StarSeedSync] Error reading user_settings:', error.message);
        setSyncStatus('offline');
        return;
      }

      const remotePrefs = data?.prefs || {};
      const remotePresets: AudiomorphicPresetRecord[] = remotePrefs.audiomorphic_presets || [];
      const remoteCards: ThankYouCardRecord[] = remotePrefs.audiomorphic_cards || [];
      const remoteOrder: string[] = remotePrefs.audiomorphic_order || [];
      const remoteFolder: string = remotePrefs.audiomorphic_card_folder || '';

      // Merge presets (union by ID)
      const mergedPresetsMap = new Map<string, AudiomorphicPresetRecord>();
      for (const p of customPresets) mergedPresetsMap.set(p.id, p);
      for (const p of remotePresets) mergedPresetsMap.set(p.id, p);
      const mergedCustom = Array.from(mergedPresetsMap.values());

      // Merge cards (union by ID)
      const mergedCardsMap = new Map<string, ThankYouCardRecord>();
      for (const c of thankYouCards) mergedCardsMap.set(c.id, c);
      for (const c of remoteCards) mergedCardsMap.set(c.id, c);
      const mergedCards = Array.from(mergedCardsMap.values());

      // Merge order
      const finalOrder = remoteOrder.length > 0 ? remoteOrder : orderMap;

      // Update local
      persistCustomPresets(mergedCustom);
      persistCards(mergedCards);
      if (finalOrder.length > 0) persistOrder(finalOrder);
      if (remoteFolder) setPreferredCardFolder(remoteFolder);

      // Push merged back to Supabase
      const updatedPrefs = {
        ...remotePrefs,
        audiomorphic_presets: mergedCustom,
        audiomorphic_cards: mergedCards,
        audiomorphic_order: finalOrder,
        audiomorphic_card_folder: remoteFolder || preferredCardFolder,
      };

      await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          prefs: updatedPrefs,
          updated_at: new Date().toISOString(),
        })
        .select();

      setSyncStatus('synced');
      setLastSyncedAt(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('[StarSeedSync] Sincronización falló de forma no bloqueante:', err);
      setSyncStatus('offline');
    }
  }, [userId, customPresets, thankYouCards, orderMap, preferredCardFolder, persistCustomPresets, persistCards, persistOrder, setPreferredCardFolder]);

  // Sync on userId change
  useEffect(() => {
    if (userId) {
      syncWithCloud();
    }
  }, [userId]);

  // 6. Action handlers
  const savePreset = useCallback(
    async (draft: Omit<AudiomorphicPresetRecord, 'id' | 'createdAt' | 'updatedAt' | 'orderIndex'>): Promise<AudiomorphicPresetRecord> => {
      const id = 'preset-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      const now = new Date().toISOString();
      const newPreset: AudiomorphicPresetRecord = {
        ...draft,
        id,
        orderIndex: customPresets.length + DEFAULT_PRESETS.length,
        createdAt: now,
        updatedAt: now,
      };

      const updated = [newPreset, ...customPresets];
      persistCustomPresets(updated);
      persistOrder([id, ...orderMap]);

      // Trigger cloud sync in background if logged in
      if (userId) {
        setTimeout(() => syncWithCloud(), 100);
      }

      return newPreset;
    },
    [customPresets, orderMap, persistCustomPresets, persistOrder, userId, syncWithCloud]
  );

  const updatePresetOrder = useCallback(
    (orderedIds: string[]) => {
      persistOrder(orderedIds);
      if (userId) {
        setTimeout(() => syncWithCloud(), 300);
      }
    },
    [persistOrder, userId, syncWithCloud]
  );

  const deletePreset = useCallback(
    (id: string) => {
      const updated = customPresets.filter((p) => p.id !== id);
      persistCustomPresets(updated);
      persistOrder(orderMap.filter((item) => item !== id));
      if (userId) {
        setTimeout(() => syncWithCloud(), 100);
      }
    },
    [customPresets, orderMap, persistCustomPresets, persistOrder, userId, syncWithCloud]
  );

  const addThankYouCard = useCallback(
    (draft: Omit<ThankYouCardRecord, 'id' | 'issuedAt'>): ThankYouCardRecord => {
      const id = 'card-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      const now = new Date().toISOString();
      const newCard: ThankYouCardRecord = {
        ...draft,
        id,
        issuedAt: now,
        folderPath: draft.folderPath || preferredCardFolder,
      };

      const updated = [newCard, ...thankYouCards];
      persistCards(updated);

      if (userId) {
        setTimeout(() => syncWithCloud(), 100);
      }

      return newCard;
    },
    [thankYouCards, preferredCardFolder, persistCards, userId, syncWithCloud]
  );

  const updateCardFolder = useCallback(
    (cardId: string, newFolderPath: string) => {
      const updated = thankYouCards.map((c) => (c.id === cardId ? { ...c, folderPath: newFolderPath } : c));
      persistCards(updated);
      setPreferredCardFolder(newFolderPath);
      if (userId) {
        setTimeout(() => syncWithCloud(), 100);
      }
    },
    [thankYouCards, persistCards, setPreferredCardFolder, userId, syncWithCloud]
  );

  return {
    presets,
    allPresetsOrdered,
    thankYouCards,
    preferredCardFolder,
    isSyncing: syncStatus === 'syncing',
    lastSyncedAt,
    syncStatus,
    savePreset,
    updatePresetOrder,
    deletePreset,
    addThankYouCard,
    updateCardFolder,
    setPreferredCardFolder,
    syncWithCloud,
  };
}
