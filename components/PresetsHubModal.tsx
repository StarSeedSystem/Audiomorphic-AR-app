import React, { useState, useMemo, useRef } from 'react';
import { 
  X, 
  Folder, 
  FolderPlus, 
  Search, 
  Star, 
  Check, 
  Plus, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Music, 
  Headphones, 
  MessageSquare, 
  ExternalLink, 
  Download, 
  Upload, 
  Save, 
  Sparkles, 
  BookOpen, 
  Layers
} from 'lucide-react';
import { VisualizerParams } from '../types';
import { AudiomorphicPresetRecord } from '../lib/starseedDb';
import { DEFAULT_PRESETS } from '../lib/defaultPresets';
import { usePresets, Preset, ESSENTIALS_FOLDER_NAME } from '../hooks/usePresets';
import { usePresetCommunity, MusicRecommendationType } from '../hooks/usePresetCommunity';
import { UseStarSeedSyncResult } from '../hooks/useStarSeedSync';

interface PresetsHubModalProps {
  open: boolean;
  onClose: () => void;
  currentParams: VisualizerParams;
  setParams: React.Dispatch<React.SetStateAction<VisualizerParams>>;
  onApplyPreset?: (preset: any) => void;
  selectedLibraryPreset?: any;
  onSelectLibraryPreset?: (preset: any) => void;
  sync?: UseStarSeedSyncResult;
  userDisplayName?: string;
}

export const PRESET_CATEGORIES_CONFIG = [
  { id: 'all', label: 'Todas las Categorías' },
  { id: 'essentials', label: '✨ Audiomorphic Essentials' },
  { id: 'genesis', label: 'Génesis Sagrado' },
  { id: 'sacred', label: 'Resonancias Sagradas' },
  { id: 'rhythmic', label: 'Ritmos Musicales' },
  { id: 'harmonic', label: 'Armónicos' },
  { id: 'drift', label: 'Deriva & Fluidez' },
  { id: 'quantum', label: 'Cuántica & Dimensión' },
  { id: 'community', label: 'Comunidad' },
];

