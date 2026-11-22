import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Cpu,
  Disc,
  ExternalLink,
  FolderOpen,
  Glasses,
  Globe,
  Layers,
  Link2,
  Lock,
  LogOut,
  MessageSquare,
  Mic,
  MicOff,
  Monitor,
  Music,
  Pause,
  Play,
  Plus,
  Power,
  Radio,
  RefreshCw,
  Search,
  Send,
  Shield,
  SkipForward,
  Sliders,
  Sparkles,
  Upload,
  Users,
  Video,
  VideoOff,
  Volume2,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import StarSeedSymbol from './StarSeedSymbol';
import LiveAudioVisualizer from './LiveAudioVisualizer';
import type { SpectrumSnapshot } from '../hooks/useAudioAnalyzer';
import type { StarSeedIdentity } from '../hooks/useStarSeedIdentity';
import type { UseStarSeedSyncResult } from '../hooks/useStarSeedSync';
import {
  DEFAULT_CHANNEL_PERMISSIONS,
  type ChannelPermissions,
  type DiscoveredTransmission,
  type TransmissionFormat,
  type TransmissionKind,
  type TransmissionVisibility,
  type UseLiveTransmissionResult,
} from '../hooks/useLiveTransmission';
import {
  fetchPrivateAudioLibrary,
  fetchPublicAudioLibraries,
  type AudioLibraryEntry,
} from '../lib/starseedAudioLibraries';
import {
  disconnectSpotify,
  getSpotifySession,
  getStoredSpotifyClientId,
  getStoredSpotifyMcpUrl,
  searchSpotifyTracks,
  setStoredSpotifyClientId,
  setStoredSpotifyMcpUrl,
  startSpotifyPkceAuth,
  testSpotifyMcpConnection,
  type SpotifyMcpStatus,
  type SpotifyTrackSummary,
} from '../lib/spotifyBridge';
import type { VisualizerParams } from '../types';
import type { BrainNeuronDevice } from '../lib/starseedBrains';

export type LiveHubTab = 'discover' | 'create' | 'audio' | 'room' | 'mesh';

interface LiveTransmissionHubProps {
  open: boolean;
  onClose: () => void;
  initialTab?: LiveHubTab;
  live: UseLiveTransmissionResult;
  identity: StarSeedIdentity;
  sync: UseStarSeedSyncResult;
  neurons?: BrainNeuronDevice[];
  currentNeuron?: BrainNeuronDevice;
  params: VisualizerParams;
  setParams: React.Dispatch<React.SetStateAction<VisualizerParams>>;
  getSpectrumSnapshot?: (outFreq?: Uint8Array, outTime?: Uint8Array) => SpectrumSnapshot;
}

const VideoTile: React.FC<{ stream: MediaStream; label: string; muted?: boolean }> = ({
  stream,
  label,
  muted,
}) => {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div className="relative rounded-xl overflow-hidden bg-black/80 border border-white/15 aspect-video">
      <video ref={ref} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/75 text-[10px] font-semibold text-white border border-white/10">
        {label}
      </span>
    </div>
  );
};

