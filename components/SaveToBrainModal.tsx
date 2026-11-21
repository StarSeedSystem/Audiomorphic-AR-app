import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  FolderPlus,
  Folder,
  BrainCircuit,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Cpu,
  Plus,
  HardDrive,
  WifiOff,
  Sparkles,
} from 'lucide-react';
import { VisualizerParams } from '../types';
import { usePresets, ESSENTIALS_FOLDER_NAME } from '../hooks/usePresets';
import { canWriteBrain } from '../lib/starseedBrains';

interface SaveToBrainModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentParams: VisualizerParams;
  initialName?: string;
  initialCategory?: string;
  initialDescription?: string;
  initialFolder?: string;
  customParamsPayload?: Record<string, unknown>;
  onSaved?: (presetName: string, folder: string, brainName?: string) => void;
}

const CATEGORY_OPTIONS = [
  { id: 'custom', label: 'Personalizado' },
  { id: 'rhythmic', label: 'Ritmos Musicales' },
  { id: 'sacred', label: 'Resonancias Sagradas' },
  { id: 'harmonic', label: 'Armónicos' },
  { id: 'genesis', label: 'Génesis Sagrado' },
  { id: 'drift', label: 'Deriva & Fluidez' },
  { id: 'quantum', label: 'Cuántica & AR' },
  { id: 'community', label: 'Comunidad' },
];

