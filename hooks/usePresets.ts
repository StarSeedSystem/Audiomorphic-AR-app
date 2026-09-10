import { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { VisualizerParams } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';

export interface Preset {
  id: string;
  name: string;
  params: string; // JSON string
  createdAt: number;
}

/**
 * PRESETS SIN CUENTA (2026-07-13)
 * -----------------------------------------------------------------------------
 * Audiomorphic es libre y completo: guardar presets ya NO exige iniciar sesion
 * ni pagar. Con cuenta van a Firestore (y viajan entre dispositivos); sin ella,
 * al propio dispositivo (localStorage). Mismo API, mismo UI.
 */
const LOCAL_KEY = 'audiomorphic_presets_local';

const readLocal = (): Preset[] => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.sort((a, b) => b.createdAt - a.createdAt) : [];
  } catch { return []; }
};

const writeLocal = (list: Preset[]) => {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); } catch { /* cuota llena */ }
};

export const usePresets = () => {
  const { user } = useAuth();
  const [cloudPresets, setCloudPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPresets = async () => {
    if (!user) { setCloudPresets(readLocal()); return; }
    setLoading(true);
    try {
      const q = query(
        collection(db, 'presets'), 
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const presets: Preset[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        presets.push({
          id: doc.id,
          name: data.name,
          params: data.params,
          createdAt: data.createdAt
        });
      });
      setCloudPresets(presets.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'presets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, [user]);

  const savePreset = async (name: string, params: VisualizerParams) => {
    if (!user) {
      // Sin cuenta: se guarda en este dispositivo. Igual de valido.
      const preset: Preset = {
        id: `local_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim(),
        params: JSON.stringify(params),
        createdAt: Date.now()
      };
      const next = [preset, ...readLocal()];
      writeLocal(next);
      setCloudPresets(next);
      return preset;
    }
    try {
      const newPreset = {
        userId: user.uid,
        name: name.trim(),
        params: JSON.stringify(params),
        createdAt: Date.now()
      };
      const docRef = await addDoc(collection(db, 'presets'), newPreset);
      const preset: Preset = {
        id: docRef.id,
        name: newPreset.name,
        params: newPreset.params,
        createdAt: newPreset.createdAt
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

  const exportPresets = () => {
    if (cloudPresets.length === 0) {
      alert("No hay presets para exportar.");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cloudPresets));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `audiomorphic_presets_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importPresets = async (file: File) => {
    if (!user) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text) as Preset[];
      if (!Array.isArray(imported)) throw new Error("Formato inválido");
      
      for (const p of imported) {
        await addDoc(collection(db, 'presets'), {
          userId: user.uid,
          name: p.name + " (Importado)",
          params: p.params,
          createdAt: Date.now()
        });
      }
      fetchPresets();
      alert("Presets importados correctamente.");
    } catch (error) {
      console.error("Error importing presets", error);
      alert("Error al importar presets. Asegúrate de que sea un archivo JSON válido.");
    }
  };

  const reorderPresets = (newOrder: Preset[]) => {
    setCloudPresets(newOrder);
    writeLocal(newOrder);
  };

  return {
    cloudPresets,
    loading,
    savePreset,
    deletePreset,
    exportPresets,
    importPresets,
    reorderPresets,
    refreshPresets: fetchPresets
  };
};
