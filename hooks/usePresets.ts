import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { VisualizerParams } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';

import { DEFAULT_PRESETS } from '../lib/defaultPresets';

export interface Preset {
  id: string;
  name: string;
  description?: string;
  params: string; // JSON string
  createdAt: number;
  folder?: string;
  category?: string;
}

export const ESSENTIALS_FOLDER_NAME = 'Audiomorphic Essentials';

export const AUDIOMORPHIC_ESSENTIALS_PRESETS: Preset[] = [
  {
    id: 'essential_rhythmic',
    name: 'Ritmos Musicales',
    description: 'Alineación reactiva a transitorios, bombos y cambios tonales rítmicos en tiempo real con geometría de flor de la vida y cimática.',
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
      sacredGeometryModes: ['flowerOfLife', 'cymatics', 'goldenSpiral']
    })
  },
  {
    id: 'essential_dj',
    name: 'Modo DJ',
    description: 'Reacción percusiva agresiva con transiciones rápidas en bombos, caídas y drops de música electrónica y mezclas en vivo.',
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
      sacredGeometryModes: ['metatron', 'torus', 'vectorEquilibrium']
    })
  },
  {
    id: 'essential_sacred',
    name: 'Resonancias Sagradas',
    description: 'Evolución suave y profunda de geometrías áureas, activando el Cubo de Metatrón, Sri Yantra y Merkaba para meditación y música sacra.',
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
      sacredGeometryModes: ['metatron', 'flowerOfLife', 'sriYantra', 'merkaba']
    })
  },
  {
    id: 'essential_rainbow',
    name: 'Sinfonía Arcoíris',
    description: 'Recorrido espectral cromático completo con modulación armónica de color según el tono y timbre de la melodía.',
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
      sacredGeometryModes: ['cymatics', 'torus', 'mandala1']
    })
  },
  {
    id: 'essential_astral',
    name: 'Astromorphociberpsicodélico',
    description: 'Viaje dimensional multidireccional con fractales holográficos, ondas cuánticas y distorsiones psicodélicas avanzadas.',
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
      sacredGeometryModes: ['quantumWave', 'holographicFractal', 'chakras']
    })
  },
  {
    id: 'essential_smart',
    name: 'Modo Inteligente',
    description: 'Análisis emocional continuo de la música (brillo, calidez, tempo) que transmuta armónicamente todos los parámetros del visualizador.',
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
      sacredGeometryEnabled: true
    })
  },
  {
    id: 'essential_random',
    name: 'Aleatorio Total',
    description: 'Exploración y mutación impredecible de patrones cada intervalo de tiempo, descubriendo dimensiones visuales espontáneas.',
    folder: ESSENTIALS_FOLDER_NAME,
    category: 'custom',
    createdAt: 1700000000001,
    params: JSON.stringify({
      autoPilot: true,
      autoPilotMode: 'random',
      autoRandomMode: 'random',
      autoRandomInterval: 10,
      autoRandomOnBeat: false,
      autoRandomOnEmotionChange: false
    })
  }
];

const ESSENTIAL_IDS = new Set(AUDIOMORPHIC_ESSENTIALS_PRESETS.map(p => p.id));

const LOCAL_KEY = 'audiomorphic_presets_local';
const LOCAL_FOLDERS_KEY = 'audiomorphic_folders_local';

const DEFAULT_FOLDERS = [
  ESSENTIALS_FOLDER_NAME,
  'Ritmos en Vivo',
  'Sesión Meditativa',
  'Favoritos'
];

