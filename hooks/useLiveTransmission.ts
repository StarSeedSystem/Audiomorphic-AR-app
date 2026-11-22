import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { VisualizerParams } from '../types';
import { sanitizeVisualizerParams } from '../utils/sanitizeParams';
import { supabase } from '../lib/supabaseClient';
import { UseStarSeedSyncResult } from './useStarSeedSync';
import { StarSeedIdentity } from './useStarSeedIdentity';
import {
  estacion,
  temaPrivado,
  visualDesdeParametros,
  parametrosDesdeVisual,
  crearToken,
  RelojComun,
  iniciarEmparejamiento,
  responderEmparejamiento,
  type EstacionViva,
  type FotoEstacion,
  type FilaDirectorio,
  type Emparejamiento,
} from '../lib/starseedLink';
import {
  CAPAS,
  ETIQUETA_CAPA,
  leerPreferenciaCapas,
  guardarPreferenciaCapas,
  estadoCapas,
  loadNeuronCapabilityOffer,
  saveNeuronCapabilityOffer,
  fetchAccountMeshLinks,
  fetchUserEntities,
  type CapaConciencia,
  type PreferenciaCapas,
  type NeuronCapabilityOffer,
  type AccountMeshLink,
  type UserEntitySummary,
} from '../lib/starseedConsciousness';
import {
  starseedMeshNetwork,
  type MeshPeerNode,
  type LiveMeshSessionAd,
} from '../lib/starseedMeshNetwork';
import {
  applyClockSyncedAudioElement,
  computeExpectedPositionMs,
  INITIAL_AUDIO_TRANSPORT,
  OmnifrecuenciasSynthEngine,
  type LiveAudioTransport,
  type LiveTrackItem,
} from '../lib/liveAudioSync';
import {
  cleanupTemporaryAudio,
  uploadSessionAudio,
  authorizePrivateFileForSession,
  type AudioLibraryEntry,
} from '../lib/starseedAudioLibraries';
import {
  syncSpotifyPlayback,
  buildSpotifyEmbedUrl,
  fetchSpotifyOEmbed,
  parseSpotifyInput,
  type SpotifyTrackSummary,
} from '../lib/spotifyBridge';

export type TransmissionKind = 'station' | 'channel';
export type TransmissionFormat = 'presets_exact' | 'presets_relative' | 'screen_mirror' | 'hybrid_room';
export type TransmissionVisibility = 'public' | 'private' | 'entity' | 'mesh_links';

export interface ChannelPermissions {
  canControlParams: boolean;
  canQueueAudio: boolean;
  canSelectAudioSource: boolean;
  canShareNeuronAudio: boolean;
  canChat: boolean;
  canUseVoice: boolean;
  canUseVideo: boolean;
  canEnterXR: boolean;
  fixedPermissions: boolean;
}

export const DEFAULT_CHANNEL_PERMISSIONS: ChannelPermissions = {
  canControlParams: false,
  canQueueAudio: true,
  canSelectAudioSource: false,
  canShareNeuronAudio: false,
  canChat: true,
  canUseVoice: true,
  canUseVideo: true,
  canEnterXR: true,
  fixedPermissions: false,
};

export const STATION_LOCKED_PERMISSIONS: ChannelPermissions = {
  canControlParams: false,
  canQueueAudio: false,
  canSelectAudioSource: false,
  canShareNeuronAudio: false,
  canChat: false,
  canUseVoice: false,
  canUseVideo: false,
  canEnterXR: true,
  fixedPermissions: true,
};

export interface RelativePersonalOffsets {
  hueDelta: number;
  scaleMult: number;
  reactivityMult: number;
}

export interface LiveParticipant {
  userId: string;
  displayName: string;
  neuronId: string;
  neuronName: string;
  role: 'host' | 'backup_host' | 'editor' | 'viewer';
  inVR?: boolean;
  inAR?: boolean;
  sharingAudio?: boolean;
  sharingVideo?: boolean;
  sharingScreen?: boolean;
  joinedAt: number;
}

export interface LiveChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  neuronName?: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface RemotePeerMedia {
  peerId: string;
  displayName: string;
  stream: MediaStream;
  hasVideo: boolean;
  hasAudio: boolean;
  isScreenShare?: boolean;
}

export interface DiscoveredTransmission {
  id: string;
  title: string;
  description?: string;
  kind: TransmissionKind;
  format: TransmissionFormat;
  sourceApp: 'audiomorphic' | 'omnifrecuencias' | 'starseed';
  visibility: TransmissionVisibility;
  hostName: string;
  listeners: number;
  isPaused?: boolean;
  isLiveNow?: boolean;
  url: string;
  token?: string;
  rawPayload?: any;
}

export interface ActiveTransmissionSession {
  id: string;
  kind: TransmissionKind;
  format: TransmissionFormat;
  visibility: TransmissionVisibility;
  title: string;
  description: string;
  sourceApp: 'audiomorphic' | 'omnifrecuencias';
  isHost: boolean;
  hostUserId: string;
  hostName: string;
  primaryNeuronId: string;
  backupNeuronIds: string[];
  entitySlug?: string | null;
  token?: string | null;
  shareUrl: string;
  starseedOsUrl?: string | null;
  permissions: ChannelPermissions;
  osEstacionRowId?: string | null;
  offlineOnly: boolean;
  createdAt: number;
}

export interface StartTransmissionConfig {
  kind: TransmissionKind;
  format: TransmissionFormat;
  visibility: TransmissionVisibility;
  title: string;
  description?: string;
  entitySlug?: string | null;
  primaryNeuronId?: string;
  backupNeuronIds?: string[];
  permissions?: Partial<ChannelPermissions>;
  publishToCanalesDir?: boolean;
  offlineOnly?: boolean;
}

export interface LiveTelemetry {
  rttMs: number | null;
  clockPrecisionMs: number | null;
  clockCotaMs: number | null;
  clockMode: 'referencia' | 'sincronizado' | 'sin-referencia';
  driftPpm: number;
  audioDriftMs: number | null;
  samples: number;
  activeMedia: string[];
  meshNodesCount: number;
}

interface UseLiveTransmissionProps {
  params: VisualizerParams;
  setParams: React.Dispatch<React.SetStateAction<VisualizerParams>>;
  paramsRef: React.MutableRefObject<VisualizerParams>;
  identity: StarSeedIdentity;
  sync: UseStarSeedSyncResult;
  audioAnalyzer: any;
}

const RTC_ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

function sanitizeParamsForNetwork(p: VisualizerParams): Record<string, any> {
  return visualDesdeParametros(p as unknown as Record<string, unknown>);
}

