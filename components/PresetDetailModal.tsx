import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Folder, 
  Star, 
  Play, 
  Check, 
  Headphones, 
  MessageSquare, 
  Music, 
  ExternalLink, 
  Plus, 
  Zap, 
  Layers, 
  Sliders, 
  Eye, 
  Radio,
  Send
} from 'lucide-react';
import { Preset } from '../hooks/usePresets';
import { usePresetCommunity, MusicRecommendationType } from '../hooks/usePresetCommunity';
import { DEFAULT_PRESETS } from '../lib/defaultPresets';
import { AUTO_MODE_LABELS } from './ControlPanel';

interface PresetDetailModalProps {
  open: boolean;
  onClose: () => void;
  preset: Preset | any | null;
  onApplyPreset?: (preset: any) => void;
  isSelected?: boolean;
  userDisplayName?: string;
}

export const PresetDetailModal: React.FC<PresetDetailModalProps> = ({
  open,
  onClose,
  preset,
  onApplyPreset,
  isSelected = false,
  userDisplayName
}) => {
  const community = usePresetCommunity();
  const [activeTab, setActiveTab] = useState<'info' | 'music' | 'comments'>('info');

  // Music Recommendation form state
  const [showRecForm, setShowRecForm] = useState(false);
  const [recType, setRecType] = useState<MusicRecommendationType>('song');
  const [recTitle, setRecTitle] = useState('');
  const [recArtist, setRecArtist] = useState('');
  const [recAlbum, setRecAlbum] = useState('');
  const [recUrl, setRecUrl] = useState('');
  const [recDesc, setRecDesc] = useState('');

  // Comment form state
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentRating, setCommentRating] = useState(5);

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  if (!open || !preset) return null;

  // Preset ID normalization
  const presetId = preset.id || 'preset-' + (preset.name || 'custom');
  const presetTitle = preset.name || preset.title || 'Preset';
  const presetFolder = preset.folder || preset.folderPath || 'Sin carpeta';

  // Find library preset counterpart if available for official description
  const libraryCounterpart = DEFAULT_PRESETS.find(
    p => p.id === preset.id || p.title === presetTitle || p.title.toLowerCase().startsWith(presetTitle.toLowerCase())
  );

  // Safe parse of parameters
  let parsedParams: any = {};
  try {
    parsedParams = typeof preset.params === 'string' ? JSON.parse(preset.params) : (preset.params || {});
  } catch (e) {
    parsedParams = {};
  }

  // Description fallback
  const presetDescription = 
    preset.description || 
    libraryCounterpart?.description || 
    (parsedParams.autoRandomMode 
      ? `Ajuste sinestésico configurado en modo ${AUTO_MODE_LABELS[parsedParams.autoRandomMode] || parsedParams.autoRandomMode} con balance adaptativo de audio.`
      : 'Configuración personalizada guardada en la biblioteca con parámetros visuales y sonoros específicos.');

  // Community data
  const ratingData = community.getPresetRating(presetId);
  const comments = community.getPresetComments(presetId);
  const recommendations = community.getPresetRecommendations(presetId);

  // Submits
  const handlePublishRecommendation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recTitle.trim() || !recArtist.trim()) {
      alert('Por favor ingresa al menos el título y artista de la obra recomendada.');
      return;
    }

    community.addPresetRecommendation(presetId, {
      type: recType,
      title: recTitle.trim(),
      artist: recArtist.trim(),
      album: recAlbum.trim() || undefined,
      mediaUrl: recUrl.trim() || undefined,
      description: recDesc.trim() || undefined,
      author: userDisplayName || 'Viajero Sónico'
    });

    setRecTitle('');
    setRecArtist('');
    setRecAlbum('');
    setRecUrl('');
    setRecDesc('');
    setShowRecForm(false);
    setNotificationMsg('¡Recomendación musical añadida con éxito!');
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  const handlePublishComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    community.addPresetComment(
      presetId,
      commentAuthor.trim() || userDisplayName || 'Viajero Sónico',
      commentText.trim(),
      commentRating
    );

    setCommentText('');
    setShowCommentForm(false);
    setNotificationMsg('¡Comentario publicado con éxito!');
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  const handleApply = () => {
    if (onApplyPreset) {
      onApplyPreset(preset);
      setNotificationMsg('¡Preset cargado en el visualizador!');
      setTimeout(() => setNotificationMsg(null), 3000);
    }
  };

  // Human explanation of settings
  const modeKey = parsedParams.autoRandomMode || parsedParams.autoPilotMode;
  const modeName = modeKey && modeKey !== 'none' ? (AUTO_MODE_LABELS[modeKey] || modeKey) : 'Manual / Fijo';
  const sacredModes = parsedParams.sacredGeometryModes || (parsedParams.sacredGeometryEnabled ? ['Modo sagrado activo'] : []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5">
      <div 
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_30px_rgba(6,182,212,0.15)] bg-gradient-to-b from-slate-950/95 via-black/95 to-slate-950/95 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-black/40 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide truncate">
                {presetTitle}
              </h3>
              {isSelected && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[10px] font-bold flex items-center gap-1 shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Activo
                </span>
              )}
              {presetId.startsWith('essential_') && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold">
                  ✨ Esencial
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Folder size={12} className="text-purple-400" />
                <span className="text-purple-200 font-medium">{presetFolder}</span>
              </span>
              <span>•</span>
              {/* Estrellas interactivas */}
              <div className="flex items-center gap-1">
                <Star size={12} className="text-amber-400 fill-amber-400" />
                <span className="font-bold text-white">{ratingData.average.toFixed(1)}</span>
                <span className="text-[11px] text-gray-400">({ratingData.count} votos)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleApply}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                isSelected
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50'
                  : 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              }`}
              title="Cargar y aplicar este preset al visualizador"
            >
              {isSelected ? (
                <>
                  <Check size={13} className="text-cyan-300" />
                  <span>Cargado</span>
                </>
              ) : (
                <>
                  <Play size={12} fill="currentColor" />
                  <span>Cargar Preset</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Notificación flotante */}
        {notificationMsg && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-200 px-4 py-2 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check size={13} className="text-emerald-400" />
            <span>{notificationMsg}</span>
          </div>
        )}

        {/* Pestañas de Navegación del Modal */}
        <div className="flex items-center border-b border-white/10 bg-black/20 px-4 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'info'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Sliders size={13} />
            <span>Ajustes & Info</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('music')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'music'
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Headphones size={13} />
            <span>Música Recomendada ({recommendations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'comments'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <MessageSquare size={13} />
            <span>Comentarios ({comments.length})</span>
          </button>
        </div>

        {/* Contenido Principal con Scroll */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 custom-scrollbar space-y-4">
          
          {/* ========================================================= */}
          {/* PESTAÑA 1: AJUSTES & INFORMACIÓN COMPLETA                */}
          {/* ========================================================= */}
          {activeTab === 'info' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Descripción Principal */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  Descripción General
                </span>
                <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
                  {presetDescription}
                </p>
              </div>

              {/* Desglose de Ajustes del Preset */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders size={13} className="text-cyan-400" />
                  <span>Detalle de Ajustes Configurados</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Modo Automático */}
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <Zap size={13} />
                      <span>Modo Automático / Piloto</span>
                    </div>
                    <p className="text-xs font-semibold text-white">{modeName}</p>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      {modeKey === 'rhythmic' && 'Alineación reactiva a pulsos percusivos, transitorios y cambios dinámicos.'}
                      {modeKey === 'dj' && 'Respuesta enérgica e instantánea ante drops, bombos y transiciones de mezcla.'}
                      {modeKey === 'sacred' && 'Evolución armónica continua que sincroniza proporciones y resonancias meditativas.'}
                      {modeKey === 'astral' && 'Deriva psicodélica con giros multidimensionales y transformaciones etéreas.'}
                      {modeKey === 'rainbow' && 'Cromodinámica sinestésica que recorre el espectro luminoso según los agudos.'}
                      {modeKey === 'smart' && 'Adaptación inteligente que balancea reactividad rítmica y armonía tonal.'}
                      {(!modeKey || modeKey === 'none') && 'Ajuste manual estable sin regeneración aleatoria automática.'}
                    </p>
                  </div>

                  {/* Geometría Sagrada */}
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                      <Layers size={13} />
                      <span>Geometría Sagrada</span>
                    </div>
                    <p className="text-xs font-semibold text-white">
                      {sacredModes.length > 0 ? `${sacredModes.length} Modos Activos` : 'Geometría Base'}
                    </p>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      {sacredModes.length > 0 
                        ? `Modos: ${sacredModes.join(', ')}.` 
                        : 'Estructura visual sin capas geométricas adicionales.'}
                    </p>
                  </div>

                  {/* Reactividad y Sincronización */}
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                      <Radio size={13} />
                      <span>Detección y Reactividad</span>
                    </div>
                    <p className="text-xs font-semibold text-white">
                      {parsedParams.autoRandomOnBeat ? 'Sincronizado al Ritmo' : 'Reactivo a Frecuencia'}
                    </p>
                    <div className="text-[10px] text-gray-400 space-y-0.5">
                      {parsedParams.autoBeatSensitivity !== undefined && (
                        <div>Sensibilidad Beat: <strong className="text-cyan-300">{parsedParams.autoBeatSensitivity}%</strong></div>
                      )}
                      {parsedParams.autoEmotionSensitivity !== undefined && (
                        <div>Sensibilidad Emoción: <strong className="text-purple-300">{parsedParams.autoEmotionSensitivity}%</strong></div>
                      )}
                      {parsedParams.autoStyleFluidity !== undefined && (
                        <div>Fluidez de Estilo: <strong className="text-gray-200">{parsedParams.autoStyleFluidity}%</strong></div>
                      )}
                    </div>
                  </div>

                  {/* Entorno Inmersivo */}
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                      <Eye size={13} />
                      <span>Entorno Inmersivo & Color</span>
                    </div>
                    <p className="text-xs font-semibold text-white">
                      {parsedParams.arPortalMode ? 'Portal AR 3D Activo' : (parsedParams.vrMode ? 'Modo VR Activo' : 'Pantalla Directa')}
                    </p>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      {parsedParams.harmonicColor ? 'Paleta armónica sintonizada' : 'Gama de color natural'}.
                      {parsedParams.baseHue !== undefined ? ` Tonalidad base: ${parsedParams.baseHue}°` : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Metadata adicional */}
              <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-white/5">
                <span>ID: <code className="text-gray-400 font-mono">{presetId}</code></span>
                <span>Ubicación: <strong className="text-gray-300">{presetFolder}</strong></span>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 2: RECOMENDACIONES MUSICALES                      */}
          {/* ========================================================= */}
          {activeTab === 'music' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-gray-300">
                  Obras musicales, álbumes y playlists óptimas para sintonizar con este preset:
                </p>
                <button
                  type="button"
                  onClick={() => setShowRecForm(!showRecForm)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/40 text-indigo-200 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                >
                  <Plus size={12} />
                  <span>Recomendar Música</span>
                </button>
              </div>

              {/* Formulario de nueva recomendación */}
              {showRecForm && (
                <form onSubmit={handlePublishRecommendation} className="p-3.5 rounded-xl bg-black/60 border border-indigo-500/40 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Music size={13} className="text-indigo-400" />
                      Nueva Recomendación Musical
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowRecForm(false)}
                      className="text-gray-400 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={recType}
                      onChange={(e) => setRecType(e.target.value as MusicRecommendationType)}
                      className="bg-black/80 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                    >
                      <option value="song">🎵 Canción individual</option>
                      <option value="album">💿 Álbum completo</option>
                      <option value="playlist">🎧 Playlist / Sesión</option>
                      <option value="artist">👤 Artista / Proyecto</option>
                    </select>

                    <input
                      type="text"
                      value={recTitle}
                      onChange={(e) => setRecTitle(e.target.value)}
                      placeholder="Título de la obra / pista *"
                      required
                      className="bg-black/80 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-400"
                    />

                    <input
                      type="text"
                      value={recArtist}
                      onChange={(e) => setRecArtist(e.target.value)}
                      placeholder="Artista o compositor *"
                      required
                      className="bg-black/80 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-400"
                    />

                    <input
                      type="text"
                      value={recAlbum}
                      onChange={(e) => setRecAlbum(e.target.value)}
                      placeholder="Álbum o sello (opcional)"
                      className="bg-black/80 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-400"
                    />
                  </div>

                  <input
                    type="url"
                    value={recUrl}
                    onChange={(e) => setRecUrl(e.target.value)}
                    placeholder="Enlace de Spotify, YouTube o SoundCloud (opcional)"
                    className="w-full bg-black/80 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-400"
                  />

                  <textarea
                    value={recDesc}
                    onChange={(e) => setRecDesc(e.target.value)}
                    placeholder="¿Por qué resuena con este preset? (p. ej. bombos pesados, arpegios cósmicos)..."
                    rows={2}
                    className="w-full bg-black/80 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-400 resize-none"
                  />

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowRecForm(false)}
                      className="px-3 py-1 text-xs text-gray-400 hover:text-white cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(99,102,241,0.4)] cursor-pointer"
                    >
                      Publicar Recomendación
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Recomendaciones */}
              {recommendations.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-xs bg-black/30 rounded-xl border border-white/5 space-y-1">
                  <Headphones size={20} className="mx-auto text-gray-500 mb-1" />
                  <p className="font-semibold text-gray-300">Aún no hay recomendaciones musicales para este preset.</p>
                  <p className="text-[11px] text-gray-500">¡Sé el primero en compartir música ideal para acompañar esta geometría!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recommendations.map(rec => (
                    <div 
                      key={rec.id}
                      className="p-3 rounded-xl bg-black/40 border border-white/5 hover:border-indigo-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {rec.type === 'album' ? '💿 Álbum' : (rec.type === 'playlist' ? '🎧 Playlist' : '🎵 Pista')}
                          </span>
                          <h5 className="text-xs sm:text-sm font-bold text-white truncate">
                            {rec.title}
                          </h5>
                          <span className="text-xs text-indigo-300 font-medium">
                            — {rec.artist}
                          </span>
                        </div>

                        {rec.album && (
                          <p className="text-[11px] text-gray-400 italic">
                            Álbum: {rec.album}
                          </p>
                        )}

                        {rec.description && (
                          <p className="text-xs text-gray-300 leading-relaxed">
                            {rec.description}
                          </p>
                        )}

                        <span className="text-[10px] text-gray-500 block">
                          Sugerido por <strong className="text-gray-400">{rec.author}</strong>
                        </span>
                      </div>

                      {rec.mediaUrl && (
                        <a
                          href={rec.mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-200 border border-indigo-500/30 text-[11px] font-bold transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer"
                        >
                          <span>Escuchar</span>
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 3: COMENTARIOS Y VALORACIONES                    */}
          {/* ========================================================= */}
          {activeTab === 'comments' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-gray-300">
                  Experiencias, sensaciones y retroalimentación de la comunidad:
                </p>
                <button
                  type="button"
                  onClick={() => setShowCommentForm(!showCommentForm)}
                  className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/40 text-purple-200 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                >
                  <Plus size={12} />
                  <span>Dejar Comentario</span>
                </button>
              </div>

              {/* Formulario de comentario */}
              {showCommentForm && (
                <form onSubmit={handlePublishComment} className="p-3.5 rounded-xl bg-black/60 border border-purple-500/40 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <MessageSquare size={13} className="text-purple-400" />
                      Escribir Comentario
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCommentForm(false)}
                      className="text-gray-400 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <input
                      type="text"
                      value={commentAuthor}
                      onChange={(e) => setCommentAuthor(e.target.value)}
                      placeholder={userDisplayName || "Tu nombre o apodo..."}
                      className="flex-1 min-w-[150px] bg-black/80 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-purple-400"
                    />

                    {/* Selector de calificación */}
                    <div className="flex items-center gap-1 bg-black/80 border border-white/15 rounded-lg px-2 py-1">
                      <span className="text-[11px] text-gray-400 mr-1">Calificar:</span>
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setCommentRating(star)}
                          className="p-0.5 cursor-pointer hover:scale-125 transition-transform"
                        >
                          <Star 
                            size={13} 
                            className={commentRating >= star ? "text-amber-400 fill-amber-400" : "text-gray-600"} 
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Comparte cómo reacciona el visualizador con tu música, sensaciones o sugerencias..."
                    rows={3}
                    required
                    className="w-full bg-black/80 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-purple-400 resize-none"
                  />

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCommentForm(false)}
                      className="px-3 py-1 text-xs text-gray-400 hover:text-white cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(168,85,247,0.4)] cursor-pointer flex items-center gap-1"
                    >
                      <Send size={11} />
                      <span>Publicar</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Comentarios */}
              {comments.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-xs bg-black/30 rounded-xl border border-white/5 space-y-1">
                  <MessageSquare size={20} className="mx-auto text-gray-500 mb-1" />
                  <p className="font-semibold text-gray-300">Aún no hay comentarios para este preset.</p>
                  <p className="text-[11px] text-gray-500">Sé el primero en compartir tu experiencia sinestésica.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {comments.map(c => (
                    <div 
                      key={c.id}
                      className="p-3 rounded-xl bg-black/40 border border-white/5 hover:border-purple-500/30 transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          {c.author}
                        </span>
                        {c.rating && (
                          <div className="flex items-center gap-0.5 text-amber-400">
                            {Array.from({ length: c.rating }).map((_, i) => (
                              <Star key={i} size={11} className="fill-amber-400" />
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-200 leading-relaxed">
                        {c.text}
                      </p>
                      <span className="text-[10px] text-gray-500 block">
                        {new Date(c.createdAt).toLocaleDateString(undefined, { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default PresetDetailModal;