const readLocal = (): Preset[] => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    let list: Preset[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list) || list.length === 0) {
      writeLocal(AUDIOMORPHIC_ESSENTIALS_PRESETS);
      return AUDIOMORPHIC_ESSENTIALS_PRESETS;
    }

    // Filtrar presets de biblioteca general que se hayan asignado indebidamente a Audiomorphic Essentials
    list = list.filter(p => ESSENTIAL_IDS.has(p.id) || p.folder !== ESSENTIALS_FOLDER_NAME);

    // Separar los presets personalizados que el usuario haya creado
    const userCustomPresets = list.filter(p => !ESSENTIAL_IDS.has(p.id));

    // Mantener los 7 presets esenciales en el orden exacto definido:
    // 1. Ritmos Musicales, 2. Modo DJ, 3. Resonancias Sagradas, 4. Sinfonía Arcoíris,
    // 5. Astromorphociberpsicodélico, 6. Modo Inteligente, 7. Aleatorio Total
    const orderedEssentials = AUDIOMORPHIC_ESSENTIALS_PRESETS.map(essential => {
      const existing = list.find(p => p.id === essential.id);
      return existing
        ? { ...essential, ...existing, name: essential.name, description: essential.description, folder: ESSENTIALS_FOLDER_NAME, category: essential.category }
        : essential;
    });

    const result = [...orderedEssentials, ...userCustomPresets];
    writeLocal(result);
    return result;
  } catch {
    return AUDIOMORPHIC_ESSENTIALS_PRESETS;
  }
};

const writeLocal = (list: Preset[]) => {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); } catch { /* cuota llena */ }
};

const readLocalFolders = (): string[] => {
  try {
    const raw = localStorage.getItem(LOCAL_FOLDERS_KEY);
    let list: string[] | null = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(list) || list.length === 0) {
      list = DEFAULT_FOLDERS;
    }
    if (!list.includes(ESSENTIALS_FOLDER_NAME)) {
      list = [ESSENTIALS_FOLDER_NAME, ...list];
    }
    writeLocalFolders(list);
    return list;
  } catch {
    return DEFAULT_FOLDERS;
  }
};

const writeLocalFolders = (folders: string[]) => {
  try { localStorage.setItem(LOCAL_FOLDERS_KEY, JSON.stringify(folders)); } catch { /* cuota llena */ }
};