export function useLiveTransmission({
  params,
  setParams,
  paramsRef,
  identity,
  sync,
  audioAnalyzer,
}: UseLiveTransmissionProps) {
  const userId = identity.user?.id || `anon_${starseedMeshNetwork.localNeuron.id}`;
  const displayName = identity.displayName || starseedMeshNetwork.localNeuron.name || 'Explorador StarSeed';
  const localNeuron = starseedMeshNetwork.localNeuron;

  const [session, setSession] = useState<ActiveTransmissionSession | null>(null);
  const [stationFoto, setStationFoto] = useState<FotoEstacion | null>(null);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [queue, setQueue] = useState<LiveTrackItem[]>([]);
  const [transport, setTransport] = useState<LiveAudioTransport>(INITIAL_AUDIO_TRANSPORT);
  const [relativeOffsets, setRelativeOffsets] = useState<RelativePersonalOffsets>({
    hueDelta: 0,
    scaleMult: 1,
    reactivityMult: 1,
  });
  const [preferRemoteScreen, setPreferRemoteScreen] = useState(true);

  // Local media share states
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [sharingNeuronAudio, setSharingNeuronAudio] = useState(false);
  const [localCameraStream, setLocalCameraStream] = useState<MediaStream | null>(null);
  const [remoteMedia, setRemoteMedia] = useState<RemotePeerMedia[]>([]);

  // Discovery, layers & mesh state
  const [discovered, setDiscovered] = useState<DiscoveredTransmission[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [meshPeers, setMeshPeers] = useState<MeshPeerNode[]>(() => starseedMeshNetwork.getNodes());
  const [meshAds, setMeshAds] = useState<LiveMeshSessionAd[]>(() => starseedMeshNetwork.getSessionAds());
  const [layerPrefs, setLayerPrefs] = useState<PreferenciaCapas>(() => leerPreferenciaCapas());
  const [capabilityOffer, setCapabilityOffer] = useState<NeuronCapabilityOffer>(() =>
    loadNeuronCapabilityOffer()
  );
  const [meshLinks, setMeshLinks] = useState<AccountMeshLink[]>([]);
  const [userEntities, setUserEntities] = useState<UserEntitySummary[]>([]);
  const [ssl1Pairing, setSsl1Pairing] = useState<Emparejamiento | null>(null);
  const [ssl1StatusMsg, setSsl1StatusMsg] = useState<string | null>(null);

  const [telemetry, setTelemetry] = useState<LiveTelemetry>({
    rttMs: null,
    clockPrecisionMs: null,
    clockCotaMs: null,
    clockMode: 'sin-referencia',
    driftPpm: 0,
    audioDriftMs: null,
    samples: 0,
    activeMedia: [],
    meshNodesCount: 0,
  });

  const [liveError, setLiveError] = useState<string | null>(null);

  // Refs for stable callbacks & teardown
  const audioAnalyzerRef = useRef(audioAnalyzer);
  audioAnalyzerRef.current = audioAnalyzer;
  const sessionRef = useRef<ActiveTransmissionSession | null>(null);
  const estacionVivaRef = useRef<EstacionViva | null>(null);
  const channelRef = useRef<any>(null);
  const relojRef = useRef<RelojComun>(new RelojComun({ esReferencia: true }));
  const peerConnsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localMediaStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const omniSynthRef = useRef<OmnifrecuenciasSynthEngine | null>(null);
  const suppressingParamBroadcastRef = useRef(false);
  const lastBroadcastedVisualRef = useRef<string>('');
  const tempUploadsRef = useRef<Array<{ osFileId?: string; storagePath?: string; objectUrl?: string }>>([]);
  const queueRef = useRef<LiveTrackItem[]>(queue);
  const transportRef = useRef<LiveAudioTransport>(transport);
  const offsetsRef = useRef<RelativePersonalOffsets>(relativeOffsets);
  const participantsCountRef = useRef<number>(1);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    participantsCountRef.current = Math.max(1, participants.length);
  }, [participants.length]);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    transportRef.current = transport;
  }, [transport]);
  useEffect(() => {
    offsetsRef.current = relativeOffsets;
  }, [relativeOffsets]);

  // Ensure hidden synced <audio> element exists & connects cleanly to WebAudio Analyser
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('am-live-sync-audio') as HTMLAudioElement | null;
    if (!el) {
      el = document.createElement('audio');
      el.id = 'am-live-sync-audio';
      el.crossOrigin = 'anonymous';
      el.preload = 'auto';
      el.style.display = 'none';
      document.body.appendChild(el);
    }
    audioElRef.current = el;
    return () => {
      el?.pause();
    };
  }, []);

  // Keep Consciousness Layers & Neuron Capabilities persisted
  const updateLayerPrefs = useCallback((next: PreferenciaCapas) => {
    setLayerPrefs(next);
    guardarPreferenciaCapas(next);
  }, []);

  const updateCapabilityOffer = useCallback((next: NeuronCapabilityOffer) => {
    setCapabilityOffer(next);
    saveNeuronCapabilityOffer(next);
  }, []);

  // Listen to mesh nodes & session ads
  useEffect(() => {
    const u1 = starseedMeshNetwork.onNodesUpdate((nodes) => {
      setMeshPeers(nodes);
      setTelemetry((t) => ({ ...t, meshNodesCount: nodes.length }));
    });
    const u2 = starseedMeshNetwork.onAdsUpdate((ads) => setMeshAds(ads));
    void starseedMeshNetwork.autoConnectSerial();
    return () => {
      u1();
      u2();
    };
  }, []);

  // Load account links & user entities when signed in
  useEffect(() => {
    if (!identity.user?.id) {
      setMeshLinks([]);
      setUserEntities([]);
      return;
    }
    void fetchAccountMeshLinks(identity.user.id).then(setMeshLinks);
    void fetchUserEntities(identity.user.id).then(setUserEntities);
  }, [identity.user?.id]);

  // Helper: get current common clock timestamp (ms)
  const getCommonNowMs = useCallback((): number => {
    if (estacionVivaRef.current) return estacionVivaRef.current.ahoraComun();
    return relojRef.current.ahora();
  }, []);

  const appendSystemChat = useCallback((text: string) => {
    setChatMessages((prev) => [
      ...prev.slice(-120),
      {
        id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        senderId: 'system',
        senderName: 'StarSeed Mesh',
        text,
        timestamp: Date.now(),
        isSystem: true,
      },
    ]);
  }, []);

  /* ─────────────── Discovery across OS + Omnifrecuencias + Mesh ─────────────── */

  const refreshDirectory = useCallback(async () => {
    setLoadingDirectory(true);
    const results: DiscoveredTransmission[] = [];
    const seen = new Set<string>();

    // 1. Offline/local Mesh session ads first (always zero latency)
    for (const ad of starseedMeshNetwork.getSessionAds()) {
      seen.add(ad.sessionId);
      results.push({
        id: ad.sessionId,
        title: ad.title,
        kind: ad.kind,
        format: (ad.format as TransmissionFormat) || 'presets_exact',
        sourceApp: ad.app === 'omnifrecuencias' ? 'omnifrecuencias' : 'audiomorphic',
        visibility: (ad.visibility as TransmissionVisibility) || 'mesh_links',
        hostName: ad.hostName,
        listeners: ad.participantsCount || 1,
        isLiveNow: true,
        url: `${window.location.origin}/?live=${encodeURIComponent(ad.sessionId)}`,
        rawPayload: ad,
      });
    }

    // 2. Cloud discovery if online
    if (typeof navigator === 'undefined' || navigator.onLine) {
      try {
        const [stations, omniRes] = await Promise.all([
          estacion.directorioApps(supabase as any, {
            apps: ['audiomorphic', 'omnifrecuencias', 'canal-vivo'],
            limite: 40,
            soloEnDirecto: false,
          }),
          supabase
            .from('omni_sessions')
            .select('id, host_id, host_name, preset_name, preset_content, is_public, allow_open_modifications, created_at')
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .limit(20),
        ]);

        for (const st of stations) {
          const idMatch = st.enlace.match(/\/estaciones\/vivo\/([A-Za-z0-9_-]+)/);
          const sid = idMatch ? idMatch[1] : st.id;
          if (seen.has(sid)) continue;
          seen.add(sid);
          const isOmni = st.categorias.includes('omnifrecuencias');
          const isChannel = st.categorias.includes('canal-vivo') || st.categorias.includes('interactivo');
          results.push({
            id: sid,
            title: st.titulo,
            description: st.descripcion,
            kind: isChannel ? 'channel' : 'station',
            format: isChannel ? 'hybrid_room' : 'presets_exact',
            sourceApp: isOmni ? 'omnifrecuencias' : 'audiomorphic',
            visibility: 'public',
            hostName: isOmni ? 'Omnifrecuencias · StarSeed' : 'Audiomorphic · StarSeed',
            listeners: st.espectadores || 0,
            isPaused: st.pausada,
            isLiveNow: st.ultimoLatido ? Date.now() - Date.parse(st.ultimoLatido) < 180_000 : false,
            url: st.enlace,
            rawPayload: st,
          });
        }

        if (Array.isArray(omniRes?.data)) {
          for (const row of omniRes.data) {
            if (seen.has(row.id)) continue;
            seen.add(row.id);
            results.push({
              id: row.id,
              title: row.preset_name || 'Sesión Omnifrecuencias',
              description: row.preset_content?.description || '',
              kind: row.allow_open_modifications ? 'channel' : 'station',
              format: 'presets_exact',
              sourceApp: 'omnifrecuencias',
              visibility: 'public',
              hostName: row.host_name || 'Anfitrión Omnifrecuencias',
              listeners: 1,
              isLiveNow: true,
              url: `${window.location.origin}/?live=${encodeURIComponent(row.id)}&src=omni`,
              rawPayload: row,
            });
          }
        }
      } catch {
        /* ignore offline/RLS */
      }
    }

    setDiscovered(results);
    setLoadingDirectory(false);
  }, []);

  /* ─────────────── Apply incoming visual params (Exact vs Relative) ─────────────── */

  const applyRemoteParams = useCallback(
    (incomingVisual: Record<string, any>) => {
      if (!incomingVisual || typeof incomingVisual !== 'object') return;
      suppressingParamBroadcastRef.current = true;
      setParams((prev) => {
        const next = sanitizeVisualizerParams(
          parametrosDesdeVisual(incomingVisual, prev as unknown as Record<string, any>),
          prev
        );
        const curSession = sessionRef.current;
        if (curSession?.format === 'presets_relative' && !curSession.isHost) {
          const off = offsetsRef.current;
          next.baseHue = (((Number(next.baseHue) || 0) + (Number(off.hueDelta) || 0)) % 360 + 360) % 360;
          next.zoom = Math.max(0.0005, (Number(next.zoom) || 0.001) * (Number(off.scaleMult) || 1));
          next.sensitivity = Math.max(0.2, Math.min(20, (Number(next.sensitivity) || 5) * (Number(off.reactivityMult) || 1)));
        }
        return sanitizeVisualizerParams(next, prev);
      });
      setTimeout(() => {
        suppressingParamBroadcastRef.current = false;
      }, 60);
    },
    [setParams]
  );

  /* ─────────────── Send Message over Active Layer(s) ─────────────── */

  const emitRoomEvent = useCallback(
    (event: string, payload: Record<string, any>) => {
      const s = sessionRef.current;
      if (!s) return;
      const body = { ...payload, senderId: userId, neuronId: localNeuron.id, sessionId: s.id };

      if (layerPrefs.activo && layerPrefs.capas.nube && channelRef.current) {
        try {
          void channelRef.current.send({ type: 'broadcast', event, payload: body }).catch(() => undefined);
        } catch {
          /* ignore */
        }
      }
      if (layerPrefs.activo && layerPrefs.capas.mesh) {
        void starseedMeshNetwork.broadcastData({ type: `am_room_${event}`, ...body });
      }
    },
    [userId, localNeuron.id, layerPrefs]
  );

  /* ─────────────── WebRTC Peer Mesh (Voice, Video, Screen Mirror, Neuron Audio) ─────────────── */

  const sendWebRtcSignal = useCallback(
    (targetPeerId: string, signal: any) => {
      emitRoomEvent('webrtc_signal', {
        targetPeerId,
        senderPeerId: localNeuron.id,
        senderName: displayName,
        signal,
        isScreenShare: screenShareEnabled,
      });
    },
    [emitRoomEvent, localNeuron.id, displayName, screenShareEnabled]
  );

  const createPeerConnection = useCallback(
    (peerId: string, peerDisplayName: string): RTCPeerConnection => {
      const existing = peerConnsRef.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection(RTC_ICE_CONFIG);
      peerConnsRef.current.set(peerId, pc);

      if (localMediaStreamRef.current) {
        localMediaStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localMediaStreamRef.current!);
        });
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, screenStreamRef.current!);
        });
      }

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          sendWebRtcSignal(peerId, { candidate: ev.candidate });
        }
      };

      pc.ontrack = (ev) => {
        const stream = ev.streams?.[0] || new MediaStream([ev.track]);
        const hasVideo = stream.getVideoTracks().length > 0;
        const hasAudio = stream.getAudioTracks().length > 0;
        const isScreen = Boolean((ev.track.label || '').match(/canvas|screen|window|display|monitor/i)) || hasVideo;

        setRemoteMedia((prev) => {
          const rest = prev.filter((p) => p.peerId !== peerId);
          return [
            ...rest,
            {
              peerId,
              displayName: peerDisplayName,
              stream,
              hasVideo,
              hasAudio,
              isScreenShare: isScreen,
            },
          ];
        });

        if (hasAudio) {
          audioAnalyzerRef.current?.connectExternalMediaStream?.(stream, true);
        }
      };

      return pc;
    },
    [sendWebRtcSignal]
  );

  const initiatePeerOffer = useCallback(
    async (peerId: string, peerDisplayName: string) => {
      if (peerConnsRef.current.has(peerId)) return;
      try {
        const pc = createPeerConnection(peerId, peerDisplayName);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendWebRtcSignal(peerId, offer);
      } catch {
        /* ignore signaling race */
      }
    },
    [createPeerConnection, sendWebRtcSignal]
  );

  const handleIncomingSignal = useCallback(
    async (payload: any) => {
      if (!payload || payload.targetPeerId !== localNeuron.id) return;
      const fromId = String(payload.senderPeerId || '');
      const fromName = String(payload.senderName || 'Neurona');
      const sig = payload.signal;
      if (!fromId || !sig) return;

      try {
        const pc = createPeerConnection(fromId, fromName);
        if (sig.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(sig));
          const ans = await pc.createAnswer();
          await pc.setLocalDescription(ans);
          sendWebRtcSignal(fromId, pc.localDescription);
        } else if (sig.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(sig));
        } else if (sig.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(sig.candidate));
        }
      } catch {
        /* ignore WebRTC handshake glitch */
      }
    },
    [localNeuron.id, createPeerConnection, sendWebRtcSignal]
  );

  /* ─────────────── Audio Queue & Synchronized Transport Controls ─────────────── */

  const syncTransportAndQueue = useCallback(
    (nextQueue: LiveTrackItem[], nextTransport: LiveAudioTransport) => {
      setQueue(nextQueue);
      setTransport(nextTransport);
      emitRoomEvent('audio_sync', { queue: nextQueue, transport: nextTransport });
    },
    [emitRoomEvent]
  );

  const addTrackToQueue = useCallback(
    (track: Omit<LiveTrackItem, 'id' | 'addedById' | 'addedByName' | 'addedAt'>, playImmediately = false) => {
      const s = sessionRef.current;
      if (!s) return { ok: false, error: 'Inicia o únete a una transmisión primero.' };
      if (!s.isHost && (s.kind === 'station' || !s.permissions.canQueueAudio)) {
        return { ok: false, error: 'Solo el anfitrión tiene permiso para agregar pistas en esta transmisión.' };
      }
      const fullTrack: LiveTrackItem = {
        ...track,
        id: `trk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        addedById: userId,
        addedByName: displayName,
        addedAt: Date.now(),
      };
      if (fullTrack.isTemporary) {
        tempUploadsRef.current.push({
          osFileId: fullTrack.osFileId,
          storagePath: fullTrack.storagePath,
          objectUrl: fullTrack.url?.startsWith('blob:') ? fullTrack.url : undefined,
        });
      }

      const nextQueue = [...queueRef.current, fullTrack];
      let nextTransport = transportRef.current;
      if (playImmediately || !nextTransport.activeTrackId) {
        const now = getCommonNowMs();
        nextTransport = {
          ...nextTransport,
          activeTrackId: fullTrack.id,
          status: 'playing',
          anchorCommonMs: now + 350,
          positionMs: 0,
          primaryAudioMode: 'queue',
          revision: nextTransport.revision + 1,
        };
      }
      syncTransportAndQueue(nextQueue, nextTransport);
      return { ok: true, track: fullTrack };
    },
    [userId, displayName, getCommonNowMs, syncTransportAndQueue]
  );

  const controlPlayback = useCallback(
    (
      action: 'play' | 'pause' | 'next' | 'seek' | 'volume' | 'select_track' | 'primary_source',
      extra?: {
        trackId?: string;
        positionMs?: number;
        volume?: number;
        primaryAudioMode?: LiveAudioTransport['primaryAudioMode'];
        primaryNeuronId?: string | null;
      }
    ) => {
      const s = sessionRef.current;
      if (!s) return;
      const canSelect = s.isHost || (s.kind === 'channel' && s.permissions.canSelectAudioSource);
      if (!canSelect) {
        setLiveError('Sin permiso para controlar el reproductor compartido.');
        setTimeout(() => setLiveError(null), 4000);
        return;
      }

      const cur = transportRef.current;
      const q = queueRef.current;
      const now = getCommonNowMs();
      let next: LiveAudioTransport = { ...cur, revision: cur.revision + 1 };

      if (action === 'select_track' && extra?.trackId) {
        next.activeTrackId = extra.trackId;
        next.status = 'playing';
        next.anchorCommonMs = now + 250;
        next.positionMs = 0;
        next.primaryAudioMode = 'queue';
      } else if (action === 'play') {
        const targetId = extra?.trackId || cur.activeTrackId || q[0]?.id || null;
        const pos = extra?.positionMs ?? cur.positionMs ?? 0;
        next.activeTrackId = targetId;
        next.status = targetId ? 'playing' : 'stopped';
        next.anchorCommonMs = targetId ? now - pos : null;
        next.positionMs = pos;
      } else if (action === 'pause') {
        const pos = computeExpectedPositionMs(cur, now);
        next.status = 'paused';
        next.anchorCommonMs = null;
        next.positionMs = pos;
      } else if (action === 'seek') {
        const pos = Math.max(0, extra?.positionMs ?? 0);
        next.positionMs = pos;
        next.anchorCommonMs = cur.status === 'playing' ? now - pos : null;
      } else if (action === 'next' && q.length > 0) {
        const idx = q.findIndex((t) => t.id === cur.activeTrackId);
        const nxt = q[(idx + 1) % q.length];
        next.activeTrackId = nxt.id;
        next.status = 'playing';
        next.anchorCommonMs = now + 250;
        next.positionMs = 0;
      } else if (action === 'volume' && typeof extra?.volume === 'number') {
        next.volume = Math.max(0, Math.min(1, extra.volume));
      } else if (action === 'primary_source' && extra?.primaryAudioMode) {
        next.primaryAudioMode = extra.primaryAudioMode;
        if (extra.primaryNeuronId !== undefined) next.primaryNeuronId = extra.primaryNeuronId;
      }

      syncTransportAndQueue(q, next);
    },
    [getCommonNowMs, syncTransportAndQueue]
  );

  // Active Track resolution + Clock-locked <audio> + Omnifrecuencias Synth + Spotify sync
  const activeTrack = useMemo(
    () => queue.find((t) => t.id === transport.activeTrackId) || null,
    [queue, transport.activeTrackId]
  );

  useEffect(() => {
    const el = audioElRef.current;
    if (!el) return;

    if (!session || !activeTrack || transport.primaryAudioMode !== 'queue') {
      el.pause();
      audioAnalyzerRef.current?.setExternalAudioActive?.(false);
      return;
    }

    if (activeTrack.source === 'spotify') {
      el.pause();
      if (activeTrack.spotifyUri) {
        const expMs = computeExpectedPositionMs(transport, getCommonNowMs());
        void syncSpotifyPlayback(activeTrack.spotifyUri, expMs, transport.status === 'playing');
      }
      return;
    }

    if (activeTrack.url) {
      if (el.src !== activeTrack.url) {
        el.src = activeTrack.url;
        el.load();
      }
      audioAnalyzerRef.current?.connectExternalMediaElement?.(el);
    }
  }, [session, activeTrack, transport.primaryAudioMode, transport.revision, transport.status, getCommonNowMs]);

  useEffect(() => {
    if (!session || !activeTrack || activeTrack.source === 'spotify' || transport.primaryAudioMode !== 'queue') {
      return;
    }
    const iv = setInterval(() => {
      const el = audioElRef.current;
      if (!el) return;
      const drift = applyClockSyncedAudioElement(el, transportRef.current, getCommonNowMs());
      if (drift !== null) {
        setTelemetry((t) => ({ ...t, audioDriftMs: drift }));
      }
    }, 250);
    return () => clearInterval(iv);
  }, [session, activeTrack, transport.primaryAudioMode, getCommonNowMs]);

  // Auto-advance track when ended (host only)
  useEffect(() => {
    const el = audioElRef.current;
    if (!el) return;
    const onEnded = () => {
      const s = sessionRef.current;
      if (s?.isHost && queueRef.current.length > 1) {
        controlPlayback('next');
      } else if (s?.isHost) {
        controlPlayback('pause', { positionMs: 0 });
      }
    };
    el.addEventListener('ended', onEnded);
    return () => el.removeEventListener('ended', onEnded);
  }, [controlPlayback]);

  // Omnifrecuencias Synth playback when receiving an Omnifrecuencias station
  useEffect(() => {
    const synth = omniSynthRef.current || new OmnifrecuenciasSynthEngine();
    omniSynthRef.current = synth;

    if (
      session &&
      stationFoto?.fuente === 'omnifrecuencias' &&
      stationFoto.fase === 'sonando' &&
      stationFoto.params?.tipo === 'omnifrecuencias'
    ) {
      const ctx = audioAnalyzerRef.current?.getAudioContext?.();
      const dest = audioAnalyzerRef.current?.getMasterInputNode?.();
      if (ctx && dest) {
        synth.start(
          ctx,
          dest,
          stationFoto.params.entonacion,
          stationFoto.ancla,
          getCommonNowMs(),
          transport.volume,
          (t) => estacionVivaRef.current?.aLocal(t) ?? t,
          getCommonNowMs
        );
        audioAnalyzerRef.current?.setExternalAudioActive?.(true);
      }
    } else {
      synth.stop();
    }
    return () => synth.stop();
  }, [session, stationFoto, transport.volume, getCommonNowMs]);

  /* ─────────────── Local Media Toggles (Voice, Video, Screen Mirror, Neuron Audio) ─────────────── */

  const attachTracksToAllPeers = useCallback((stream: MediaStream) => {
    peerConnsRef.current.forEach((pc, peerId) => {
      stream.getTracks().forEach((tr) => {
        const senders = pc.getSenders();
        if (!senders.some((s) => s.track === tr)) {
          pc.addTrack(tr, stream);
        }
      });
      void pc
        .createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => sendWebRtcSignal(peerId, pc.localDescription))
        .catch(() => undefined);
    });
  }, [sendWebRtcSignal]);

  const toggleVoiceOrVideo = useCallback(
    async (kind: 'voice' | 'video') => {
      const s = sessionRef.current;
      if (!s) return;
      if (!s.isHost && (s.kind === 'station' || (kind === 'voice' ? !s.permissions.canUseVoice : !s.permissions.canUseVideo))) {
        setLiveError(`El anfitrión desactivó ${kind === 'voice' ? 'voz' : 'video'} en esta transmisión.`);
        setTimeout(() => setLiveError(null), 4000);
        return;
      }

      const wantAudio = kind === 'voice' ? !voiceEnabled : voiceEnabled;
      const wantVideo = kind === 'video' ? !videoEnabled : videoEnabled;

      if (!wantAudio && !wantVideo) {
        localMediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        localMediaStreamRef.current = null;
        setLocalCameraStream(null);
        setVoiceEnabled(false);
        setVideoEnabled(false);
        setSharingNeuronAudio(false);
        return;
      }

      try {
        localMediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: wantAudio ? { echoCancellation: true, noiseSuppression: true } : false,
          video: wantVideo ? { width: { ideal: 640 }, height: { ideal: 360 } } : false,
        });
        localMediaStreamRef.current = stream;
        setLocalCameraStream(stream);
        setVoiceEnabled(wantAudio);
        setVideoEnabled(wantVideo);
        attachTracksToAllPeers(stream);
      } catch (err: any) {
        setLiveError(err?.message || 'No se pudo acceder a micrófono o cámara.');
        setTimeout(() => setLiveError(null), 4500);
      }
    },
    [voiceEnabled, videoEnabled, attachTracksToAllPeers]
  );

  const toggleScreenShare = useCallback(
    async (mode: 'canvas' | 'display' = 'canvas') => {
      const s = sessionRef.current;
      if (!s) return;
      if (!s.isHost && !s.permissions.canUseVideo) {
        setLiveError('Sin permiso para transmitir pantalla en este canal.');
        setTimeout(() => setLiveError(null), 4000);
        return;
      }
      if (screenShareEnabled) {
        screenStreamRef.current?.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
        setScreenShareEnabled(false);
        return;
      }

      try {
        let stream: MediaStream;
        if (mode === 'canvas') {
          const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
          if (!canvas || typeof (canvas as any).captureStream !== 'function') {
            throw new Error('Captura de canvas no disponible; prueba "Pantalla del Sistema".');
          }
          stream = (canvas as any).captureStream(30);
        } else {
          stream = await (navigator.mediaDevices as any).getDisplayMedia({
            video: { frameRate: 30 },
            audio: { echoCancellation: false },
          });
        }
        screenStreamRef.current = stream;
        setScreenShareEnabled(true);
        attachTracksToAllPeers(stream);
        if (stream.getAudioTracks().length > 0) {
          setSharingNeuronAudio(true);
        }
        stream.getVideoTracks().forEach((t) => {
          t.onended = () => {
            screenStreamRef.current = null;
            setScreenShareEnabled(false);
          };
        });
      } catch (err: any) {
        setLiveError(err?.message || 'No se pudo iniciar transmisión de pantalla.');
        setTimeout(() => setLiveError(null), 4500);
      }
    },
    [screenShareEnabled, attachTracksToAllPeers]
  );

  const shareNeuronSystemAudio = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    if (!s.isHost && !s.permissions.canShareNeuronAudio) {
      setLiveError('El anfitrión no habilitó compartir audio directo de neuronas.');
      setTimeout(() => setLiveError(null), 4000);
      return;
    }
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: true,
        audio: { echoCancellation: false, noiseSuppression: false },
      });
      stream.getVideoTracks().forEach((t: MediaStreamTrack) => t.stop());
      if (stream.getAudioTracks().length === 0) {
        throw new Error('Activa la casilla "Compartir audio" al elegir pestaña o sistema.');
      }
      localMediaStreamRef.current = stream;
      setSharingNeuronAudio(true);
      attachTracksToAllPeers(stream);
      controlPlayback('primary_source', {
        primaryAudioMode: 'neuron_stream',
        primaryNeuronId: localNeuron.id,
      });
      appendSystemChat(`${localNeuron.name} ahora comparte su flujo de audio en tiempo real.`);
    } catch (err: any) {
      setLiveError(err?.message || 'Cancelado compartir audio de la neurona.');
      setTimeout(() => setLiveError(null), 4000);
    }
  }, [localNeuron.id, localNeuron.name, attachTracksToAllPeers, controlPlayback, appendSystemChat]);

  /* ─────────────── Room Connection (Realtime + Mesh + NTP Clock + Permissions) ─────────────── */

  const teardownActiveRoom = useCallback(
    async (endForAll = false) => {
      const cur = sessionRef.current;

      if (
        !cur &&
        !estacionVivaRef.current &&
        !channelRef.current &&
        peerConnsRef.current.size === 0 &&
        !localMediaStreamRef.current &&
        !screenStreamRef.current &&
        tempUploadsRef.current.length === 0
      ) {
        return;
      }

      if (cur?.isHost) {
        void starseedMeshNetwork.broadcastData({ type: 'session_closed', sessionId: cur.id });
      }

      if (endForAll && cur?.isHost) {
        if (estacionVivaRef.current?.foto()?.control) {
          await estacionVivaRef.current.accion('terminar').catch(() => undefined);
        }
        if (cur.osEstacionRowId && typeof navigator !== 'undefined' && navigator.onLine) {
          try {
            await supabase
              .from('os_estaciones')
              .update({ termina_en: new Date().toISOString(), pausada: true })
              .eq('id', cur.osEstacionRowId);
          } catch {
            /* ignore */
          }
        }
        if (cur.id) {
          try {
            await supabase.from('omni_sessions').delete().eq('id', cur.id).eq('host_id', userId);
          } catch {
            /* ignore */
          }
        }
      }

      try {
        estacionVivaRef.current?.cerrar();
      } catch {
        /* ignore */
      }
      estacionVivaRef.current = null;
      setStationFoto(null);

      try {
        await channelRef.current?.unsubscribe?.();
      } catch {
        /* ignore */
      }
      channelRef.current = null;

      peerConnsRef.current.forEach((pc) => {
        try {
          pc.close();
        } catch {
          /* ignore */
        }
      });
      peerConnsRef.current.clear();

      localMediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      localMediaStreamRef.current = null;
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setLocalCameraStream(null);
      setRemoteMedia([]);
      setVoiceEnabled(false);
      setVideoEnabled(false);
      setScreenShareEnabled(false);
      setSharingNeuronAudio(false);

      audioElRef.current?.pause();
      omniSynthRef.current?.stop();
      audioAnalyzerRef.current?.setExternalAudioActive?.(false);

      // Cleanup temporary session uploaded audio files
      const temps = tempUploadsRef.current.splice(0);
      temps.forEach((t) => {
        if (t.objectUrl) {
          try {
            URL.revokeObjectURL(t.objectUrl);
          } catch {
            /* ignore */
          }
        }
      });
      await cleanupTemporaryAudio(temps).catch(() => undefined);

      setSession(null);
      setParticipants([]);
      setQueue([]);
      setTransport(INITIAL_AUDIO_TRANSPORT);
      setChatMessages([]);
    },
    [userId]
  );

  const attachRoomChannelAndMesh = useCallback(
    async (sess: ActiveTransmissionSession) => {
      const reloj = new RelojComun({ esReferencia: sess.isHost, id: localNeuron.id });
      relojRef.current = reloj;

      const updateTelemetryFromReloj = () => {
        const st = reloj.estado();
        setTelemetry((prev) => ({
          ...prev,
          clockMode: st.modo,
          clockPrecisionMs: st.precisionMs,
          clockCotaMs: st.cotaMs,
          rttMs: st.retardoMinMs,
          driftPpm: Math.round(st.derivaPpm * 10) / 10,
          samples: st.muestras,
          activeMedia: [
            ...(layerPrefs.capas.mesh ? ['Mesh Local/SSL1'] : []),
            ...(layerPrefs.capas.nube && !sess.offlineOnly ? ['StarSeed Realtime'] : []),
          ],
        }));
      };
      reloj.suscribir(updateTelemetryFromReloj);
      updateTelemetryFromReloj();

      const handleRoomEvent = (eventName: string, payload: any) => {
        if (!payload || payload.sessionId !== sess.id) return;
        const fromOther = payload.neuronId !== localNeuron.id;

        if (eventName === 'clock_ping' && sess.isHost && fromOther) {
          const pong = reloj.atenderPing(payload.ping, reloj.horaLocal());
          if (pong) emitRoomEvent('clock_pong', { pong });
        } else if (eventName === 'clock_pong' && !sess.isHost && payload.pong) {
          reloj.recibirPong(payload.pong, reloj.horaLocal());
        } else if (eventName === 'params_sync' && fromOther && payload.visual) {
          if (sess.kind === 'station' && payload.senderId !== sess.hostUserId) return;
          applyRemoteParams(payload.visual);
        } else if (eventName === 'audio_sync' && fromOther) {
          if (Array.isArray(payload.queue)) setQueue(payload.queue);
          if (payload.transport) setTransport(payload.transport);
        } else if (eventName === 'permissions_sync' && fromOther && payload.permissions) {
          setSession((prev) =>
            prev
              ? {
                  ...prev,
                  permissions: prev.kind === 'station' ? STATION_LOCKED_PERMISSIONS : payload.permissions,
                }
              : null
          );
        } else if (eventName === 'chat_message' && payload.msg) {
          setChatMessages((prev) =>
            prev.some((m) => m.id === payload.msg.id) ? prev : [...prev.slice(-120), payload.msg]
          );
        } else if (eventName === 'webrtc_signal') {
          void handleIncomingSignal(payload);
        } else if (eventName === 'state_request' && sess.isHost && fromOther) {
          emitRoomEvent('params_sync', { visual: sanitizeParamsForNetwork(paramsRef.current) });
          emitRoomEvent('audio_sync', { queue: queueRef.current, transport: transportRef.current });
          emitRoomEvent('permissions_sync', { permissions: sess.permissions });
        }
      };

      // Subscribe local Mesh listener (offline / multi-tab / SSL1 / LoRa)
      const unsubMesh = starseedMeshNetwork.onDataReceive((pkt) => {
        if (typeof pkt?.type === 'string' && pkt.type.startsWith('am_room_')) {
          const ev = pkt.type.replace('am_room_', '');
          handleRoomEvent(ev, pkt);
        }
      });

      // Host advertises session every 8s on local Mesh
      let adInterval: ReturnType<typeof setInterval> | null = null;
      if (sess.isHost) {
        const pushAd = () => {
          void starseedMeshNetwork.broadcastData({
            type: 'session_ad',
            ad: {
              sessionId: sess.id,
              kind: sess.kind,
              format: sess.format,
              title: sess.title,
              hostName: sess.hostName,
              hostNeuronId: localNeuron.id,
              visibility: sess.visibility,
              participantsCount: participantsCountRef.current,
              app: 'audiomorphic',
              updatedAt: Date.now(),
            } satisfies LiveMeshSessionAd,
          });
        };
        pushAd();
        adInterval = setInterval(pushAd, 8000);
      }

      // Subscribe Supabase Realtime channel when cloud layer enabled & online
      if (!sess.offlineOnly && layerPrefs.activo && layerPrefs.capas.nube && navigator.onLine) {
        const topic =
          sess.visibility === 'private' && sess.token
            ? await temaPrivado(sess.id, sess.token)
            : `audiomorphic_channel:${sess.id}`;

        const ch = supabase.channel(topic, {
          config: { broadcast: { self: false }, presence: { key: localNeuron.id } },
        });
        channelRef.current = ch;

        ch.on('presence', { event: 'sync' }, () => {
          const state = ch.presenceState();
          const list: LiveParticipant[] = [];
          for (const key of Object.keys(state)) {
            const p = state[key]?.[0] as any;
            if (p) {
              list.push({
                userId: p.userId || key,
                displayName: p.displayName || 'Participante',
                neuronId: key,
                neuronName: p.neuronName || 'Neurona',
                role: p.role || 'viewer',
                inVR: p.inVR,
                inAR: p.inAR,
                joinedAt: p.joinedAt || Date.now(),
              });
            }
          }
          setParticipants(list);
        })
          .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
            if (key !== localNeuron.id && (sess.isHost || sess.kind === 'channel')) {
              const pName = newPresences?.[0]?.displayName || 'Neurona';
              void initiatePeerOffer(key, pName);
            }
          })
          .on('presence', { event: 'leave' }, ({ key }: any) => {
            const pc = peerConnsRef.current.get(key);
            if (pc) {
              pc.close();
              peerConnsRef.current.delete(key);
            }
            setRemoteMedia((prev) => prev.filter((r) => r.peerId !== key));
          })
          .on('broadcast', { event: 'params_sync' }, ({ payload }: any) => handleRoomEvent('params_sync', payload))
          .on('broadcast', { event: 'audio_sync' }, ({ payload }: any) => handleRoomEvent('audio_sync', payload))
          .on('broadcast', { event: 'permissions_sync' }, ({ payload }: any) => handleRoomEvent('permissions_sync', payload))
          .on('broadcast', { event: 'chat_message' }, ({ payload }: any) => handleRoomEvent('chat_message', payload))
          .on('broadcast', { event: 'webrtc_signal' }, ({ payload }: any) => handleRoomEvent('webrtc_signal', payload))
          .on('broadcast', { event: 'clock_ping' }, ({ payload }: any) => handleRoomEvent('clock_ping', payload))
          .on('broadcast', { event: 'clock_pong' }, ({ payload }: any) => handleRoomEvent('clock_pong', payload))
          .on('broadcast', { event: 'state_request' }, ({ payload }: any) => handleRoomEvent('state_request', payload))
          .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
              await ch.track({
                userId,
                displayName,
                neuronName: localNeuron.name,
                role: sess.isHost ? 'host' : sess.permissions.canControlParams ? 'editor' : 'viewer',
                inVR: paramsRef.current.vrMode,
                inAR: paramsRef.current.arMode || paramsRef.current.arPortalMode,
                joinedAt: Date.now(),
              });
              if (!sess.isHost) {
                emitRoomEvent('state_request', {});
                for (let i = 0; i < 4; i++) {
                  setTimeout(() => emitRoomEvent('clock_ping', { ping: reloj.nuevoPing() }), i * 160);
                }
              }
            }
          });
      } else {
        setParticipants([
          {
            userId,
            displayName,
            neuronId: localNeuron.id,
            neuronName: localNeuron.name,
            role: sess.isHost ? 'host' : 'viewer',
            joinedAt: Date.now(),
          },
        ]);
        if (!sess.isHost) {
          emitRoomEvent('state_request', {});
          emitRoomEvent('clock_ping', { ping: reloj.nuevoPing() });
        }
      }

      // Attach teardown cleanup on window close / room change via returned handle
      return () => {
        unsubMesh();
        if (adInterval) clearInterval(adInterval);
      };
    },
    [
      localNeuron.id,
      localNeuron.name,
      layerPrefs,
      userId,
      displayName,
      paramsRef,
      emitRoomEvent,
      applyRemoteParams,
      handleIncomingSignal,
      initiatePeerOffer,
    ]
  );

  const roomCleanupRef = useRef<(() => void) | null>(null);

  /* ─────────────── Start New Station or Interactive Channel ─────────────── */

  const startTransmission = useCallback(
    async (cfg: StartTransmissionConfig): Promise<{ ok: boolean; error?: string }> => {
      setLiveError(null);
      await teardownActiveRoom(false);
      roomCleanupRef.current?.();

      const cleanTitle = cfg.title.trim() || (cfg.kind === 'station' ? 'Estación Audiomorphic' : 'Canal StarSeed Live');
      const token = cfg.visibility === 'private' ? crearToken() : null;
      const offline = Boolean(cfg.offlineOnly) || cfg.visibility === 'mesh_links' || (typeof navigator !== 'undefined' && !navigator.onLine);
      const perms: ChannelPermissions =
        cfg.kind === 'station'
          ? STATION_LOCKED_PERMISSIONS
          : { ...DEFAULT_CHANNEL_PERMISSIONS, ...(cfg.permissions || {}) };

      const visual = sanitizeParamsForNetwork(paramsRef.current);

      let sessionId = `ch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      let osUrl: string | null = null;
      let osEstacionRowId: string | null = null;

      // 1. If publishing via StarSeed Link station (especially Stations or public/entity Channels)
      if (!offline && (cfg.kind === 'station' || cfg.visibility === 'public' || cfg.visibility === 'entity')) {
        const res = await estacion.publicar(
          {
            fuente: 'audiomorphic',
            titulo: cleanTitle,
            enlace: `${window.location.origin}/?live=${sessionId}`,
            params: { tipo: 'audiomorphic', visual },
            privada: cfg.visibility === 'private',
            descripcion: cfg.description?.trim() || `${cfg.kind === 'station' ? 'Estación' : 'Canal Interactivo'} · ${cfg.format}`,
            categorias: [
              'audiomorphic',
              cfg.kind === 'channel' ? 'canal-vivo' : 'estacion-viva',
              cfg.format,
            ],
            tipo: cfg.format === 'hybrid_room' ? 'xr' : 'mixto',
            ambitoTipo: cfg.visibility === 'entity' && cfg.entitySlug ? 'entidad' : 'persona',
            entidadRef: cfg.visibility === 'entity' ? cfg.entitySlug || null : null,
            visibilidad: cfg.visibility === 'entity' ? 'grupo' : 'publica',
            enMalla: layerPrefs.capas.mesh,
          },
          {
            app: 'audiomorphic',
            cliente: supabase as any,
            sinDirectorio: cfg.visibility === 'private',
          }
        );

        if ('estacion' in res) {
          estacionVivaRef.current = res.estacion;
          sessionId = res.estacion.id;
          osUrl = res.estacion.enlace;
          res.estacion.suscribir((f) => setStationFoto(f));
        }

        // Optional: also mirror into `os_canales` directory for discoverable interactive channels
        if (cfg.kind === 'channel' && cfg.visibility === 'public' && cfg.publishToCanalesDir && identity.user?.id) {
          try {
            await supabase.from('os_canales').insert({
              owner_id: identity.user.id,
              nombre: cleanTitle.slice(0, 80),
              plataforma: 'web',
              enlace: `${window.location.origin}/?live=${encodeURIComponent(sessionId)}`,
              tipo: 'canal',
              descripcion: (cfg.description || '').slice(0, 400),
              categorias: ['audiomorphic', 'interactivo', cfg.format],
            });
          } catch {
            /* optional directory listing */
          }
        }
      }

      const shareBase = `${window.location.origin}/?live=${encodeURIComponent(sessionId)}&kind=${cfg.kind}&fmt=${cfg.format}`;
      const shareUrl = token ? `${shareBase}#k=${token}` : shareBase;

      const newSession: ActiveTransmissionSession = {
        id: sessionId,
        kind: cfg.kind,
        format: cfg.format,
        visibility: cfg.visibility,
        title: cleanTitle,
        description: cfg.description?.trim() || '',
        sourceApp: 'audiomorphic',
        isHost: true,
        hostUserId: userId,
        hostName: displayName,
        primaryNeuronId: cfg.primaryNeuronId || localNeuron.id,
        backupNeuronIds: cfg.backupNeuronIds || [],
        entitySlug: cfg.entitySlug || null,
        token,
        shareUrl,
        starseedOsUrl: osUrl,
        permissions: perms,
        osEstacionRowId,
        offlineOnly: offline,
        createdAt: Date.now(),
      };

      setSession(newSession);
      const cleanup = await attachRoomChannelAndMesh(newSession);
      roomCleanupRef.current = cleanup;
      appendSystemChat(
        `${cfg.kind === 'station' ? 'Estación' : 'Canal Interactivo'} "${cleanTitle}" iniciado (${offline ? 'Mesh Local P2P' : 'Híbrido Cloud + Mesh'}).`
      );

      // Activate screen capture automatically if user started literally mirrored screen mode
      if (cfg.format === 'screen_mirror') {
        setTimeout(() => void toggleScreenShare('canvas'), 350);
      }

      return { ok: true };
    },
    [
      teardownActiveRoom,
      paramsRef,
      layerPrefs.capas.mesh,
      identity.user?.id,
      userId,
      displayName,
      localNeuron.id,
      attachRoomChannelAndMesh,
      appendSystemChat,
      toggleScreenShare,
    ]
  );

  /* ─────────────── Join Any Discovered Transmission / Link / Station ─────────────── */

  const joinTransmission = useCallback(
    async (target: {
      id?: string;
      url?: string;
      discovered?: DiscoveredTransmission;
    }): Promise<{ ok: boolean; error?: string }> => {
      setLiveError(null);
      await teardownActiveRoom(false);
      roomCleanupRef.current?.();

      const rawUrl = target.url || target.discovered?.url || '';
      const rawId = target.id || target.discovered?.id || '';

      // 1. Is it a signed StarSeed Link station (/estaciones/vivo/...)?
      if (rawUrl.includes('/estaciones/vivo/')) {
        const res = await estacion.seguir(rawUrl, { app: 'audiomorphic', cliente: supabase as any });
        if ('estacion' in res) {
          estacionVivaRef.current = res.estacion;
          res.estacion.suscribir((f) => {
            setStationFoto(f);
            if (f?.params?.tipo === 'audiomorphic') {
              applyRemoteParams(f.params.visual);
            }
          });
          const f0 = res.estacion.foto();
          const joined: ActiveTransmissionSession = {
            id: res.estacion.id,
            kind: target.discovered?.kind || 'station',
            format: target.discovered?.format || 'presets_exact',
            visibility: f0?.privada ? 'private' : 'public',
            title: f0?.titulo || target.discovered?.title || 'Estación StarSeed',
            description: target.discovered?.description || '',
            sourceApp: f0?.fuente === 'omnifrecuencias' ? 'omnifrecuencias' : 'audiomorphic',
            isHost: Boolean(f0?.control),
            hostUserId: 'station-host',
            hostName: target.discovered?.hostName || 'Anfitrión StarSeed',
            primaryNeuronId: 'remote',
            backupNeuronIds: [],
            shareUrl: rawUrl,
            starseedOsUrl: rawUrl,
            permissions: target.discovered?.kind === 'channel' ? DEFAULT_CHANNEL_PERMISSIONS : STATION_LOCKED_PERMISSIONS,
            offlineOnly: typeof navigator !== 'undefined' ? !navigator.onLine : false,
            createdAt: Date.now(),
          };
          setSession(joined);
          roomCleanupRef.current = await attachRoomChannelAndMesh(joined);
          appendSystemChat(`Sintonizando "${joined.title}" vía StarSeed Link.`);
          return { ok: true };
        }
      }

      // 2. Interactive Channel or Omnifrecuencias Live Session
      let resolvedId = rawId;
      let kind: TransmissionKind = target.discovered?.kind || 'channel';
      let format: TransmissionFormat = target.discovered?.format || 'hybrid_room';
      let token: string | null = null;
      if (rawUrl) {
        try {
          const u = new URL(rawUrl, window.location.origin);
          resolvedId = u.searchParams.get('live') || u.searchParams.get('session') || resolvedId || u.pathname.split('/').pop() || '';
          const kParam = u.searchParams.get('kind');
          if (kParam === 'station' || kParam === 'channel') kind = kParam;
          const fParam = u.searchParams.get('fmt');
          if (fParam === 'presets_exact' || fParam === 'presets_relative' || fParam === 'screen_mirror' || fParam === 'hybrid_room') {
            format = fParam;
          }
          const frag = new URLSearchParams(u.hash.replace(/^#/, ''));
          token = frag.get('k');
        } catch {
          /* fallback to rawId */
        }
      }

      if (!resolvedId) {
        return { ok: false, error: 'Enlace o identificador de transmisión inválido.' };
      }

      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      const joined: ActiveTransmissionSession = {
        id: resolvedId,
        kind,
        format,
        visibility: token ? 'private' : target.discovered?.visibility || 'public',
        title: target.discovered?.title || `Canal ${resolvedId.slice(0, 8)}`,
        description: target.discovered?.description || '',
        sourceApp: target.discovered?.sourceApp === 'omnifrecuencias' ? 'omnifrecuencias' : 'audiomorphic',
        isHost: false,
        hostUserId: target.discovered?.rawPayload?.host_id || 'remote-host',
        hostName: target.discovered?.hostName || 'Anfitrión',
        primaryNeuronId: target.discovered?.rawPayload?.hostNeuronId || 'remote',
        backupNeuronIds: [],
        token,
        shareUrl: rawUrl || `${window.location.origin}/?live=${encodeURIComponent(resolvedId)}`,
        permissions: kind === 'station' ? STATION_LOCKED_PERMISSIONS : DEFAULT_CHANNEL_PERMISSIONS,
        offlineOnly: offline,
        createdAt: Date.now(),
      };

      setSession(joined);
      roomCleanupRef.current = await attachRoomChannelAndMesh(joined);
      appendSystemChat(`Conectado a "${joined.title}" (${kind === 'station' ? 'Estación solo recepción' : 'Canal interactivo'}).`);
      return { ok: true };
    },
    [teardownActiveRoom, applyRemoteParams, attachRoomChannelAndMesh, appendSystemChat]
  );

  // Sync local visualizer params out to peers whenever permitted (debounced 160ms, no echo loop)
  useEffect(() => {
    const s = sessionRef.current;
    if (!s || suppressingParamBroadcastRef.current) return;
    if (!s.isHost && (s.kind === 'station' || !s.permissions.canControlParams)) return;

    const visual = sanitizeParamsForNetwork(params);
    const sig = JSON.stringify(visual);
    if (sig === lastBroadcastedVisualRef.current) return;

    const t = setTimeout(() => {
      lastBroadcastedVisualRef.current = sig;
      emitRoomEvent('params_sync', { visual });
      if (estacionVivaRef.current?.foto()?.control) {
        void estacionVivaRef.current.accion('parametros', {
          params: { tipo: 'audiomorphic', visual },
        });
      }
    }, 160);

    return () => clearTimeout(t);
  }, [params, emitRoomEvent]);

  // URL Deep-Link auto-join (`?live=...` or `/estaciones/vivo/...`)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const liveParam = sp.get('live');
    if (liveParam && !sessionRef.current) {
      void joinTransmission({ id: liveParam, url: window.location.href });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─────────────── Chat, Permissions, Library Helpers, Spotify & SSL1 P2P ─────────────── */

  const sendChat = useCallback(
    (text: string) => {
      const clean = text.trim();
      const s = sessionRef.current;
      if (!clean || !s) return;
      if (!s.isHost && !s.permissions.canChat) {
        setLiveError('El chat está deshabilitado por el anfitrión.');
        setTimeout(() => setLiveError(null), 3500);
        return;
      }
      const msg: LiveChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        senderId: userId,
        senderName: displayName,
        neuronName: localNeuron.name,
        text: clean,
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev.slice(-120), msg]);
      emitRoomEvent('chat_message', { msg });
    },
    [userId, displayName, localNeuron.name, emitRoomEvent]
  );

  const updateChannelPermissions = useCallback(
    (patch: Partial<ChannelPermissions>) => {
      const s = sessionRef.current;
      if (!s || !s.isHost || s.kind === 'station') return;
      const next: ChannelPermissions = { ...s.permissions, ...patch };
      setSession((prev) => (prev ? { ...prev, permissions: next } : null));
      emitRoomEvent('permissions_sync', { permissions: next });
    },
    [emitRoomEvent]
  );

  const enqueueUploadedFile = useCallback(
    async (file: File, persistence: 'library' | 'temporary', playNow = true) => {
      const sId = sessionRef.current?.id || 'local';
      const up = await uploadSessionAudio({
        file,
        persistence,
        sessionId: sId,
        userId: identity.user?.id,
      });
      if (!up.ok || !up.url) return { ok: false, error: up.error || 'No se pudo cargar el audio.' };
      return addTrackToQueue(
        {
          title: up.title,
          artist: persistence === 'temporary' ? 'Archivo Temporal de Dispositivo' : 'Biblioteca StarSeed',
          source: persistence === 'temporary' ? 'upload_temp' : 'upload_library',
          url: up.url,
          storagePath: up.storagePath,
          osFileId: up.osFileId,
          mime: up.mime,
          isTemporary: persistence === 'temporary',
          permissionNote:
            up.storageMode === 'os_files_cloud'
              ? persistence === 'temporary'
                ? 'Subida temporal: se eliminará al cerrar la transmisión.'
                : 'Guardado permanentemente en tu Biblioteca StarSeed OS.'
              : 'Reproducción local sin conexión (Blob/WebRTC).',
        },
        playNow
      );
    },
    [identity.user?.id, addTrackToQueue]
  );

  const enqueueLibraryEntry = useCallback(
    async (entry: AudioLibraryEntry, shareMode: 'session_signed_url' | 'make_public' = 'session_signed_url', playNow = true) => {
      let resolvedUrl = entry.url;
      let note = 'Biblioteca Pública StarSeed';
      if (entry.sourceKind === 'private_account') {
        const auth = await authorizePrivateFileForSession(entry, shareMode);
        if (!auth.ok || !auth.url) return { ok: false, error: auth.error || 'Sin URL autorizada.' };
        resolvedUrl = auth.url;
        note = auth.permissionNote;
      }
      return addTrackToQueue(
        {
          title: entry.title,
          artist: entry.entityName || 'StarSeed Biblioteca',
          source: entry.sourceKind === 'private_account' ? 'private_library' : 'public_library',
          url: resolvedUrl,
          osFileId: entry.osFileId,
          storagePath: entry.storagePath,
          mime: entry.mime,
          permissionNote: note,
        },
        playNow
      );
    },
    [addTrackToQueue]
  );

  const enqueueSpotifyItem = useCallback(
    async (inputOrTrack: string | SpotifyTrackSummary, playNow = true) => {
      let summary: SpotifyTrackSummary | null = null;
      if (typeof inputOrTrack === 'string') {
        if (!parseSpotifyInput(inputOrTrack)) {
          return { ok: false, error: 'Ingresa una URL o URI válida de Spotify (ej. open.spotify.com/track/...).' };
        }
        summary = await fetchSpotifyOEmbed(inputOrTrack);
      } else {
        summary = inputOrTrack;
      }
      if (!summary) return { ok: false, error: 'No se pudo resolver la pista de Spotify.' };
      return addTrackToQueue(
        {
          title: summary.title,
          artist: summary.artist,
          coverUrl: summary.coverUrl,
          source: 'spotify',
          spotifyUri: summary.uri,
          spotifyEmbedUrl: buildSpotifyEmbedUrl(summary.uri) || undefined,
          url: summary.previewUrl,
          durationMs: summary.durationMs,
          permissionNote: 'Sincronizado en Spotify (PKCE/MCP o Embed común)',
        },
        playNow
      );
    },
    [addTrackToQueue]
  );

  // Offline SSL1 LAN/Hotspot P2P Pairing controls
  const createSsl1Offer = useCallback(async () => {
    setSsl1StatusMsg(null);
    const res = await iniciarEmparejamiento({
      nombre: localNeuron.name,
      identidad: { neuronDeviceId: localNeuron.id, uid: identity.user?.id, plataforma: localNeuron.platform },
    });
    if ('emp' in res) {
      setSsl1Pairing(res.emp);
      res.emp.alCambiar(() => {
        setSsl1StatusMsg(`Estado SSL1: ${res.emp.estado()}${res.emp.motivo() ? ` · ${res.emp.motivo()}` : ''}`);
      });
      return { ok: true, code: res.emp.codigo() };
    }
    setSsl1StatusMsg(res.motivo);
    return { ok: false, error: res.motivo };
  }, [localNeuron, identity.user?.id]);

  const answerSsl1Offer = useCallback(
    async (offerCode: string) => {
      setSsl1StatusMsg(null);
      const res = await responderEmparejamiento(offerCode, {
        nombre: localNeuron.name,
        identidad: { neuronDeviceId: localNeuron.id, uid: identity.user?.id, plataforma: localNeuron.platform },
      });
      if ('emp' in res) {
        setSsl1Pairing(res.emp);
        res.emp.alCambiar(() => {
          setSsl1StatusMsg(`Estado SSL1: ${res.emp.estado()}${res.emp.motivo() ? ` · ${res.emp.motivo()}` : ''}`);
        });
        return { ok: true, answerCode: res.emp.codigo() };
      }
      setSsl1StatusMsg(res.motivo);
      return { ok: false, error: res.motivo };
    },
    [localNeuron, identity.user?.id]
  );

  const completeSsl1Offer = useCallback(
    async (answerCode: string) => {
      if (!ssl1Pairing) return { ok: false, error: 'Primero genera un código de oferta.' };
      const r = await ssl1Pairing.completar(answerCode);
      if (!r.ok && r.motivo) setSsl1StatusMsg(r.motivo);
      return r;
    },
    [ssl1Pairing]
  );

  const leaveSession = useCallback(
    async (endForAll = false) => {
      roomCleanupRef.current?.();
      roomCleanupRef.current = null;
      await teardownActiveRoom(endForAll);
    },
    [teardownActiveRoom]
  );

  const teardownRef = useRef(teardownActiveRoom);
  teardownRef.current = teardownActiveRoom;
  useEffect(() => {
    return () => {
      roomCleanupRef.current?.();
      void teardownRef.current(false);
    };
  }, []);

  return {
    localNeuron,
    session,
    stationFoto,
    participants,
    chatMessages,
    queue,
    transport,
    activeTrack,
    telemetry,
    liveError,
    setLiveError,
    // Relative viewer & screen mirror preferences
    relativeOffsets,
    setRelativeOffsets,
    preferRemoteScreen,
    setPreferRemoteScreen,
    // Media & WebRTC streams
    voiceEnabled,
    videoEnabled,
    screenShareEnabled,
    sharingNeuronAudio,
    localCameraStream,
    remoteMedia,
    toggleVoiceOrVideo,
    toggleScreenShare,
    shareNeuronSystemAudio,
    // Session actions
    startTransmission,
    joinTransmission,
    leaveSession,
    sendChat,
    updateChannelPermissions,
    // Audio queue actions
    controlPlayback,
    enqueueUploadedFile,
    enqueueLibraryEntry,
    enqueueSpotifyItem,
    getCommonNowMs,
    // Discovery & StarSeed OS Network
    discovered,
    loadingDirectory,
    refreshDirectory,
    meshPeers,
    meshAds,
    meshLinks,
    userEntities,
    layerPrefs,
    updateLayerPrefs,
    capasSalud: estadoCapas(layerPrefs, {
      local: true,
      nube: typeof navigator === 'undefined' ? true : navigator.onLine,
      vecinosMesh: meshPeers.length,
      colectivaConectada: typeof navigator !== 'undefined' && navigator.onLine && Boolean(identity.isLoggedIn),
      sincroniaActiva: Boolean(session),
    }),
    capabilityOffer,
    updateCapabilityOffer,
    CAPAS,
    ETIQUETA_CAPA,
    // Offline SSL1 pairing + Web Serial LoRa
    ssl1Pairing,
    ssl1StatusMsg,
    createSsl1Offer,
    answerSsl1Offer,
    completeSsl1Offer,
    connectLoRa: () => starseedMeshNetwork.connectSerial(),
  };
}

export type UseLiveTransmissionResult = ReturnType<typeof useLiveTransmission>;