const PresetsHubModal: React.FC<PresetsHubModalProps> = ({
  open,
  onClose,
  currentParams,
  setParams,
  onApplyPreset,
  selectedLibraryPreset,
  onSelectLibraryPreset,
  sync,
  userDisplayName
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'collection'>('library');

  // Community & Presets hooks
  const community = usePresetCommunity();
  const {
    folders = [],
    cloudPresets = [],
    presets: rawPresets,
    createFolder,
    deleteFolder,
    movePresetToFolder,
    savePreset,
    addPresetFromLibrary,
    deletePreset,
    exportPresets,
    importPresets,
    reorderPresets
  } = usePresets();

  const userPresets = Array.isArray(rawPresets) ? rawPresets : (Array.isArray(cloudPresets) ? cloudPresets : []);

  // -------------------------------------------------------------
  // TAB 1: LIBRERÍA STATE
  // -------------------------------------------------------------
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [librarySearch, setLibrarySearch] = useState<string>('');
  const [expandedCardSection, setExpandedCardSection] = useState<Record<string, 'none' | 'music' | 'comments'>>({});
  const [folderPickerPresetId, setFolderPickerPresetId] = useState<string | null>(null);
  const [targetFolderChoice, setTargetFolderChoice] = useState<string>('');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Music Recommendation form state
  const [showRecFormFor, setShowRecFormFor] = useState<string | null>(null);
  const [recType, setRecType] = useState<MusicRecommendationType>('song');
  const [recTitle, setRecTitle] = useState('');
  const [recArtist, setRecArtist] = useState('');
  const [recAlbum, setRecAlbum] = useState('');
  const [recUrl, setRecUrl] = useState('');
  const [recDesc, setRecDesc] = useState('');
  const [recRating, setRecRating] = useState<number>(5);

  // Recommendation comments expand/input state
  const [activeRecComments, setActiveRecComments] = useState<Record<string, boolean>>({});
  const [recCommentInput, setRecCommentInput] = useState<Record<string, string>>({});

  // Preset Comment form state
  const [commentFormPresetId, setCommentFormPresetId] = useState<string | null>(null);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentRating, setCommentRating] = useState<number>(5);

  // -------------------------------------------------------------
  // TAB 2: BIBLIOTECA STATE
  // -------------------------------------------------------------
  const [selectedFolder, setSelectedFolder] = useState<string>(ESSENTIALS_FOLDER_NAME);
  const [personalSearch, setPersonalSearch] = useState<string>('');
  const [personalCategoryFilter, setPersonalCategoryFilter] = useState<string>('all');
  const [personalSortMode, setPersonalSortMode] = useState<'custom' | 'name-asc' | 'name-desc' | 'newest' | 'oldest'>('custom');

  // Create folder inline form
  const [showNewFolderRow, setShowNewFolderRow] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Quick save current settings form
  const [showSaveCurrentForm, setShowSaveCurrentForm] = useState(false);
  const [savePresetName, setSavePresetName] = useState('');
  const [savePresetFolder, setSavePresetFolder] = useState('');
  const [savePresetCategory, setSavePresetCategory] = useState('custom');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  // Flash notification helper
  const showNotice = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  // Presets source for Library
  const allLibraryPresets: AudiomorphicPresetRecord[] = (sync?.allPresetsOrdered && sync.allPresetsOrdered.length > 0)
    ? sync.allPresetsOrdered
    : DEFAULT_PRESETS;

  // Filtered Library Presets
  const filteredLibraryPresets = allLibraryPresets.filter((preset) => {
    // Category check
    let matchesCat = true;
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'sacred') {
        matchesCat = preset.category === 'genesis' || !!(preset.params as any)?.sacredGeometryEnabled;
      } else if (selectedCategory === 'rhythmic') {
        matchesCat = (preset.params as any)?.autoRandomMode === 'rhythmic' || !!(preset.params as any)?.autoRandomOnBeat;
      } else {
        matchesCat = preset.category === selectedCategory;
      }
    }
    if (!matchesCat) return false;

    // Search check
    if (librarySearch.trim()) {
      const q = librarySearch.toLowerCase();
      const inTitle = preset.title.toLowerCase().includes(q);
      const inDesc = preset.description.toLowerCase().includes(q);
      const inAuthor = preset.author?.name?.toLowerCase().includes(q) || false;
      return inTitle || inDesc || inAuthor;
    }

    return true;
  });

  // Filtered & Sorted Personal Presets for Tab 2
  const filteredPersonalPresets = (() => {
    let list = [...userPresets];

    // Filter by folder
    if (selectedFolder === 'none') {
      list = list.filter((p) => !p.folder);
    } else if (selectedFolder !== 'all') {
      list = list.filter((p) => p.folder === selectedFolder);
    }

    // Filter by category
    if (personalCategoryFilter !== 'all') {
      list = list.filter((p) => (p.category || 'custom') === personalCategoryFilter);
    }

    // Search filter
    if (personalSearch.trim()) {
      const q = personalSearch.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }

    // Sort order
    if (personalSortMode === 'name-asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (personalSortMode === 'name-desc') {
      list.sort((a, b) => b.name.localeCompare(a.name));
    } else if (personalSortMode === 'newest') {
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (personalSortMode === 'oldest') {
      list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    }

    return list;
  })();

  // Handlers for Library Presets
  const handleSelectPreset = (preset: AudiomorphicPresetRecord) => {
    if (onSelectLibraryPreset) {
      onSelectLibraryPreset(preset);
    }
    if (onApplyPreset) {
      onApplyPreset(preset);
    }
    showNotice(`¡Preset "${preset.title}" seleccionado y activado en el visualizador!`);
  };

  const handleConfirmAddToFolder = async (preset: AudiomorphicPresetRecord) => {
    try {
      await addPresetFromLibrary(preset.title, preset.params as any, targetFolderChoice, preset.category);
      setFolderPickerPresetId(null);
      showNotice(`¡Preset "${preset.title}" agregado con éxito a la carpeta ${targetFolderChoice ? `"${targetFolderChoice}"` : 'Raíz (Sin Carpeta)'}!`);
    } catch (err) {
      console.error('Error adding preset to folder:', err);
    }
  };

  // Submit Music Recommendation
  const handlePublishRecommendation = (presetId: string) => {
    if (!recTitle.trim() || !recArtist.trim()) {
      alert('Por favor introduce al menos el título y el artista de la recomendación.');
      return;
    }

    community.addMusicRecommendation(presetId, {
      type: recType,
      title: recTitle.trim(),
      artist: recArtist.trim(),
      album: recAlbum.trim() || undefined,
      mediaUrl: recUrl.trim() || undefined,
      description: recDesc.trim() || undefined,
      author: userDisplayName || 'Viajero Sónico',
      initialRating: recRating,
    });

    setRecTitle('');
    setRecArtist('');
    setRecAlbum('');
    setRecUrl('');
    setRecDesc('');
    setRecRating(5);
    setShowRecFormFor(null);
    showNotice('¡Recomendación musical publicada con éxito para la comunidad!');
  };

  // Submit Preset Comment
  const handlePublishPresetComment = (presetId: string) => {
    if (!commentText.trim()) return;

    community.addPresetComment(
      presetId,
      commentAuthor.trim() || userDisplayName || 'Viajero Sónico',
      commentText.trim(),
      commentRating
    );

    setCommentText('');
    setCommentFormPresetId(null);
    showNotice('¡Comentario publicado con éxito!');
  };

  // Handle Load Personal Preset to Visualizer
  const handleLoadPersonalPreset = (preset: Preset) => {
    try {
      const parsed = typeof preset.params === 'string' ? JSON.parse(preset.params) : preset.params;
      setParams((prev) => ({ ...prev, ...parsed }));
      if (onApplyPreset) {
        onApplyPreset(parsed);
      }
      showNotice(`¡Preset personal "${preset.name}" cargado en el visualizador!`);
    } catch (err) {
      console.error('Error cargando preset:', err);
      alert('Error al procesar los parámetros del preset.');
    }
  };

  // Save current visualizer settings as preset
  const handleSaveCurrentAsPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!savePresetName.trim()) return;

    try {
      await savePreset(savePresetName.trim(), currentParams, savePresetFolder, savePresetCategory);
      setSavePresetName('');
      setShowSaveCurrentForm(false);
      showNotice(`¡Ajustes actuales guardados como "${savePresetName.trim()}" en tu Biblioteca!`);
    } catch (err) {
      console.error('Error al guardar preset:', err);
    }
  };

  // Create folder
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    createFolder(newFolderName.trim());
    setSelectedFolder(newFolderName.trim());
    setNewFolderName('');
    setShowNewFolderRow(false);
    showNotice(`Carpeta "${newFolderName.trim()}" creada.`);
  };

  // Reorder priorities in Biblioteca
  const handleMovePriority = (index: number, direction: 'up' | 'down') => {
    const list = [...userPresets];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    reorderPresets(list);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4">
      <div className="liquid-panel w-full max-w-5xl h-[92vh] max-h-[920px] flex flex-col border border-white/20 shadow-2xl rounded-2xl overflow-hidden bg-gradient-to-b from-black/90 via-slate-950/95 to-black/95 animate-in fade-in zoom-in-95 duration-200">
        
        {/* ========================================================= */}
        {/* MODAL HEADER WITH TAB SELECTOR                           */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-black/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  <span>Gestión de Presets & Sintonización</span>
                </h2>
                <p className="text-[11px] text-gray-400">
                  Explora la Librería Soberana o administra tu Biblioteca personal
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="sm:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2 MAIN TABS: LIBRERÍA & BIBLIOTECA */}
          <div className="flex items-center gap-2 bg-black/60 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'library'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Librería</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-cyan-200">
                {allLibraryPresets.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('collection')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'collection'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Biblioteca</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-purple-200">
                {userPresets.length}
              </span>
            </button>

            <button
              onClick={onClose}
              className="hidden sm:flex p-2 ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Notification Banner */}
        {notificationMsg && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-200 px-4 py-2 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              {notificationMsg}
            </span>
            <button onClick={() => setNotificationMsg(null)} className="text-emerald-300 hover:text-white">✕</button>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: LIBRERÍA SOBERANA DE PRESETS                       */}
        {/* ========================================================= */}
        {activeTab === 'library' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Filter Bar: Categories + Search */}
            <div className="p-3 sm:p-4 border-b border-white/10 bg-black/30 space-y-3 shrink-0">
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Buscar preset por título, autor o descripción..."
                    className="w-full bg-black/60 border border-white/15 rounded-xl pl-9 pr-3 py-1.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                  />
                  {librarySearch && (
                    <button
                      onClick={() => setLibrarySearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-gray-400 shrink-0 font-mono text-right">
                  Mostrando <strong className="text-cyan-300">{filteredLibraryPresets.length}</strong> presets
                </div>
              </div>

              {/* Categorías de Presets */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-nowrap min-w-0">
                {PRESET_CATEGORIES_CONFIG.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                      selectedCategory === cat.id
                        ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Presets Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 space-y-4">
              {filteredLibraryPresets.length === 0 ? (
                <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-sm text-gray-300 mb-2">No se encontraron presets con los criterios de búsqueda.</p>
                  <button
                    onClick={() => { setSelectedCategory('all'); setLibrarySearch(''); }}
                    className="text-xs text-cyan-400 hover:underline cursor-pointer"
                  >
                    Restablecer filtros de búsqueda
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  {filteredLibraryPresets.map((preset) => {
                    const ratingData = community.getPresetRating(preset.id);
                    const recs = community.getPresetRecommendations(preset.id);
                    const comments = community.getPresetComments(preset.id);
                    const currentExpanded = expandedCardSection[preset.id] || 'none';
                    const isFolderPickerOpen = folderPickerPresetId === preset.id;
                    const isSelected = selectedLibraryPreset?.id === preset.id;

                    return (
                      <div
                        key={preset.id}
                        className={`p-4 sm:p-5 rounded-2xl bg-white/5 border transition-all flex flex-col justify-between space-y-3.5 min-w-0 overflow-hidden ${
                          isSelected
                            ? 'border-purple-500/70 shadow-[0_0_20px_rgba(168,85,247,0.25)] bg-gradient-to-b from-purple-950/30 to-black/60'
                            : 'border-white/10 hover:border-cyan-400/40'
                        }`}
                      >
                        {/* Cabecera y descripción del preset */}
                        <div className="min-w-0">
                          <div className="flex justify-between items-start mb-1.5 gap-2 flex-wrap">
                            <h4 className="text-sm sm:text-base font-bold text-white tracking-wide break-words min-w-0 flex-1">
                              {preset.title}
                            </h4>
                            <span className="text-[9px] sm:text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-white/10 text-cyan-300 border border-white/10 shrink-0">
                              {preset.category}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300 leading-relaxed break-words line-clamp-3">
                            {preset.description}
                          </p>
                        </div>

                        {/* Calificación de la Comunidad (1-5 estrellas) */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs min-w-0">
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span className="font-bold text-white">{ratingData.average.toFixed(1)}</span>
                            <span className="text-gray-400 text-[11px]">
                              ({ratingData.count} {ratingData.count === 1 ? 'voto' : 'votos'})
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[11px] text-gray-400">Tu calificación:</span>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => community.ratePreset(preset.id, star)}
                                className={`p-0.5 hover:scale-125 transition-transform cursor-pointer ${
                                  (ratingData.userRating || 0) >= star
                                    ? 'text-amber-400'
                                    : 'text-gray-600 hover:text-amber-300'
                                }`}
                                title={`Calificar con ${star} estrellas`}
                              >
                                <Star size={13} className={((ratingData.userRating || 0) >= star) ? 'fill-amber-400' : ''} />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* BOTONES DE ACCIÓN: SOLO SELECCIONAR Y AGREGAR A CARPETA */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs min-w-0">
                          <span className="text-gray-400 font-mono text-[11px] truncate max-w-[120px]">
                            {preset.author?.name || 'StarSeed'}
                          </span>

                          <div className="flex items-center gap-2 flex-wrap shrink-0">
                            {/* Botón Seleccionar */}
                            <button
                              type="button"
                              onClick={() => handleSelectPreset(preset)}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-600/40 border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                                  : 'bg-cyan-600/25 border-cyan-400/40 text-cyan-200 hover:bg-cyan-600/40'
                              }`}
                              title="Seleccionar preset para trabajar u organizar en la barra de presets"
                            >
                              <Check size={12} />
                              <span>{isSelected ? 'Seleccionado' : 'Seleccionar'}</span>
                            </button>

                            {/* Botón Agregar a carpeta */}
                            <button
                              type="button"
                              onClick={() => {
                                setFolderPickerPresetId(isFolderPickerOpen ? null : preset.id);
                                setTargetFolderChoice(folders[0] || '');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-purple-500/25 border border-purple-400/40 text-purple-200 font-bold hover:bg-purple-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                              title="Guardar en una carpeta de tu Biblioteca Personal"
                            >
                              <FolderPlus size={12} />
                              <span>Agregar a carpeta</span>
                            </button>
                          </div>
                        </div>

                        {/* Selector Desplegable de Carpeta al pulsar Agregar a Carpeta */}
                        {isFolderPickerOpen && (
                          <div className="p-3 bg-purple-950/40 border border-purple-400/30 rounded-xl space-y-2 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-purple-200 flex items-center gap-1.5">
                                <Folder size={12} />
                                Selecciona la carpeta de destino:
                              </span>
                              <button
                                onClick={() => setFolderPickerPresetId(null)}
                                className="text-gray-400 hover:text-white text-xs"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <select
                                value={targetFolderChoice}
                                onChange={(e) => setTargetFolderChoice(e.target.value)}
                                className="flex-1 min-w-[140px] bg-black/70 border border-purple-400/30 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
                              >
                                <option value="">📁 Sin Carpeta (Raíz de Biblioteca)</option>
                                {folders.map((f) => (
                                  <option key={f} value={f}>📁 {f}</option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleConfirmAddToFolder(preset)}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all shadow-[0_0_10px_rgba(168,85,247,0.4)] cursor-pointer shrink-0"
                              >
                                Guardar Preset
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Pestañas secundarias de la tarjeta: Música y Comentarios */}
                        <div className="flex items-center gap-2 border-t border-white/5 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedCardSection((prev) => ({
                                ...prev,
                                [preset.id]: prev[preset.id] === 'music' ? 'none' : 'music',
                              }));
                            }}
                            className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              currentExpanded === 'music'
                                ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                                : 'bg-white/5 text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            <Headphones size={12} />
                            <span>Música Recomendada ({recs.length})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setExpandedCardSection((prev) => ({
                                ...prev,
                                [preset.id]: prev[preset.id] === 'comments' ? 'none' : 'comments',
                              }));
                            }}
                            className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              currentExpanded === 'comments'
                                ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                                : 'bg-white/5 text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            <MessageSquare size={12} />
                            <span>Comentarios ({comments.length})</span>
                          </button>
                        </div>

                        {/* ========================================================= */}
                        {/* SUBSECCIÓN 1: MÚSICA RECOMENDADA DE LA COMUNIDAD          */}
                        {/* ========================================================= */}
                        {currentExpanded === 'music' && (
                          <div className="p-3.5 bg-black/50 rounded-xl border border-indigo-500/25 space-y-3 animate-in fade-in duration-200 min-w-0">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                                <Music size={13} />
                                Playlists, Álbumes y Canciones
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setShowRecFormFor(showRecFormFor === preset.id ? null : preset.id)
                                }
                                className="text-[10px] font-bold text-indigo-200 hover:text-white flex items-center gap-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/40 px-2 py-0.5 rounded cursor-pointer transition-colors"
                              >
                                <Plus size={11} />
                                <span>Recomendar Música</span>
                              </button>
                            </div>

                            {/* Formulario para agregar recomendación musical */}
                            {showRecFormFor === preset.id && (
                              <div className="p-3 bg-black/75 rounded-xl border border-indigo-400/40 space-y-2 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[11px] font-bold text-white flex items-center gap-1">
                                    <Sparkles size={11} className="text-indigo-400" />
                                    Subir recomendación musical para este preset
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setShowRecFormFor(null)}
                                    className="text-gray-400 hover:text-white text-xs"
                                  >
                                    ✕
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <select
                                    value={recType}
                                    onChange={(e) => setRecType(e.target.value as MusicRecommendationType)}
                                    className="bg-black/80 border border-white/15 rounded px-2 py-1.5 text-[11px] text-white outline-none"
                                  >
                                    <option value="song">Canción / Track</option>
                                    <option value="album">Álbum</option>
                                    <option value="artist">Artista</option>
                                    <option value="playlist">Lista de Reproducción</option>
                                  </select>
                                  <div className="flex items-center gap-1 text-[11px] text-gray-300 justify-end">
                                    <span>Calificación:</span>
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <button
                                        key={s}
                                        type="button"
                                        onClick={() => setRecRating(s)}
                                        className="text-amber-400 p-0.5"
                                      >
                                        <Star size={13} className={recRating >= s ? 'fill-amber-400' : ''} />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={recTitle}
                                    onChange={(e) => setRecTitle(e.target.value)}
                                    placeholder="Título (p. ej. Resonancia Áurea)..."
                                    className="bg-black/80 border border-white/15 rounded px-2 py-1 text-[11px] text-white placeholder-gray-500 outline-none"
                                  />
                                  <input
                                    type="text"
                                    value={recArtist}
                                    onChange={(e) => setRecArtist(e.target.value)}
                                    placeholder="Artista o creador sonoro..."
                                    className="bg-black/80 border border-white/15 rounded px-2 py-1 text-[11px] text-white placeholder-gray-500 outline-none"
                                  />
                                </div>
                                <input
                                  type="text"
                                  value={recUrl}
                                  onChange={(e) => setRecUrl(e.target.value)}
                                  placeholder="Enlace multimedia opcional (Spotify, YouTube, SoundCloud, etc.)..."
                                  className="w-full bg-black/80 border border-white/15 rounded px-2 py-1 text-[11px] text-white placeholder-gray-500 outline-none"
                                />
                                <input
                                  type="text"
                                  value={recDesc}
                                  onChange={(e) => setRecDesc(e.target.value)}
                                  placeholder="¿Por qué resuena con este preset? (frecuencia, tempo, vibración)..."
                                  className="w-full bg-black/80 border border-white/15 rounded px-2 py-1 text-[11px] text-white placeholder-gray-500 outline-none"
                                />
                                <div className="flex justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setShowRecFormFor(null)}
                                    className="px-2.5 py-1 text-gray-400 hover:text-white text-[11px]"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePublishRecommendation(preset.id)}
                                    className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-bold cursor-pointer transition-all shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                                  >
                                    Publicar Recomendación
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Lista de recomendaciones musicales */}
                            {recs.length === 0 ? (
                              <p className="text-[11px] text-gray-400 text-center py-2.5">
                                Aún no hay música recomendada. ¡Sé el primero en compartir!
                              </p>
                            ) : (
                              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                {recs.map((rec) => (
                                  <div
                                    key={rec.id}
                                    className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-2 min-w-0"
                                  >
                                    <div className="flex items-start justify-between gap-2 min-w-0">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                                            {rec.type === 'song' ? 'Canción' :
                                             rec.type === 'album' ? 'Álbum' :
                                             rec.type === 'artist' ? 'Artista' : 'Playlist'}
                                          </span>
                                          <span className="text-xs font-bold text-white break-words">{rec.title}</span>
                                          <span className="text-[11px] text-gray-400 break-words">— {rec.artist}</span>
                                        </div>
                                        {rec.description && (
                                          <p className="text-[11px] text-gray-300 mt-1 leading-relaxed break-words">
                                            {rec.description}
                                          </p>
                                        )}
                                      </div>

                                      {rec.mediaUrl ? (
                                        <a
                                          href={rec.mediaUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="px-2 py-1 rounded bg-indigo-500/25 hover:bg-indigo-500/40 text-indigo-200 text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer border border-indigo-400/30 transition-colors"
                                          title="Abrir enlace de reproducción"
                                        >
                                          <ExternalLink size={10} />
                                          <span>Escuchar ↗</span>
                                        </a>
                                      ) : (
                                        <span className="text-[9px] font-mono text-gray-500 shrink-0">
                                          Audio puro
                                        </span>
                                      )}
                                    </div>

                                    {/* Ranking de 5 estrellas para la recomendación */}
                                    <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px] flex-wrap gap-1">
                                      <span className="text-gray-400 font-mono text-[9px] truncate">
                                        Por {rec.author}
                                      </span>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <Star size={11} className="text-amber-400 fill-amber-400" />
                                        <span className="font-bold text-white">{rec.rating.toFixed(1)}</span>
                                        <span className="text-gray-400 text-[9px]">({rec.votesCount})</span>
                                        <div className="flex items-center gap-0.5 ml-1">
                                          {[1, 2, 3, 4, 5].map((s) => (
                                            <button
                                              key={s}
                                              type="button"
                                              onClick={() => community.rateRecommendation(preset.id, rec.id, s)}
                                              className={`cursor-pointer p-0.5 ${
                                                (rec.userVote || 0) >= s ? 'text-amber-400' : 'text-gray-600 hover:text-amber-300'
                                              }`}
                                              title={`Votar ${s} estrellas`}
                                            >
                                              <Star size={10} className={((rec.userVote || 0) >= s) ? 'fill-amber-400' : ''} />
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Comentarios de la recomendación musical */}
                                    <div className="pt-1">
                                      <button
                                        type="button"
                                        onClick={() => setActiveRecComments((prev) => ({ ...prev, [rec.id]: !prev[rec.id] }))}
                                        className="text-[10px] text-indigo-300 hover:text-indigo-100 flex items-center gap-1 cursor-pointer font-medium"
                                      >
                                        <MessageSquare size={10} />
                                        <span>Comentarios de la pista ({rec.comments?.length || 0})</span>
                                      </button>

                                      {activeRecComments[rec.id] && (
                                        <div className="mt-2 pl-2 border-l-2 border-indigo-500/30 space-y-1.5 animate-in fade-in">
                                          {rec.comments && rec.comments.length > 0 ? (
                                            rec.comments.map((c) => (
                                              <div key={c.id} className="p-1.5 rounded bg-black/50 text-[10px]">
                                                <div className="flex items-center justify-between text-gray-400 text-[9px] mb-0.5">
                                                  <span className="font-bold text-gray-300">{c.author}</span>
                                                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-gray-300 leading-snug break-words">{c.text}</p>
                                              </div>
                                            ))
                                          ) : (
                                            <p className="text-[9px] text-gray-500">Sin notas aún sobre este audio. ¡Deja la primera!</p>
                                          )}
                                          <div className="flex gap-1 pt-1">
                                            <input
                                              type="text"
                                              value={recCommentInput[rec.id] || ''}
                                              onChange={(e) => setRecCommentInput((prev) => ({ ...prev, [rec.id]: e.target.value }))}
                                              placeholder="Comentar esta pista..."
                                              className="flex-1 bg-black/70 border border-white/10 rounded px-2 py-1 text-[10px] text-white outline-none focus:border-indigo-400"
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter' && recCommentInput[rec.id]?.trim()) {
                                                  community.addRecommendationComment(
                                                    preset.id,
                                                    rec.id,
                                                    userDisplayName || 'Viajero Sónico',
                                                    recCommentInput[rec.id]
                                                  );
                                                  setRecCommentInput((prev) => ({ ...prev, [rec.id]: '' }));
                                                }
                                              }}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (!recCommentInput[rec.id]?.trim()) return;
                                                community.addRecommendationComment(
                                                  preset.id,
                                                  rec.id,
                                                  userDisplayName || 'Viajero Sónico',
                                                  recCommentInput[rec.id]
                                                );
                                                setRecCommentInput((prev) => ({ ...prev, [rec.id]: '' }));
                                              }}
                                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                                            >
                                              Enviar
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* ========================================================= */}
                        {/* SUBSECCIÓN 2: COMENTARIOS DEL PRESET                      */}
                        {/* ========================================================= */}
                        {currentExpanded === 'comments' && (
                          <div className="p-3.5 bg-black/50 rounded-xl border border-cyan-500/25 space-y-3 animate-in fade-in duration-200 min-w-0">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                                <MessageSquare size={13} />
                                Comentarios de la Comunidad
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setCommentFormPresetId(commentFormPresetId === preset.id ? null : preset.id)
                                }
                                className="text-[10px] font-bold text-cyan-200 hover:text-white flex items-center gap-1 bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/40 px-2 py-0.5 rounded cursor-pointer transition-colors"
                              >
                                <Plus size={11} />
                                <span>Añadir Comentario</span>
                              </button>
                            </div>

                            {/* Formulario nuevo comentario */}
                            {commentFormPresetId === preset.id && (
                              <div className="p-3 bg-black/75 rounded-xl border border-cyan-400/30 space-y-2 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <input
                                    type="text"
                                    value={commentAuthor}
                                    onChange={(e) => setCommentAuthor(e.target.value)}
                                    placeholder={userDisplayName || 'Tu nombre o alias...'}
                                    className="bg-black/80 border border-white/15 rounded px-2 py-1 text-[11px] text-white placeholder-gray-500 outline-none flex-1 min-w-[120px]"
                                  />
                                  <div className="flex items-center gap-1 text-[11px] text-gray-300 shrink-0">
                                    <span>Voto:</span>
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <button
                                        key={s}
                                        type="button"
                                        onClick={() => setCommentRating(s)}
                                        className="text-amber-400 p-0.5"
                                      >
                                        <Star size={13} className={commentRating >= s ? 'fill-amber-400' : ''} />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <textarea
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  placeholder="Escribe tu experiencia con este preset..."
                                  rows={2}
                                  className="w-full bg-black/80 border border-white/15 rounded p-2 text-[11px] text-white placeholder-gray-500 outline-none resize-none"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setCommentFormPresetId(null)}
                                    className="px-2 py-1 text-[10px] text-gray-400 hover:text-white"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePublishPresetComment(preset.id)}
                                    className="px-3.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-bold cursor-pointer transition-colors shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                                  >
                                    Publicar Comentario
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Lista de comentarios */}
                            {comments.length === 0 ? (
                              <p className="text-[11px] text-gray-400 text-center py-2.5">
                                No hay comentarios aún. ¡Sé el primero en compartir tu experiencia!
                              </p>
                            ) : (
                              <div className="space-y-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                                {comments.map((c) => (
                                  <div
                                    key={c.id}
                                    className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs space-y-1 min-w-0"
                                  >
                                    <div className="flex items-center justify-between text-[10px] flex-wrap gap-1">
                                      <span className="font-bold text-gray-200">{c.author}</span>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {c.rating && (
                                          <div className="flex text-amber-400">
                                            {Array.from({ length: c.rating }).map((_, i) => (
                                              <Star key={i} size={10} className="fill-amber-400" />
                                            ))}
                                          </div>
                                        )}
                                        <span className="text-gray-500 text-[9px] font-mono">
                                          {new Date(c.createdAt).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                    <p className="text-[11px] text-gray-300 leading-relaxed break-words">
                                      {c.text}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: BIBLIOTECA PERSONAL (ALMACÉN Y CARPETAS)          */}
        {/* ========================================================= */}
        {activeTab === 'collection' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            
            {/* Carpetas Bar */}
            <div className="p-3 sm:p-4 border-b border-white/10 bg-black/40 space-y-3 shrink-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                  <Folder className="w-4 h-4" />
                  <span>Carpetas de tu Almacén:</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewFolderRow(!showNewFolderRow)}
                    className="px-2.5 py-1 rounded-lg bg-purple-600/25 border border-purple-400/40 text-purple-200 hover:bg-purple-600/40 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus size={12} />
                    <span>Nueva Carpeta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSaveCurrentForm(!showSaveCurrentForm)}
                    className="px-2.5 py-1 rounded-lg bg-cyan-600/25 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-600/40 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Save size={12} />
                    <span>Guardar Ajustes Actuales</span>
                  </button>
                </div>
              </div>

              {/* Fila creación de carpeta */}
              {showNewFolderRow && (
                <form onSubmit={handleCreateFolder} className="p-2.5 bg-black/60 border border-purple-400/30 rounded-xl flex items-center gap-2 animate-in fade-in">
                  <FolderPlus size={14} className="text-purple-400 shrink-0" />
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Nombre de la nueva carpeta..."
                    className="flex-1 bg-black/70 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-purple-400"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Crear
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewFolderRow(false)}
                    className="text-gray-400 hover:text-white text-xs px-1"
                  >
                    ✕
                  </button>
                </form>
              )}

              {/* Fila guardar ajustes actuales */}
              {showSaveCurrentForm && (
                <form onSubmit={handleSaveCurrentAsPreset} className="p-3 bg-black/70 border border-cyan-400/30 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs text-cyan-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Save size={13} />
                      Guardar configuración actual del visualizador
                    </span>
                    <button type="button" onClick={() => setShowSaveCurrentForm(false)} className="text-gray-400 hover:text-white">✕</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={savePresetName}
                      onChange={(e) => setSavePresetName(e.target.value)}
                      placeholder="Nombre del preset..."
                      required
                      className="bg-black/80 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                    />
                    <select
                      value={savePresetFolder}
                      onChange={(e) => setSavePresetFolder(e.target.value)}
                      className="bg-black/80 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                    >
                      <option value="">📁 Sin Carpeta (Raíz)</option>
                      {folders.map((f) => (
                        <option key={f} value={f}>📁 {f}</option>
                      ))}
                    </select>
                    <select
                      value={savePresetCategory}
                      onChange={(e) => setSavePresetCategory(e.target.value)}
                      className="bg-black/80 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                    >
                      <option value="custom">Personalizado</option>
                      <option value="genesis">Génesis Sagrado</option>
                      <option value="rhythmic">Ritmos Musicales</option>
                      <option value="harmonic">Armónicos</option>
                      <option value="drift">Deriva & Fluidez</option>
                      <option value="quantum">Cuántica</option>
                    </select>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                    >
                      Guardar en Biblioteca
                    </button>
                  </div>
                </form>
              )}

              {/* Carpetas Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-nowrap min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedFolder('all')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    selectedFolder === 'all'
                      ? 'bg-purple-500/30 text-purple-200 border border-purple-400/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                      : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                  }`}
                >
                  📁 Todas ({userPresets.length})
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFolder('none')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    selectedFolder === 'none'
                      ? 'bg-purple-500/30 text-purple-200 border border-purple-400/50'
                      : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                  }`}
                >
                  📂 Sin Carpeta ({userPresets.filter((p) => !p.folder).length})
                </button>

                {folders.map((folderName) => {
                  const countInFolder = userPresets.filter((p) => p.folder === folderName).length;
                  const isFolderActive = selectedFolder === folderName;
                  return (
                    <div key={folderName} className="flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedFolder(folderName)}
                        className={`px-3 py-1 rounded-l-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          isFolderActive
                            ? 'bg-purple-500/30 text-purple-200 border-y border-l border-purple-400/50'
                            : 'bg-white/5 text-gray-400 hover:text-white border-y border-l border-white/5'
                        }`}
                      >
                        📁 {folderName} ({countInFolder})
                      </button>
                      {folderName !== ESSENTIALS_FOLDER_NAME && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Eliminar la carpeta "${folderName}"? Los presets pasarán a Sin Carpeta.`)) {
                              deleteFolder(folderName);
                              if (selectedFolder === folderName) setSelectedFolder(ESSENTIALS_FOLDER_NAME);
                            }
                          }}
                          className={`px-2 py-1 rounded-r-full text-xs transition-all border-y border-r cursor-pointer ${
                            isFolderActive
                              ? 'bg-purple-500/30 text-purple-300 hover:text-red-300 border-purple-400/50'
                              : 'bg-white/5 text-gray-500 hover:text-red-300 border-white/5'
                          }`}
                          title="Eliminar carpeta"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Search, Sort and Export/Import Row */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between pt-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="relative flex-1 min-w-[130px]">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={personalSearch}
                      onChange={(e) => setPersonalSearch(e.target.value)}
                      placeholder="Buscar en tu biblioteca..."
                      className="w-full bg-black/60 border border-white/15 rounded-lg pl-8 pr-2 py-1 text-xs text-white placeholder-gray-500 outline-none"
                    />
                  </div>

                  <select
                    value={personalSortMode}
                    onChange={(e) => setPersonalSortMode(e.target.value as any)}
                    className="bg-black/60 border border-white/15 rounded-lg px-2 py-1 text-xs text-gray-300 outline-none cursor-pointer"
                  >
                    <option value="custom">Orden Personalizado (▲/▼)</option>
                    <option value="name-asc">Nombre A-Z</option>
                    <option value="name-desc">Nombre Z-A</option>
                    <option value="newest">Más Recientes</option>
                    <option value="oldest">Más Antiguos</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => exportPresets(selectedFolder)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/40 text-emerald-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Descargar presets en archivo JSON"
                  >
                    <Download size={12} />
                    <span>Exportar</span>
                  </button>

                  <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        importPresets(file, selectedFolder === 'all' || selectedFolder === 'none' ? undefined : selectedFolder);
                        showNotice('Presets importados con éxito a tu Biblioteca.');
                      }
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-cyan-600/20 border border-cyan-500/30 hover:bg-cyan-600/40 text-cyan-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Cargar presets desde un archivo JSON"
                  >
                    <Upload size={12} />
                    <span>Importar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Presets List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 space-y-3">
              {filteredPersonalPresets.length === 0 ? (
                <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10 space-y-3">
                  <p className="text-sm text-gray-300">
                    No tienes presets en esta carpeta aún.
                  </p>
                  <p className="text-xs text-gray-400">
                    Puedes explorar la pestaña <strong>Librería</strong> para agregar presets oficiales o comunitarios a tus carpetas, o guardar tus ajustes actuales.
                  </p>
                  <button
                    onClick={() => setActiveTab('library')}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer"
                  >
                    Explorar la Librería de Presets
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredPersonalPresets.map((preset, index) => (
                    <div
                      key={preset.id}
                      className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-white/10 hover:border-purple-400/40 transition-all flex flex-col justify-between space-y-3 min-w-0"
                    >
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {personalSortMode === 'custom' && (
                            <div className="flex flex-col shrink-0">
                              <button
                                type="button"
                                onClick={() => handleMovePriority(index, 'up')}
                                disabled={index === 0}
                                className={`p-0.5 ${index === 0 ? 'text-gray-700' : 'text-gray-400 hover:text-cyan-300'}`}
                                title="Subir prioridad"
                              >
                                <ChevronUp size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMovePriority(index, 'down')}
                                disabled={index === userPresets.length - 1}
                                className={`p-0.5 ${index === userPresets.length - 1 ? 'text-gray-700' : 'text-gray-400 hover:text-cyan-300'}`}
                                title="Bajar prioridad"
                              >
                                <ChevronDown size={13} />
                              </button>
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white break-words">
                              {preset.name}
                            </h4>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                                {preset.folder ? `📁 ${preset.folder}` : '📂 Sin Carpeta'}
                              </span>
                              {preset.category && (
                                <span className="text-[9px] font-mono text-gray-400">
                                  • {preset.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botón Eliminar */}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Eliminar el preset "${preset.name}"?`)) {
                              deletePreset(preset.id);
                              showNotice(`Preset "${preset.name}" eliminado.`);
                            }
                          }}
                          className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                          title="Eliminar preset"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Selector de Carpeta y Botón Cargar */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs flex-wrap">
                        <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                          <span className="text-[10px] text-gray-400 shrink-0">Mover:</span>
                          <select
                            value={preset.folder || ''}
                            onChange={(e) => movePresetToFolder(preset.id, e.target.value)}
                            className="flex-1 bg-black/60 border border-white/10 rounded px-2 py-1 text-[11px] text-gray-300 outline-none cursor-pointer"
                          >
                            <option value="">📂 Sin Carpeta</option>
                            {folders.map((f) => (
                              <option key={f} value={f}>📁 {f}</option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleLoadPersonalPreset(preset)}
                          className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-[0_0_10px_rgba(6,182,212,0.4)] flex items-center gap-1 cursor-pointer shrink-0"
                          title="Cargar y activar este preset en el visualizador"
                        >
                          <span>Cargar Preset</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PresetsHubModal;