export const usePresets = () => {
  const { user } = useAuth();
  const [cloudPresets, setCloudPresets] = useState<Preset[]>(() => readLocal());
  const [folders, setFolders] = useState<string[]>(() => readLocalFolders());
  const [loading, setLoading] = useState(false);

  const fetchPresets = useCallback(async () => {
    if (!user) { 
      setCloudPresets(readLocal()); 
      return; 
    }
    setLoading(true);
    try {
      const q = query(
        collection(db, 'presets'), 
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const presets: Preset[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        presets.push({
          id: docSnap.id,
          name: data.name,
          params: data.params,
          createdAt: data.createdAt,
          folder: data.folder || '',
          category: data.category || 'custom'
        });
      });

      // Sincronización a la nube: Si el usuario en la nube aún no tiene el folder Audiomorphic Essentials,
      // lo sincronizamos automáticamente manteniendo intacto su folder y parámetros.
      const hasEssentialsInCloud = presets.some(p => p.folder === ESSENTIALS_FOLDER_NAME);
      if (!hasEssentialsInCloud) {
        const localPresets = readLocal();
        const essentialsToSync = localPresets.filter(p => p.folder === ESSENTIALS_FOLDER_NAME);
        for (const lp of essentialsToSync) {
          try {
            const addedDoc = await addDoc(collection(db, 'presets'), {
              userId: user.uid,
              name: lp.name,
              params: typeof lp.params === 'string' ? lp.params : JSON.stringify(lp.params),
              createdAt: lp.createdAt || Date.now(),
              folder: lp.folder || ESSENTIALS_FOLDER_NAME,
              category: lp.category || 'custom'
            });
            presets.push({
              id: addedDoc.id,
              name: lp.name,
              params: lp.params,
              createdAt: lp.createdAt || Date.now(),
              folder: lp.folder || ESSENTIALS_FOLDER_NAME,
              category: lp.category || 'custom'
            });
          } catch (syncErr) {
            console.warn('[usePresets] Error sincronizando preset inicial a Firestore:', syncErr);
          }
        }
      }

      // Sincronizar carpetas
      const presetFolders = Array.from(new Set(presets.map(p => p.folder).filter(Boolean))) as string[];
      setFolders(prev => {
        const union = Array.from(new Set([ESSENTIALS_FOLDER_NAME, ...prev, ...presetFolders]));
        writeLocalFolders(union);
        return union;
      });

      // Filtrar presets de biblioteca general que se hayan asignado indebidamente a Audiomorphic Essentials
      const cleanPresets = presets.filter(p => ESSENTIAL_IDS.has(p.id) || p.folder !== ESSENTIALS_FOLDER_NAME);
      const userCustom = cleanPresets.filter(p => !ESSENTIAL_IDS.has(p.id));

      const orderedEssentials = AUDIOMORPHIC_ESSENTIALS_PRESETS.map(essential => {
        const existing = cleanPresets.find(p => p.id === essential.id);
        return existing
          ? { ...essential, ...existing, name: essential.name, description: essential.description, folder: ESSENTIALS_FOLDER_NAME, category: essential.category }
          : essential;
      });

      setCloudPresets([...orderedEssentials, ...userCustom]);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'presets');
      setCloudPresets(readLocal());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  // Folder Operations
  const createFolder = useCallback((folderName: string) => {
    const trimmed = folderName.trim();
    if (!trimmed) return;
    setFolders(prev => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      writeLocalFolders(next);
      return next;
    });
  }, []);

  const deleteFolder = useCallback((folderName: string) => {
    setFolders(prev => {
      const next = prev.filter(f => f !== folderName);
      writeLocalFolders(next);
      return next;
    });
    // Remove folder association from presets
    setCloudPresets(prev => {
      const updated = prev.map(p => p.folder === folderName ? { ...p, folder: '' } : p);
      if (!user) writeLocal(updated);
      return updated;
    });
  }, [user]);

  const renameFolder = useCallback((oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || oldName === trimmed) return;
    setFolders(prev => {
      const next = prev.map(f => f === oldName ? trimmed : f);
      writeLocalFolders(next);
      return next;
    });
    setCloudPresets(prev => {
      const updated = prev.map(p => p.folder === oldName ? { ...p, folder: trimmed } : p);
      if (!user) writeLocal(updated);
      return updated;
    });
  }, [user]);

  const movePresetToFolder = useCallback(async (presetId: string, targetFolder: string) => {
    if (!user || presetId.startsWith('local_')) {
      const next = readLocal().map(p => p.id === presetId ? { ...p, folder: targetFolder } : p);
      writeLocal(next);
      setCloudPresets(next);
      return;
    }
    try {
      await updateDoc(doc(db, 'presets', presetId), { folder: targetFolder });
      setCloudPresets(prev => prev.map(p => p.id === presetId ? { ...p, folder: targetFolder } : p));
    } catch (e) {
      console.error('Error updating preset folder in db', e);
    }
  }, [user]);

  // Preset CRUD Operations
  const savePreset = async (
    name: string, 
    params: VisualizerParams, 
    folder?: string,
    category?: string
  ) => {
    const trimmed = name.trim();
    const resolvedFolder = folder || '';
    const resolvedCat = category || (params.autoRandomMode === 'rhythmic' ? 'rhythmic' : 'custom');

    if (!user) {
      const preset: Preset = {
        id: `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
        name: trimmed,
        params: JSON.stringify(params),
        createdAt: Date.now(),
        folder: resolvedFolder,
        category: resolvedCat
      };
      const next = [preset, ...readLocal()];
      writeLocal(next);
      setCloudPresets(next);
      return preset;
    }
    try {
      const newPreset = {
        userId: user.uid,
        name: trimmed,
        params: JSON.stringify(params),
        createdAt: Date.now(),
        folder: resolvedFolder,
        category: resolvedCat
      };
      const docRef = await addDoc(collection(db, 'presets'), newPreset);
      const preset: Preset = {
        id: docRef.id,
        name: newPreset.name,
        params: newPreset.params,
        createdAt: newPreset.createdAt,
        folder: newPreset.folder,
        category: newPreset.category
      };
      setCloudPresets(prev => [preset, ...prev]);
      return preset;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'presets');
    }
  };

  const addPresetFromLibrary = async (
    name: string,
    paramsObj: Record<string, unknown> | VisualizerParams,
    folder?: string,
    category?: string
  ) => {
    const trimmed = name.trim();
    const resolvedFolder = folder || '';
    const resolvedCat = category || 'official';

    if (!user) {
      const preset: Preset = {
        id: `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
        name: trimmed,
        params: typeof paramsObj === 'string' ? paramsObj : JSON.stringify(paramsObj),
        createdAt: Date.now(),
        folder: resolvedFolder,
        category: resolvedCat
      };
      const next = [preset, ...readLocal()];
      writeLocal(next);
      setCloudPresets(next);
      return preset;
    }
    try {
      const newPreset = {
        userId: user.uid,
        name: trimmed,
        params: typeof paramsObj === 'string' ? paramsObj : JSON.stringify(paramsObj),
        createdAt: Date.now(),
        folder: resolvedFolder,
        category: resolvedCat
      };
      const docRef = await addDoc(collection(db, 'presets'), newPreset);
      const preset: Preset = {
        id: docRef.id,
        name: newPreset.name,
        params: newPreset.params,
        createdAt: newPreset.createdAt,
        folder: newPreset.folder,
        category: newPreset.category
      };
      setCloudPresets(prev => [preset, ...prev]);
      return preset;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'presets');
    }
  };

  const deletePreset = async (id: string) => {
    if (!user || id.startsWith('local_')) {
      const next = readLocal().filter(p => p.id !== id);
      writeLocal(next);
      setCloudPresets(next);
      return;
    }
    try {
      await deleteDoc(doc(db, 'presets', id));
      setCloudPresets(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `presets/${id}`);
    }
  };

  const exportPresets = (folderFilter?: string) => {
    const listToExport = folderFilter && folderFilter !== 'all'
      ? cloudPresets.filter(p => (folderFilter === 'none' ? !p.folder : p.folder === folderFilter))
      : cloudPresets;

    if (listToExport.length === 0) {
      alert("No hay presets disponibles para exportar en esta selección.");
      return;
    }

    const payload = {
      version: '1.2.0',
      exportedAt: new Date().toISOString(),
      folders: folderFilter ? [folderFilter] : folders,
      presets: listToExport
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    const suffix = folderFilter && folderFilter !== 'all' ? `_${folderFilter.replace(/\s+/g, '_')}` : '';
    downloadAnchorNode.setAttribute("download", `audiomorphic_presets${suffix}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importPresets = async (file: File, targetFolder?: string) => {
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
        throw new Error("Formato inválido");
      }

      if (incomingFolders.length > 0) {
        setFolders(prev => {
          const merged = Array.from(new Set([...prev, ...incomingFolders]));
          writeLocalFolders(merged);
          return merged;
        });
      }

      if (!user) {
        const localCurrent = readLocal();
        const importedPresets: Preset[] = incomingPresets.map(p => ({
          id: `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
          name: p.name + " (Importado)",
          params: typeof p.params === 'string' ? p.params : JSON.stringify(p.params),
          createdAt: Date.now(),
          folder: targetFolder || p.folder || '',
          category: p.category || 'custom'
        }));
        const next = [...importedPresets, ...localCurrent];
        writeLocal(next);
        setCloudPresets(next);
        alert(`¡${importedPresets.length} presets importados correctamente de forma local!`);
        return;
      }

      for (const p of incomingPresets) {
        await addDoc(collection(db, 'presets'), {
          userId: user.uid,
          name: p.name + " (Importado)",
          params: typeof p.params === 'string' ? p.params : JSON.stringify(p.params),
          createdAt: Date.now(),
          folder: targetFolder || p.folder || '',
          category: p.category || 'custom'
        });
      }
      await fetchPresets();
      alert(`¡${incomingPresets.length} presets importados a tu cuenta correctamente!`);
    } catch (error) {
      console.error("Error importing presets", error);
      alert("Error al importar presets. Asegúrate de que sea un archivo JSON válido.");
    }
  };

  const reorderPresets = (newOrder: Preset[]) => {
    setCloudPresets(newOrder);
    if (!user) {
      writeLocal(newOrder);
    }
  };

  return {
    cloudPresets,
    presets: cloudPresets,
    folders,
    createFolder,
    deleteFolder,
    renameFolder,
    movePresetToFolder,
    loading,
    savePreset,
    addPresetFromLibrary,
    deletePreset,
    exportPresets,
    importPresets,
    reorderPresets,
    refreshPresets: fetchPresets
  };
};