export const SaveToBrainModal: React.FC<SaveToBrainModalProps> = ({
  isOpen,
  onClose,
  currentParams,
  initialName = '',
  initialCategory = 'custom',
  initialDescription = '',
  initialFolder = '',
  customParamsPayload,
  onSaved,
}) => {
  const presetsStore = usePresets();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState(initialCategory || 'custom');
  const [description, setDescription] = useState(initialDescription);
  const [folder, setFolder] = useState(initialFolder);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [creatingBrain, setCreatingBrain] = useState(false);
  const [newBrainName, setNewBrainName] = useState('');
  const [creatingBrainLoading, setCreatingBrainLoading] = useState(false);

  const [switchingBrain, setSwitchingBrain] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setCategory(initialCategory || 'custom');
      setDescription(initialDescription);
      setFolder(initialFolder === ESSENTIALS_FOLDER_NAME ? '' : initialFolder || '');
      setCreatingFolder(false);
      setNewFolderName('');
      setCreatingBrain(false);
      setNewBrainName('');
      setErrorMsg(null);
      setSavedSuccess(false);
    }
  }, [isOpen, initialName, initialCategory, initialDescription, initialFolder]);

  // Native <dialog> open/close + close listener
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch {
          /* ignore if already open */
        }
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };
    dialog.addEventListener('close', handleClose);

    // Light-dismiss pointer-position fallback when closedby is unsupported
    let cleanupOutside: (() => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const outside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      let pressedOutside = false;
      const onDown = (e: PointerEvent) => {
        pressedOutside = outside(e);
      };
      const onUp = (e: PointerEvent) => {
        if (pressedOutside && outside(e)) dialog.close();
      };
      dialog.addEventListener('pointerdown', onDown);
      dialog.addEventListener('pointerup', onUp);
      cleanupOutside = () => {
        dialog.removeEventListener('pointerdown', onDown);
        dialog.removeEventListener('pointerup', onUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      cleanupOutside?.();
    };
  }, [onClose]);

  const isLoggedIn = Boolean(presetsStore.selectedBrain || presetsStore.brains.length > 0);
  const activeBrainWritable = presetsStore.selectedBrain ? canWriteBrain(presetsStore.selectedBrain) : true;
  const availableFolders = presetsStore.folders.filter((f) => f !== ESSENTIALS_FOLDER_NAME);
  const onlineNeuronsCount = presetsStore.neurons.filter((n) => n.isOnline).length;

  const handleBrainChange = async (nextBrainId: string) => {
    setErrorMsg(null);
    setSwitchingBrain(true);
    try {
      await presetsStore.selectBrain(nextBrainId);
      setFolder('');
    } finally {
      setSwitchingBrain(false);
    }
  };

  const handleCreateNewBrain = async () => {
    if (!newBrainName.trim()) return;
    setErrorMsg(null);
    setCreatingBrainLoading(true);
    try {
      const res = await presetsStore.createBrain(newBrainName.trim());
      if (!res.ok) {
        setErrorMsg(res.error || 'No se pudo crear el cerebro.');
      } else {
        setNewBrainName('');
        setCreatingBrain(false);
      }
    } finally {
      setCreatingBrainLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Asigna un nombre al preset.');
      return;
    }
    if (!activeBrainWritable) {
      setErrorMsg('Este cerebro es de solo lectura. Elige otro cerebro con acceso Admin o Escritura.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await presetsStore.savePresetToBrainFolder({
        targetBrainId: presetsStore.selectedBrainId,
        folder,
        newFolderName: creatingFolder ? newFolderName.trim() : undefined,
        name: name.trim(),
        description: description.trim() || undefined,
        params: customParamsPayload || currentParams,
        category,
      });

      if (!res.ok) {
        setErrorMsg(res.error || 'No se pudo guardar el preset.');
        setSaving(false);
        return;
      }

      setSavedSuccess(true);
      onSaved?.(
        name.trim(),
        creatingFolder ? newFolderName.trim() : folder,
        presetsStore.selectedBrain?.name
      );
      setTimeout(() => {
        dialogRef.current?.close();
      }, 650);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar el preset.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="save-to-brain-title"
      {...({ closedby: 'any' } as any)}
      className="morph-dialog w-[95vw] max-w-lg max-h-[92dvh] rounded-3xl border-0 shadow-none"
    >
      <div className="art-nouveau-frame rounded-3xl w-full max-h-[92dvh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-white/10 bg-black/35 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl morph-pill shrink-0">
              <FolderPlus size={19} />
            </div>
            <div className="min-w-0">
              <h3 id="save-to-brain-title" className="text-base font-bold starseed-text-gradient truncate">
                Guardar Preset en Cerebro & Carpeta
              </h3>
              <p className="text-[10px] uppercase tracking-widest morph-accent-text truncate">
                {isLoggedIn
                  ? `StarSeed OS · ${onlineNeuronsCount || 1} Neurona(s) conectadas`
                  : 'Modo Local Autónomo del Dispositivo'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Cerrar diálogo"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="px-3.5 py-2.5 rounded-xl bg-red-950/65 border border-red-500/40 text-xs text-red-200 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="px-3.5 py-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/45 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
              <span>
                Preset guardado y sincronizado{' '}
                {presetsStore.selectedBrain ? `en "${presetsStore.selectedBrain.name}"` : 'localmente'}.
              </span>
            </div>
          )}

          {/* Cerebro Destino Selector */}
          {isLoggedIn ? (
            <div className="space-y-2 p-3 rounded-2xl quantum-glass">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-[11px] font-bold uppercase tracking-wider morph-accent-text-2 flex items-center gap-1.5">
                  <BrainCircuit size={14} /> Cerebro StarSeed OS Destino
                </label>
                <div className="flex items-center gap-1.5">
                  {presetsStore.selectedBrain && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        presetsStore.selectedBrain.accessLevel === 'admin'
                          ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                          : presetsStore.selectedBrain.accessLevel === 'escritura'
                          ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200'
                          : 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                      }`}
                    >
                      {presetsStore.selectedBrain.accessLevel}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setCreatingBrain(!creatingBrain)}
                    disabled={!presetsStore.isOnline}
                    className="text-[10px] font-bold morph-accent-text hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  >
                    <Plus size={11} />
                    {creatingBrain ? 'Cancelar' : 'Nuevo Cerebro'}
                  </button>
                </div>
              </div>

              <select
                value={presetsStore.selectedBrainId || ''}
                onChange={(e) => handleBrainChange(e.target.value)}
                disabled={switchingBrain || presetsStore.brains.length === 0}
                className="liquid-select-native"
              >
                {presetsStore.brains.map((b) => (
                  <option key={b.id} value={b.id}>
                    🧠 {b.name} ({b.accessLevel.toUpperCase()} · {b.isOwner ? 'Propio' : 'Compartido'})
                  </option>
                ))}
              </select>

              {creatingBrain && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newBrainName}
                    onChange={(e) => setNewBrainName(e.target.value)}
                    placeholder="Nombre del nuevo cerebro..."
                    className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewBrain}
                    disabled={creatingBrainLoading || !newBrainName.trim()}
                    className="px-3 py-2 rounded-xl morph-btn-primary text-xs font-bold cursor-pointer disabled:opacity-40"
                  >
                    {creatingBrainLoading ? 'Creando...' : 'Crear'}
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-slate-300 pt-0.5">
                <span className="flex items-center gap-1">
                  <Cpu size={11} className="morph-accent-text" />
                  Neurona actual: {presetsStore.currentNeuron.name}
                </span>
                {!presetsStore.isOnline && (
                  <span className="flex items-center gap-1 text-amber-300">
                    <WifiOff size={10} /> Cola Offline
                  </span>
                )}
              </div>

              {!activeBrainWritable && (
                <p className="text-[11px] text-amber-300">
                  Este cerebro tiene permiso de Solo Lectura. Selecciona un cerebro con acceso Admin o Escritura.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl quantum-glass p-3 flex items-center gap-3 text-xs">
              <div className="p-2 rounded-xl morph-pill shrink-0">
                <HardDrive size={16} />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white">Almacenamiento Local Autónomo</div>
                <div className="text-[11px] text-slate-300">
                  Se guarda directo en este dispositivo sin necesitar internet. Si luego conectas tu cuenta StarSeed OS podrás sincronizarlo con tus cerebros y neuronas.
                </div>
              </div>
            </div>
          )}

          {/* Carpeta Destino */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Folder size={13} className="morph-accent-text" /> Carpeta (Folder)
              </label>
              <button
                type="button"
                onClick={() => setCreatingFolder(!creatingFolder)}
                disabled={!activeBrainWritable}
                className="text-[11px] font-bold morph-accent-text hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Plus size={12} />
                {creatingFolder ? 'Usar Existente' : 'Nueva Carpeta'}
              </button>
            </div>

            {!creatingFolder ? (
              <select
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                disabled={switchingBrain}
                className="liquid-select-native"
              >
                <option value="">📂 Raíz (Sin carpeta específica)</option>
                {availableFolders.map((f) => (
                  <option key={f} value={f}>
                    📁 {f}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nombre de la nueva carpeta (ej. Sesión Astral 432Hz)..."
                className="w-full bg-black/60 border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                autoFocus
              />
            )}
          </div>

          {/* Nombre & Categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                Nombre del Preset
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Espiral Cuántica 528Hz"
                required
                className="w-full bg-black/55 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="liquid-select-native"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Descripción opcional */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1">
              Notas / Descripción (opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Geometría sagrada suave ideal para meditación..."
              className="w-full bg-black/55 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Snapshot summary */}
          <div className="rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-[11px] text-slate-300 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <Sparkles size={13} className="morph-accent-text" />
              Modo:{' '}
              <strong className="text-white">
                {currentParams.autoRandomMode && currentParams.autoRandomMode !== 'none'
                  ? currentParams.autoRandomMode
                  : currentParams.autoPilot
                  ? currentParams.autoPilotMode
                  : 'Manual'}
              </strong>
            </span>
            <span className="font-mono text-[10px] text-slate-400 truncate">
              k={Number(currentParams.k).toFixed(3)} · ψ={Number(currentParams.psi).toFixed(2)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="px-4 py-2.5 rounded-xl morph-btn-glass text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !activeBrainWritable || !name.trim()}
              className="px-5 py-2.5 rounded-xl morph-btn-primary text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{isLoggedIn ? 'Guardar y Sincronizar' : 'Guardar Localmente'}</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};

export default SaveToBrainModal;