export const LiveTransmissionHub: React.FC<LiveTransmissionHubProps> = ({
  open,
  onClose,
  initialTab = 'discover',
  live,
  identity,
  neurons = [],
  currentNeuron,
  params,
  setParams,
  getSpectrumSnapshot,
}) => {
  const resolvedLocalNeuron = currentNeuron ?? live.localNeuron;
  const [activeTab, setActiveTab] = useState<LiveHubTab>(initialTab);
  const [copiedLink, setCopiedLink] = useState(false);

  // Discover state
  const [joinInput, setJoinInput] = useState('');
  const [joinStatus, setJoinStatus] = useState<string | null>(null);

  // Create form state
  const [kind, setKind] = useState<TransmissionKind>('channel');
  const [format, setFormat] = useState<TransmissionFormat>('presets_exact');
  const [visibility, setVisibility] = useState<TransmissionVisibility>('public');
  const [title, setTitle] = useState('Sintonía Cósmica StarSeed');
  const [description, setDescription] = useState('');
  const [entitySlug, setEntitySlug] = useState('');
  const [primaryNeuronId, setPrimaryNeuronId] = useState(resolvedLocalNeuron.id);
  const [backupNeuronIds, setBackupNeuronIds] = useState<string[]>([]);
  const [perms, setPerms] = useState<ChannelPermissions>({ ...DEFAULT_CHANNEL_PERMISSIONS });
  const [publishToCanalesDir, setPublishToCanalesDir] = useState(true);
  const [offlineOnly, setOfflineOnly] = useState(false);
  const [creating, setCreating] = useState(false);

  // Audio & Queue state
  const [audioSourceTab, setAudioSourceTab] = useState<'upload' | 'private' | 'public' | 'spotify'>('upload');
  const [uploadPersistence, setUploadPersistence] = useState<'temporary' | 'library'>('temporary');
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [privateEntries, setPrivateEntries] = useState<AudioLibraryEntry[]>([]);
  const [publicEntries, setPublicEntries] = useState<AudioLibraryEntry[]>([]);
  const [loadingLibs, setLoadingLibs] = useState(false);
  const [privateShareMode, setPrivateShareMode] = useState<'session_signed_url' | 'make_public'>('session_signed_url');

  // Spotify state
  const [spotifyInput, setSpotifyInput] = useState('');
  const [spotifySearchQuery, setSpotifySearchQuery] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<SpotifyTrackSummary[]>([]);
  const [spotifyStatusMsg, setSpotifyStatusMsg] = useState<string | null>(null);
  const [showSpotifySetup, setShowSpotifySetup] = useState(false);
  const [mcpUrlInput, setMcpUrlInput] = useState(() => getStoredSpotifyMcpUrl());
  const [mcpStatus, setMcpStatus] = useState<SpotifyMcpStatus | null>(null);
  const [clientIdInput, setClientIdInput] = useState(() => getStoredSpotifyClientId());
  const [spotifySession, setSpotifySession] = useState(() => getSpotifySession());

  // Room chat & SSL1 pairing state
  const [chatText, setChatText] = useState('');
  const [ssl1OfferCode, setSsl1OfferCode] = useState('');
  const [ssl1AnswerInput, setSsl1AnswerInput] = useState('');
  const [ssl1IncomingOffer, setSsl1IncomingOffer] = useState('');
  const [ssl1GeneratedAnswer, setSsl1GeneratedAnswer] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!open) return;
    if (activeTab === 'discover') {
      void live.refreshDirectory();
    } else if (activeTab === 'audio') {
      setLoadingLibs(true);
      void Promise.all([
        fetchPrivateAudioLibrary(identity.user?.id),
        fetchPublicAudioLibraries(),
      ]).then(([priv, pub]) => {
        setPrivateEntries(priv);
        setPublicEntries(pub);
        setLoadingLibs(false);
      });
    }
  }, [open, activeTab, identity.user?.id]);

  if (!open) return null;

  const copyShareUrl = async () => {
    if (!live.session?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(live.session.shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      /* ignore clipboard denied */
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = joinInput.trim();
    if (!raw) return;
    setJoinStatus('Conectando a la transmisión...');
    const res = raw.includes('/estaciones/vivo/') || raw.startsWith('http')
      ? await live.joinTransmission({ url: raw })
      : await live.joinTransmission({ id: raw });
    if (res.ok) {
      setJoinStatus(null);
      setJoinInput('');
      setActiveTab('room');
    } else {
      setJoinStatus(res.error || 'No se pudo conectar.');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await live.startTransmission({
      kind,
      format,
      visibility,
      title,
      description,
      entitySlug: visibility === 'entity' ? entitySlug || live.userEntities[0]?.slug : null,
      primaryNeuronId,
      backupNeuronIds,
      permissions: perms,
      publishToCanalesDir,
      offlineOnly,
    });
    setCreating(false);
    if (res.ok) {
      setActiveTab('room');
    }
  };

  const toggleBackupNeuron = (nid: string) => {
    setBackupNeuronIds((prev) => (prev.includes(nid) ? prev.filter((id) => id !== nid) : [...prev, nid]));
  };

  const baseNeurons = neurons.some((n) => n.id === resolvedLocalNeuron.id)
    ? neurons
    : [resolvedLocalNeuron, ...neurons];

  const allNeuronOptions = [
    ...baseNeurons.map((n) => ({
      id: n.id,
      name: n.name,
      platform: n.platform || n.kind || 'web',
      isOnline: n.isOnline,
    })),
    ...live.meshPeers
      .filter((m) => !baseNeurons.some((n) => n.id === m.id))
      .map((m) => ({ id: m.id, name: `${m.longName} (${m.medium})`, platform: m.medium, isOnline: true })),
  ];

  const tabs: Array<{ id: LiveHubTab; label: string; icon: React.ReactNode }> = [
    { id: 'discover', label: 'Explorar', icon: <Globe size={14} /> },
    { id: 'create', label: 'Emitir / Crear', icon: <Radio size={14} /> },
    { id: 'audio', label: 'Audio & Cola', icon: <Music size={14} /> },
    { id: 'room', label: 'Sala & XR', icon: <Users size={14} /> },
    { id: 'mesh', label: 'Red Mesh', icon: <Cpu size={14} /> },
  ];

  const isHost = Boolean(live.session?.isHost);
  const canControlPlayback = Boolean(
    isHost || (live.session?.kind === 'channel' && live.session.permissions.canSelectAudioSource)
  );
  const canQueue = Boolean(isHost || (live.session?.kind === 'channel' && live.session.permissions.canQueueAudio));

  return (
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/85 desktop-backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-label="Centro de Transmisiones En Vivo StarSeed OS"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="info-hub-shell w-full max-w-5xl h-full sm:h-[92vh] max-h-[920px] flex flex-col overflow-hidden rounded-none sm:rounded-[28px] border border-white/15">
        {/* Header */}
        <header className="px-3 sm:px-6 py-3 border-b border-white/10 bg-black/55 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="./starseed/app-icons/audiomorphic.png"
              alt="Audiomorphic"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-white/15 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold starseed-text-gradient truncate">
                  Transmisiones StarSeed En Vivo
                </h2>
                <StarSeedSymbol size="xs" glow />
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                Estaciones, Canales P2P, Omnifrecuencias & Audio Sincronizado
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {live.session && (
              <>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-200 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                  <span className="hidden xs:inline">
                    {live.session.kind === 'station' ? 'Estación' : 'Canal'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => void copyShareUrl()}
                  className="liquid-bubble px-2.5 py-1 text-[11px] font-semibold text-cyan-200 flex items-center gap-1 cursor-pointer"
                  title="Copiar enlace de transmisión o invitación"
                >
                  {copiedLink ? <Check size={12} className="text-emerald-300" /> : <Copy size={12} />}
                  <span className="hidden sm:inline">{copiedLink ? 'Copiado' : 'Copiar Enlace'}</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="liquid-bubble p-2 text-slate-300 hover:text-white cursor-pointer"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Scrollable Tabs */}
        <nav className="px-3 sm:px-6 py-2 border-b border-white/10 bg-black/40 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {tabs.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  active ? 'morph-tab-active text-white' : 'liquid-bubble text-slate-300 hover:text-white'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>

        {live.liveError && (
          <div className="mx-3 sm:mx-6 mt-2 px-3 py-2 rounded-xl bg-red-500/20 border border-red-400/40 text-red-200 text-xs flex items-center justify-between gap-2 shrink-0">
            <span>{live.liveError}</span>
            <button type="button" onClick={() => live.setLiveError(null)} className="text-red-200 hover:text-white cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4">
          {/* TAB 1: EXPLORAR */}
          {activeTab === 'discover' && (
            <div className="space-y-4">
              <form onSubmit={handleJoinSubmit} className="rounded-2xl border border-white/15 bg-black/45 p-3 sm:p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-cyan-200 flex items-center gap-1.5">
                    <Link2 size={14} /> Sintonizar Estación o Entrar a Canal por Enlace / ID
                  </span>
                  <button
                    type="button"
                    onClick={() => void live.refreshDirectory()}
                    className="liquid-bubble px-2.5 py-1 text-[11px] font-semibold text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={12} className={live.loadingDirectory ? 'animate-spin' : ''} />
                    Actualizar
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value)}
                    placeholder="Pega enlace https://.../estaciones/vivo/... , ?live=... o ID de sala"
                    className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    className="morph-btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Radio size={14} /> Entrar ahora
                  </button>
                </div>
                {joinStatus && <p className="text-xs text-cyan-200">{joinStatus}</p>}
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {live.discovered.length === 0 ? (
                  <div className="md:col-span-2 rounded-2xl border border-white/10 bg-black/35 p-6 text-center space-y-2">
                    <Radio size={28} className="mx-auto text-cyan-300 opacity-80" />
                    <p className="text-sm font-bold text-white">No hay estaciones o canales activos detectados aún</p>
                    <p className="text-xs text-slate-400">
                      Crea tu propia Estación o Canal Interactivo en "Emitir / Crear" o enlaza otro dispositivo en "Red Mesh".
                    </p>
                  </div>
                ) : (
                  live.discovered.map((item: DiscoveredTransmission) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/15 bg-black/45 p-3.5 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              item.kind === 'station'
                                ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200'
                                : 'bg-purple-500/15 border-purple-400/40 text-purple-200'
                            }`}
                          >
                            {item.kind === 'station' ? 'Estación · Solo Recibir' : 'Canal · Interactivo'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-300 px-2 py-0.5 rounded-full bg-white/5">
                            {item.sourceApp === 'omnifrecuencias' ? 'Omnifrecuencias' : 'Audiomorphic'}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white truncate">{item.title}</h3>
                        {item.description && (
                          <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                          <span>Host: {item.hostName}</span>
                          <span>· {item.listeners} conectado(s)</span>
                          {item.isLiveNow && <span className="text-emerald-300 font-semibold">● EN VIVO</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          void live.joinTransmission({ discovered: item }).then((r) => {
                            if (r.ok) setActiveTab('room');
                          });
                        }}
                        className="w-full py-2 rounded-xl morph-btn-glass text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Play size={13} />
                        {item.kind === 'station' ? 'Sintonizar Estación' : 'Conectar al Canal'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EMITIR / CREAR */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Kind Switch: Station vs Channel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setKind('station')}
                  className={`p-3.5 rounded-2xl border text-left space-y-1 cursor-pointer ${
                    kind === 'station'
                      ? 'bg-cyan-500/20 border-cyan-400 text-white'
                      : 'bg-black/40 border-white/10 text-slate-300 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Radio size={16} className="text-cyan-300" />
                    Estación En Directo
                  </div>
                  <p className="text-[11px] opacity-80">
                    Transmisión unidireccional de cualquier formato compatible con StarSeed OS. Los oyentes reciben audio/configuración en tiempo real sin acceso a controlar.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setKind('channel')}
                  className={`p-3.5 rounded-2xl border text-left space-y-1 cursor-pointer ${
                    kind === 'channel'
                      ? 'bg-purple-500/20 border-purple-400 text-white'
                      : 'bg-black/40 border-white/10 text-slate-300 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Cpu size={16} className="text-purple-300" />
                    Canal Interactivo (Servidor Mesh P2P)
                  </div>
                  <p className="text-[11px] opacity-80">
                    Servidor interactivo personalizable como sala de videojuego: elige neuronas host/suplentes, permisos de modificación, audio colaborativo, chat, voz, video y VR/AR.
                  </p>
                </button>
              </div>

              {/* Title & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Nombre de la Transmisión</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Visibilidad y Acceso</label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as TransmissionVisibility)}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="public">Pública (Directorio StarSeed OS)</option>
                    <option value="private">Privada (Enlace cifrado AES-GCM)</option>
                    <option value="entity">Entidad (Página, Grupo o Comunidad)</option>
                    <option value="mesh_links">Solo Vínculos Mesh (Local / P2P / Offline)</option>
                  </select>
                </div>
              </div>

              {visibility === 'entity' && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Entidad StarSeed (Página / Grupo / Comunidad)
                  </label>
                  {live.userEntities.length > 0 ? (
                    <select
                      value={entitySlug}
                      onChange={(e) => setEntitySlug(e.target.value)}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      {live.userEntities.map((ent) => (
                        <option key={ent.slug} value={ent.slug}>
                          {ent.kind.toUpperCase()} · {ent.name} ({ent.role})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={entitySlug}
                      onChange={(e) => setEntitySlug(e.target.value)}
                      placeholder="Slug del grupo o página (ej. comunidad-starseed)"
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  )}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Descripción (Opcional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe la intención sonora, visual o reglas de la sala..."
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Format */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">
                  Formato de Transmisión Visual y Espacial
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {[
                    {
                      id: 'presets_exact' as const,
                      label: 'Presets Exactos',
                      desc: 'Viajan las configuraciones completas sin video pesado.',
                    },
                    {
                      id: 'presets_relative' as const,
                      label: 'Resultados Relativos',
                      desc: 'Comparte el preset base y cada usuario ajusta su variación.',
                    },
                    {
                      id: 'screen_mirror' as const,
                      label: 'Pantalla Literal + Audio',
                      desc: 'Transmite tu lienzo/pantalla WebRTC literalmente en vivo.',
                    },
                    {
                      id: 'hybrid_room' as const,
                      label: 'Sala Total (Chat/Voz/VR)',
                      desc: 'Presets en vivo + llamadas + sala inmersiva VR/AR.',
                    },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFormat(f.id)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                        format === f.id
                          ? 'bg-emerald-500/20 border-emerald-400 text-white'
                          : 'bg-black/35 border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <div className="text-xs font-bold">{f.label}</div>
                      <div className="text-[10px] opacity-75 mt-0.5">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel Permissions Matrix */}
              {kind === 'channel' && (
                <div className="rounded-2xl border border-purple-400/30 bg-purple-950/15 p-3 space-y-2">
                  <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                    <Shield size={14} /> Permisos Configurables del Canal Interactivo
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                    {[
                      { k: 'canControlParams', label: 'Modificar parámetros y presets en vivo' },
                      { k: 'canQueueAudio', label: 'Agregar canciones / audios a la cola' },
                      { k: 'canSelectAudioSource', label: 'Controlar play / pausa / pista activa' },
                      { k: 'canShareNeuronAudio', label: 'Compartir audio de otra neurona' },
                      { k: 'canChat', label: 'Enviar mensajes en chat de sala' },
                      { k: 'canUseVoice', label: 'Voz P2P en tiempo real' },
                      { k: 'canUseVideo', label: 'Videollamada y cámara P2P' },
                      { k: 'canEnterXR', label: 'Entrar juntos en Sala VR / AR' },
                      { k: 'fixedPermissions', label: 'Mantener permisos al salir host' },
                    ].map((item) => (
                      <label
                        key={item.k}
                        className="flex items-center gap-2 p-2 rounded-lg bg-black/35 border border-white/10 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean((perms as any)[item.k])}
                          onChange={(e) => setPerms((p) => ({ ...p, [item.k]: e.target.checked }))}
                          className="accent-purple-500 w-3.5 h-3.5"
                        />
                        <span className="text-slate-200 text-[11px]">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Host Neurons & Backups */}
              <div className="rounded-2xl border border-white/15 bg-black/40 p-3 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-cyan-200 flex items-center gap-1.5">
                    <Cpu size={14} /> Neuronas Host y Nodos Suplentes
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {allNeuronOptions.length} neurona(s) detectadas
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Neurona Anfitriona Principal</label>
                    <select
                      value={primaryNeuronId}
                      onChange={(e) => setPrimaryNeuronId(e.target.value)}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      {allNeuronOptions.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name} · {n.isOnline ? 'En línea' : 'Offline'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Suplentes de Relevo Automático</label>
                    <div className="flex flex-wrap gap-1.5">
                      {allNeuronOptions
                        .filter((n) => n.id !== primaryNeuronId)
                        .slice(0, 6)
                        .map((n) => {
                          const selected = backupNeuronIds.includes(n.id);
                          return (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => toggleBackupNeuron(n.id)}
                              className={`px-2 py-1 rounded-lg text-[10px] border cursor-pointer ${
                                selected
                                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                                  : 'bg-white/5 border-white/10 text-slate-300'
                              }`}
                            >
                              {n.name.slice(0, 22)}
                            </button>
                          );
                        })}
                      {allNeuronOptions.length <= 1 && (
                        <span className="text-[11px] text-slate-500 italic">Conecta otro dispositivo para añadir suplentes.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Consciousness Layers & Neuron Capabilities */}
              <div className="rounded-2xl border border-white/15 bg-black/40 p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                    <Layers size={14} /> Capas de Conciencia & Capacidades StarSeed OS
                  </span>
                  <span className="text-[11px] font-mono text-slate-300">
                    Nivelador: {live.layerPrefs.nivelador}%
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {live.CAPAS.map((c) => {
                    const enabled = live.layerPrefs.capas[c];
                    const estado = live.capasSalud[c];
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() =>
                          live.updateLayerPrefs({
                            ...live.layerPrefs,
                            capas: { ...live.layerPrefs.capas, [c]: !enabled },
                          })
                        }
                        className={`p-2 rounded-xl border text-left cursor-pointer ${
                          enabled
                            ? 'bg-amber-500/15 border-amber-400/40 text-white'
                            : 'bg-black/40 border-white/10 text-slate-500'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center justify-between">
                          <span>{live.ETIQUETA_CAPA[c].nombre}</span>
                          <span className="text-[10px] font-mono">{enabled ? estado : 'OFF'}</span>
                        </div>
                        <div className="text-[10px] opacity-75 line-clamp-2 mt-0.5">
                          {live.ETIQUETA_CAPA[c].descripcion}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/10 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={live.capabilityOffer.enabled}
                      onChange={(e) =>
                        live.updateCapabilityOffer({ ...live.capabilityOffer, enabled: e.target.checked })
                      }
                      className="accent-cyan-400 w-3.5 h-3.5"
                    />
                    <span className="text-slate-200 font-semibold">
                      Prestar capacidades de esta neurona (apagado por defecto)
                    </span>
                  </label>
                  {live.capabilityOffer.enabled && (
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      {(['correr', 'llevar', 'guardar', 'soloWifi'] as const).map((k) => (
                        <label key={k} className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(live.capabilityOffer[k])}
                            onChange={(e) =>
                              live.updateCapabilityOffer({ ...live.capabilityOffer, [k]: e.target.checked })
                            }
                          />
                          <span>{k === 'soloWifi' ? 'Solo Wi-Fi' : k}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={offlineOnly}
                      onChange={(e) => setOfflineOnly(e.target.checked)}
                      className="accent-emerald-400"
                    />
                    Solo Mesh Local (100% sin internet)
                  </label>
                  {kind === 'channel' && visibility === 'public' && (
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={publishToCanalesDir}
                        onChange={(e) => setPublishToCanalesDir(e.target.checked)}
                        className="accent-purple-400"
                      />
                      Anunciar también en Canales StarSeed (`os_canales`)
                    </label>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 rounded-2xl morph-btn-primary text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Radio size={16} />
                {creating
                  ? 'Iniciando servidor y reloj común...'
                  : kind === 'station'
                  ? 'Iniciar Estación en Directo'
                  : 'Iniciar Canal Interactivo P2P'}
              </button>
            </form>
          )}

          {/* TAB 3: AUDIO & COLA */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              <LiveAudioVisualizer
                getSpectrumSnapshot={getSpectrumSnapshot}
                telemetry={live.telemetry}
                activeTrackTitle={live.activeTrack?.title}
                audioMode={live.transport.primaryAudioMode}
              />

              {/* Shared Playback Controls */}
              <div className="rounded-2xl border border-white/15 bg-black/45 p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!live.session || !canControlPlayback}
                      onClick={() =>
                        live.controlPlayback(live.transport.status === 'playing' ? 'pause' : 'play')
                      }
                      className="morph-btn-primary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                    >
                      {live.transport.status === 'playing' ? <Pause size={14} /> : <Play size={14} />}
                      {live.transport.status === 'playing' ? 'Pausar Todos' : 'Reproducir Todos'}
                    </button>
                    <button
                      type="button"
                      disabled={!live.session || !canControlPlayback || live.queue.length === 0}
                      onClick={() => live.controlPlayback('next')}
                      className="liquid-bubble p-2 text-slate-200 disabled:opacity-40 cursor-pointer"
                      title="Siguiente pista sincronizada"
                    >
                      <SkipForward size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={!live.session}
                      onClick={() => void live.shareNeuronSystemAudio()}
                      className={`liquid-bubble px-3 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                        live.sharingNeuronAudio ? 'text-emerald-300 border-emerald-400/50' : 'text-cyan-200'
                      }`}
                      title="Compartir el audio directo de esta neurona para toda la sesión"
                    >
                      <Disc size={14} />
                      <span>{live.sharingNeuronAudio ? 'Neurona Compartiendo Audio' : 'Compartir Audio Neurona'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <Volume2 size={14} className="text-slate-300" />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={live.transport.volume}
                      disabled={!live.session || !canControlPlayback}
                      onChange={(e) =>
                        live.controlPlayback('volume', { volume: parseFloat(e.target.value) })
                      }
                      className="w-24 accent-cyan-400"
                    />
                  </div>
                </div>

                {live.activeTrack?.spotifyEmbedUrl && (
                  <div className="rounded-xl overflow-hidden border border-emerald-400/30 bg-black">
                    <iframe
                      src={live.activeTrack.spotifyEmbedUrl}
                      width="100%"
                      height="152"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      title="Reproductor Spotify Sincronizado"
                    />
                  </div>
                )}

                {/* Queue */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase text-slate-400">
                    Cola Colaborativa Sincronizada ({live.queue.length})
                  </div>
                  {live.queue.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      Agrega una pista desde tu dispositivo, Bibliotecas StarSeed o Spotify.
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {live.queue.map((trk, i) => {
                        const isCur = trk.id === live.transport.activeTrackId;
                        return (
                          <button
                            key={trk.id}
                            type="button"
                            disabled={!canControlPlayback}
                            onClick={() => live.controlPlayback('select_track', { trackId: trk.id })}
                            className={`w-full text-left px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs cursor-pointer ${
                              isCur
                                ? 'bg-cyan-500/20 border-cyan-400 text-white'
                                : 'bg-black/35 border-white/10 text-slate-300 hover:border-white/25'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-bold truncate">
                                {i + 1}. {trk.title}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {trk.artist || trk.source} · Por {trk.addedByName}
                                {trk.isTemporary ? ' · Temporal (auto-descarte)' : ''}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 shrink-0">
                              {isCur ? (live.transport.status === 'playing' ? 'SONANDO' : 'ACTIVA') : trk.source.toUpperCase()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 4 Audio Source Pickers */}
              <div className="rounded-2xl border border-white/15 bg-black/45 p-3 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'upload' as const, label: 'Subir Archivo', icon: <Upload size={13} /> },
                    { id: 'private' as const, label: 'Mi Biblioteca Privada', icon: <Lock size={13} /> },
                    { id: 'public' as const, label: 'Bibliotecas Públicas StarSeed', icon: <FolderOpen size={13} /> },
                    { id: 'spotify' as const, label: 'Spotify (MCP / PKCE / URL)', icon: <Sparkles size={13} /> },
                  ].map((src) => (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => setAudioSourceTab(src.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                        audioSourceTab === src.id ? 'morph-tab-active text-white' : 'liquid-bubble text-slate-300'
                      }`}
                    >
                      {src.icon}
                      <span>{src.label}</span>
                    </button>
                  ))}
                </div>

                {!live.session && (
                  <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded-xl px-3 py-2">
                    Inicia o entra en una Estación o Canal para habilitar la cola sincronizada.
                  </p>
                )}

                {audioSourceTab === 'upload' && (
                  <div className="space-y-2.5 text-xs">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setUploadPersistence('temporary')}
                        className={`px-3 py-1.5 rounded-xl border cursor-pointer ${
                          uploadPersistence === 'temporary'
                            ? 'bg-cyan-500/20 border-cyan-400 text-white'
                            : 'bg-black/40 border-white/10 text-slate-300'
                        }`}
                      >
                        Transmisión Temporal (Descartar al cerrar)
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadPersistence('library')}
                        className={`px-3 py-1.5 rounded-xl border cursor-pointer ${
                          uploadPersistence === 'library'
                            ? 'bg-emerald-500/20 border-emerald-400 text-white'
                            : 'bg-black/40 border-white/10 text-slate-300'
                        }`}
                      >
                        Guardar en Mi Biblioteca StarSeed
                      </button>
                    </div>
                    <label className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-cyan-400/40 bg-black/30 hover:bg-black/45 cursor-pointer text-center gap-1">
                      <Upload size={20} className="text-cyan-300" />
                      <span className="font-bold text-white">
                        {uploadingAudio ? 'Subiendo y preparando audio...' : 'Seleccionar archivo de audio compatible (MP3, WAV, OGG, FLAC, M4A...)'}
                      </span>
                      <input
                        type="file"
                        accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac,.opus,.webm"
                        disabled={!live.session || !canQueue || uploadingAudio}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setUploadingAudio(true);
                          void live.enqueueUploadedFile(f, uploadPersistence, true).finally(() => {
                            setUploadingAudio(false);
                            e.target.value = '';
                          });
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {audioSourceTab === 'private' && (
                  <div className="space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-slate-300">Permiso al compartir archivo privado en esta transmisión:</span>
                      <select
                        value={privateShareMode}
                        onChange={(e) => setPrivateShareMode(e.target.value as any)}
                        className="bg-black/60 border border-white/15 rounded-lg px-2 py-1 text-white"
                      >
                        <option value="session_signed_url">Autorizar solo para esta sesión (URL temporal 2h)</option>
                        <option value="make_public">Hacer público en Biblioteca StarSeed</option>
                      </select>
                    </div>
                    {loadingLibs ? (
                      <p className="text-slate-400">Cargando archivos de audio de tu perfil...</p>
                    ) : privateEntries.length === 0 ? (
                      <p className="text-slate-500 italic">
                        {identity.isLoggedIn
                          ? 'No hay archivos de audio en tu biblioteca privada os-files todavía.'
                          : 'Inicia sesión en StarSeed OS para acceder a los archivos de tu perfil.'}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                        {privateEntries.map((ent) => (
                          <button
                            key={ent.id}
                            type="button"
                            disabled={!live.session || !canQueue}
                            onClick={() => void live.enqueueLibraryEntry(ent, privateShareMode, true)}
                            className="p-2.5 rounded-xl bg-black/40 border border-white/10 hover:border-cyan-400/50 text-left flex items-center justify-between gap-2 cursor-pointer disabled:opacity-40"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-white truncate">{ent.title}</div>
                              <div className="text-[10px] text-slate-400">
                                {ent.isPublic ? 'Público' : 'Privado (Pide permiso de sesión)'}
                              </div>
                            </div>
                            <Plus size={14} className="text-cyan-300 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {audioSourceTab === 'public' && (
                  <div className="space-y-2 text-xs">
                    {loadingLibs ? (
                      <p className="text-slate-400">Explorando bibliotecas públicas de Páginas, Grupos y Comunidades...</p>
                    ) : publicEntries.length === 0 ? (
                      <p className="text-slate-500 italic">
                        No se encontraron audios públicos en el catálogo en este momento.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {publicEntries.map((ent) => (
                          <button
                            key={ent.id}
                            type="button"
                            disabled={!live.session || !canQueue}
                            onClick={() => void live.enqueueLibraryEntry(ent, 'session_signed_url', true)}
                            className="p-2.5 rounded-xl bg-black/40 border border-white/10 hover:border-emerald-400/50 text-left flex items-center justify-between gap-2 cursor-pointer disabled:opacity-40"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-white truncate">{ent.title}</div>
                              <div className="text-[10px] text-emerald-300 truncate">{ent.entityName}</div>
                            </div>
                            <Plus size={14} className="text-emerald-300 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {audioSourceTab === 'spotify' && (
                  <div className="space-y-3 text-xs">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={spotifyInput}
                        onChange={(e) => setSpotifyInput(e.target.value)}
                        placeholder="Pega enlace o URI de Spotify (https://open.spotify.com/track/... o spotify:track:...)"
                        className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white"
                      />
                      <button
                        type="button"
                        disabled={!live.session || !canQueue || !spotifyInput.trim()}
                        onClick={() => {
                          void live.enqueueSpotifyItem(spotifyInput, true).then((r) => {
                            if (r.ok) {
                              setSpotifyInput('');
                              setSpotifyStatusMsg('Pista de Spotify agregada y sincronizada en la cola.');
                            } else {
                              setSpotifyStatusMsg(r.error || 'Enlace inválido.');
                            }
                          });
                        }}
                        className="morph-btn-primary px-4 py-2 rounded-xl font-bold cursor-pointer disabled:opacity-40"
                      >
                        Agregar a la Cola
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={spotifySearchQuery}
                        onChange={(e) => setSpotifySearchQuery(e.target.value)}
                        placeholder="Buscar canción en Spotify (requiere MCP o PKCE conectado)"
                        className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          void searchSpotifyTracks(spotifySearchQuery).then((r) => {
                            if (r.ok) {
                              setSpotifyResults(r.tracks);
                              setSpotifyStatusMsg(`${r.tracks.length} resultado(s) encontrados.`);
                            } else {
                              setSpotifyStatusMsg(r.error || null);
                            }
                          });
                        }}
                        className="liquid-bubble px-3.5 py-2 font-semibold text-white flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Search size={13} /> Buscar
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSpotifySetup((v) => !v)}
                        className="liquid-bubble px-3 py-2 text-emerald-300 font-semibold cursor-pointer"
                      >
                        Configurar MCP / PKCE
                      </button>
                    </div>

                    {spotifyStatusMsg && <p className="text-cyan-200">{spotifyStatusMsg}</p>}

                    {spotifyResults.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                        {spotifyResults.map((t) => (
                          <button
                            key={t.uri}
                            type="button"
                            disabled={!live.session || !canQueue}
                            onClick={() => void live.enqueueSpotifyItem(t, true)}
                            className="p-2 rounded-xl bg-black/45 border border-white/10 hover:border-emerald-400/50 text-left flex items-center gap-2 cursor-pointer"
                          >
                            {t.coverUrl && <img src={t.coverUrl} alt="" className="w-9 h-9 rounded object-cover" />}
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-white truncate">{t.title}</div>
                              <div className="text-[10px] text-slate-400 truncate">{t.artist}</div>
                            </div>
                            <Plus size={14} className="text-emerald-300 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}

                    {showSpotifySetup && (
                      <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/15 space-y-2.5">
                        <div className="font-bold text-emerald-200">Conexión Real a Spotify MCP Server & OAuth PKCE</div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="url"
                            value={mcpUrlInput}
                            onChange={(e) => {
                              setMcpUrlInput(e.target.value);
                              setStoredSpotifyMcpUrl(e.target.value);
                            }}
                            placeholder="Endpoint HTTP MCP de Spotify (ej. http://localhost:3100/mcp)"
                            className="flex-1 bg-black/60 border border-white/15 rounded-lg px-2.5 py-1.5 text-white"
                          />
                          <button
                            type="button"
                            onClick={() => void testSpotifyMcpConnection(mcpUrlInput).then(setMcpStatus)}
                            className="liquid-bubble px-3 py-1.5 font-semibold text-cyan-200 cursor-pointer"
                          >
                            Probar MCP
                          </button>
                        </div>
                        {mcpStatus && (
                          <p className={mcpStatus.connected ? 'text-emerald-300' : 'text-red-300'}>
                            {mcpStatus.connected
                              ? `MCP Conectado (${mcpStatus.rttMs} ms) · ${mcpStatus.tools.length} herramientas: ${mcpStatus.tools.slice(0, 4).join(', ')}`
                              : `Error MCP: ${mcpStatus.error}`}
                          </p>
                        )}
                        <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-white/10">
                          <input
                            type="text"
                            value={clientIdInput}
                            onChange={(e) => {
                              setClientIdInput(e.target.value);
                              setStoredSpotifyClientId(e.target.value);
                            }}
                            placeholder="Spotify Developer App Client ID (OAuth 2.0 PKCE)"
                            className="flex-1 bg-black/60 border border-white/15 rounded-lg px-2.5 py-1.5 text-white"
                          />
                          {spotifySession ? (
                            <button
                              type="button"
                              onClick={() => {
                                disconnectSpotify();
                                setSpotifySession(null);
                              }}
                              className="liquid-bubble px-3 py-1.5 text-red-300 font-semibold cursor-pointer"
                            >
                              Desconectar ({spotifySession.displayName || 'Spotify'})
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                void startSpotifyPkceAuth(clientIdInput).then((r) => {
                                  if (!r.ok && r.error) setSpotifyStatusMsg(r.error);
                                });
                              }}
                              className="morph-btn-primary px-3 py-1.5 rounded-lg font-bold cursor-pointer"
                            >
                              Conectar Spotify PKCE
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SALA & XR */}
          {activeTab === 'room' && (
            <div className="space-y-4">
              {!live.session ? (
                <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-center space-y-3">
                  <Users size={28} className="mx-auto text-purple-300" />
                  <p className="text-sm font-bold text-white">No estás conectado a ninguna transmisión activa</p>
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('discover')}
                      className="liquid-bubble px-4 py-2 text-xs font-bold text-white cursor-pointer"
                    >
                      Explorar Estaciones y Canales
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('create')}
                      className="morph-btn-primary px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Emitir Nueva Transmisión
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Session Control Header Card */}
                  <div className="rounded-2xl border border-cyan-400/30 bg-black/50 p-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-cyan-200 font-mono">
                        {live.session.kind === 'station' ? 'ESTACIÓN SOLO RECEPCIÓN' : 'CANAL INTERACTIVO MESH P2P'} · {live.session.format}
                      </div>
                      <h3 className="text-base font-extrabold text-white">{live.session.title}</h3>
                      <div className="text-[11px] text-slate-300">
                        {live.participants.length} participante(s) · Reloj {live.telemetry.clockMode}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void live.toggleVoiceOrVideo('voice')}
                        className={`liquid-bubble px-3 py-1.5 text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                          live.voiceEnabled ? 'text-emerald-300 border-emerald-400/50' : 'text-slate-200'
                        }`}
                      >
                        {live.voiceEnabled ? <Mic size={14} /> : <MicOff size={14} />} Voz
                      </button>
                      <button
                        type="button"
                        onClick={() => void live.toggleVoiceOrVideo('video')}
                        className={`liquid-bubble px-3 py-1.5 text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                          live.videoEnabled ? 'text-cyan-300 border-cyan-400/50' : 'text-slate-200'
                        }`}
                      >
                        {live.videoEnabled ? <Video size={14} /> : <VideoOff size={14} />} Cámara
                      </button>
                      <button
                        type="button"
                        onClick={() => void live.toggleScreenShare('canvas')}
                        className={`liquid-bubble px-3 py-1.5 text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                          live.screenShareEnabled ? 'text-amber-300 border-amber-400/50' : 'text-slate-200'
                        }`}
                      >
                        <Monitor size={14} /> {live.screenShareEnabled ? 'Detener Pantalla' : 'Pantalla Literal'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setParams((p) => ({ ...p, vrMode: !p.vrMode }));
                          onClose();
                        }}
                        className="liquid-bubble px-3 py-1.5 text-xs font-semibold text-purple-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Glasses size={14} /> {params.vrMode ? 'Salir VR' : 'Sala VR'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void live.leaveSession(live.session?.isHost)}
                        className="px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-400/40 text-red-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <LogOut size={13} /> {live.session.isHost ? 'Terminar' : 'Salir'}
                      </button>
                    </div>
                  </div>

                  {/* Relative mode viewer calibration */}
                  {live.session.format === 'presets_relative' && !live.session.isHost && (
                    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-950/15 p-3 space-y-2 text-xs">
                      <span className="font-bold text-emerald-200 flex items-center gap-1.5">
                        <Sliders size={14} /> Calibración Relativa Personal (tu dispositivo)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className="space-y-1">
                          <span className="text-slate-300">Desfase Tonal ({live.relativeOffsets.hueDelta}°)</span>
                          <input
                            type="range"
                            min={-180}
                            max={180}
                            value={live.relativeOffsets.hueDelta}
                            onChange={(e) =>
                              live.setRelativeOffsets((o) => ({ ...o, hueDelta: Number(e.target.value) }))
                            }
                            className="w-full accent-emerald-400"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-slate-300">Escala ×{live.relativeOffsets.scaleMult.toFixed(2)}</span>
                          <input
                            type="range"
                            min={0.5}
                            max={2}
                            step={0.05}
                            value={live.relativeOffsets.scaleMult}
                            onChange={(e) =>
                              live.setRelativeOffsets((o) => ({ ...o, scaleMult: Number(e.target.value) }))
                            }
                            className="w-full accent-emerald-400"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-slate-300">Sensibilidad ×{live.relativeOffsets.reactivityMult.toFixed(2)}</span>
                          <input
                            type="range"
                            min={0.5}
                            max={2}
                            step={0.05}
                            value={live.relativeOffsets.reactivityMult}
                            onChange={(e) =>
                              live.setRelativeOffsets((o) => ({ ...o, reactivityMult: Number(e.target.value) }))
                            }
                            className="w-full accent-emerald-400"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Video / Screen Streams Grid */}
                  {(live.localCameraStream || live.remoteMedia.some((m) => m.hasVideo)) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {live.localCameraStream && live.videoEnabled && (
                        <VideoTile stream={live.localCameraStream} label="Tú (Local)" muted />
                      )}
                      {live.remoteMedia
                        .filter((m) => m.hasVideo)
                        .map((m) => (
                          <VideoTile key={m.peerId} stream={m.stream} label={m.displayName} />
                        ))}
                    </div>
                  )}

                  {/* Host live permission toggles */}
                  {live.session.isHost && live.session.kind === 'channel' && (
                    <div className="rounded-2xl border border-white/15 bg-black/40 p-3 flex flex-wrap gap-2 text-xs">
                      <span className="w-full font-bold text-purple-200 flex items-center gap-1.5">
                        <Shield size={13} /> Permisos en vivo del Canal
                      </span>
                      {[
                        { k: 'canControlParams', label: 'Controlar Presets' },
                        { k: 'canQueueAudio', label: 'Agregar Audios' },
                        { k: 'canSelectAudioSource', label: 'Controlar Audio' },
                        { k: 'canChat', label: 'Chat' },
                        { k: 'canUseVoice', label: 'Voz' },
                        { k: 'canUseVideo', label: 'Video' },
                      ].map((p) => (
                        <label key={p.k} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean((live.session?.permissions as any)?.[p.k])}
                            onChange={(e) => live.updateChannelPermissions({ [p.k]: e.target.checked })}
                            className="accent-purple-400"
                          />
                          <span>{p.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Live Chat + Participants */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-white/15 bg-black/40 p-3 space-y-2">
                      <div className="text-xs font-bold text-slate-200">
                        Neuronas Activas ({Math.max(1, live.participants.length)})
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
                        {live.participants.map((p) => (
                          <div
                            key={p.neuronId}
                            className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-white truncate">{p.displayName}</div>
                              <div className="text-[10px] text-slate-400 truncate">{p.neuronName}</div>
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 shrink-0">
                              {p.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="md:col-span-2 rounded-2xl border border-white/15 bg-black/40 p-3 flex flex-col gap-2">
                      <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <MessageSquare size={13} className="text-cyan-300" /> Chat En Tiempo Real
                      </div>
                      <div className="flex-1 min-h-[130px] max-h-48 overflow-y-auto space-y-1.5 text-xs">
                        {live.chatMessages.map((m) => (
                          <div
                            key={m.id}
                            className={`px-2.5 py-1.5 rounded-xl ${
                              m.isSystem
                                ? 'bg-cyan-500/10 text-cyan-200 text-[11px]'
                                : 'bg-white/5 text-slate-100'
                            }`}
                          >
                            {!m.isSystem && (
                              <span className="font-bold text-purple-300 mr-1.5">{m.senderName}:</span>
                            )}
                            <span>{m.text}</span>
                          </div>
                        ))}
                      </div>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          live.sendChat(chatText);
                          setChatText('');
                        }}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          value={chatText}
                          onChange={(e) => setChatText(e.target.value)}
                          placeholder="Escribe a la sala..."
                          className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white"
                        />
                        <button type="submit" className="morph-btn-primary px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer">
                          <Send size={13} /> Enviar
                        </button>
                      </form>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 5: RED MESH & LATENCIA */}
          {activeTab === 'mesh' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl border border-white/10 bg-black/45 p-3">
                  <div className="text-[10px] text-slate-400 uppercase">Reloj Común</div>
                  <div className="text-sm font-bold text-cyan-200 mt-0.5">{live.telemetry.clockMode}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/45 p-3">
                  <div className="text-[10px] text-slate-400 uppercase">Precisión / Cota</div>
                  <div className="text-sm font-bold text-emerald-200 mt-0.5">
                    {live.telemetry.clockPrecisionMs !== null ? `±${live.telemetry.clockPrecisionMs} ms` : 'Sin medir'}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/45 p-3">
                  <div className="text-[10px] text-slate-400 uppercase">Nodos Mesh</div>
                  <div className="text-sm font-bold text-purple-200 mt-0.5">{live.meshPeers.length} activo(s)</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/45 p-3">
                  <div className="text-[10px] text-slate-400 uppercase">Vínculos Cuenta</div>
                  <div className="text-sm font-bold text-amber-200 mt-0.5">{live.meshLinks.length} enlace(s)</div>
                </div>
              </div>

              {/* Offline SSL1 P2P Pairing + Hardware LoRa */}
              <div className="rounded-2xl border border-white/15 bg-black/45 p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Zap size={14} className="text-emerald-300" />
                    Emparejamiento P2P Sin Internet (`SSL1` StarSeed Link) & Antena LoRa
                  </span>
                  <button
                    type="button"
                    onClick={() => void live.connectLoRa()}
                    className="liquid-bubble px-3 py-1 text-emerald-300 font-semibold cursor-pointer"
                  >
                    Conectar Antena Serial / LoRa
                  </button>
                </div>

                {live.ssl1StatusMsg && <p className="text-cyan-200 font-mono">{live.ssl1StatusMsg}</p>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2 p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <div className="font-bold text-cyan-200">1. Iniciar Enlace (Este aparato genera código)</div>
                    <button
                      type="button"
                      onClick={() => {
                        void live.createSsl1Offer().then((r) => {
                          if (r.ok && r.code) setSsl1OfferCode(r.code);
                        });
                      }}
                      className="morph-btn-glass px-3 py-1.5 rounded-lg font-bold text-white cursor-pointer"
                    >
                      Generar Código SSL1
                    </button>
                    {ssl1OfferCode && (
                      <textarea
                        readOnly
                        value={ssl1OfferCode}
                        rows={2}
                        className="w-full bg-black/70 border border-cyan-400/30 rounded-lg p-2 text-[10px] font-mono text-cyan-200"
                      />
                    )}
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={ssl1AnswerInput}
                        onChange={(e) => setSsl1AnswerInput(e.target.value)}
                        placeholder="Pega el código de RESPUESTA SSL1 aquí"
                        className="flex-1 bg-black/60 border border-white/15 rounded-lg px-2 py-1 text-white text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => void live.completeSsl1Offer(ssl1AnswerInput)}
                        className="liquid-bubble px-2.5 py-1 text-emerald-300 font-bold cursor-pointer"
                      >
                        Conectar
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <div className="font-bold text-purple-200">2. Responder a Otro Aparato / StarSeed OS</div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={ssl1IncomingOffer}
                        onChange={(e) => setSsl1IncomingOffer(e.target.value)}
                        placeholder="Pega el código SSL1 recibido"
                        className="flex-1 bg-black/60 border border-white/15 rounded-lg px-2 py-1 text-white text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          void live.answerSsl1Offer(ssl1IncomingOffer).then((r) => {
                            if (r.ok && r.answerCode) setSsl1GeneratedAnswer(r.answerCode);
                          });
                        }}
                        className="liquid-bubble px-2.5 py-1 text-purple-200 font-bold cursor-pointer"
                      >
                        Responder
                      </button>
                    </div>
                    {ssl1GeneratedAnswer && (
                      <textarea
                        readOnly
                        value={ssl1GeneratedAnswer}
                        rows={2}
                        className="w-full bg-black/70 border border-purple-400/30 rounded-lg p-2 text-[10px] font-mono text-purple-200"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Discovered Mesh Nodes & Cloud Links */}
              <div className="rounded-2xl border border-white/15 bg-black/45 p-3.5 space-y-2">
                <div className="font-bold text-white">Nodos Mesh Detectados ({live.meshPeers.length})</div>
                {live.meshPeers.length === 0 ? (
                  <p className="text-slate-500 italic">
                    Abre otra pestaña de Audiomorphic u Omnifrecuencias, o vincula un dispositivo SSL1/LoRa para ver nodos en directo.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {live.meshPeers.map((n) => (
                      <div key={n.id} className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate">{n.longName}</div>
                          <div className="text-[10px] text-slate-400">
                            {n.app} · medio: {n.medium} {n.rttMs != null ? `· ${n.rttMs}ms` : ''}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-300">ACTIVO</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveTransmissionHub;
