import { alCambiarEnlacesLocales, enlacesLocales, type EnlaceLocal } from './starseedLink/emparejar';
import { getOrCreateLocalNeuronInfo } from './starseedBrains';

/**
 * Red Mesh Multi-Medio Unificada (Audiomorphic + Omnifrecuencias + StarSeed OS):
 * 1. BroadcastChannel (`starseed_audiomorphic_mesh` + puente `omni_quantum_mesh`) para multi-pestaña offline instantánea.
 * 2. Enlaces locales WebRTC sin internet (`SSL1` de `starseedLink/emparejar.ts`).
 * 3. Web Serial / Hardware LoRa Meshtastic (`navigator.serial`).
 */

export type MeshMedium = 'broadcast' | 'ssl1' | 'lora' | 'webrtc' | 'cloud';

export interface MeshPeerNode {
  id: string;
  shortName: string;
  longName: string;
  app: 'audiomorphic' | 'omnifrecuencias' | 'starseed-os' | string;
  lastHeard: number;
  snr?: number;
  rttMs?: number | null;
  medium: MeshMedium;
  capabilities?: {
    correr?: boolean;
    llevar?: boolean;
    guardar?: boolean;
  };
}

export interface LiveMeshSessionAd {
  sessionId: string;
  kind: 'station' | 'channel';
  format: string;
  title: string;
  hostName: string;
  hostNeuronId: string;
  visibility: string;
  participantsCount: number;
  app: 'audiomorphic' | 'omnifrecuencias' | string;
  updatedAt: number;
}

export type MeshConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

const MESH_PREFIX = '{"_amMesh":1';

class StarSeedMeshNetworkManager {
  private port: any | null = null;
  private reader: any | null = null;
  private nodes: Map<string, MeshPeerNode> = new Map();
  private sessionAds: Map<string, LiveMeshSessionAd> = new Map();
  private nodeListeners = new Set<(nodes: MeshPeerNode[]) => void>();
  private adListeners = new Set<(ads: LiveMeshSessionAd[]) => void>();
  private stateListeners = new Set<(state: MeshConnectionState) => void>();
  private dataListeners = new Set<(data: any) => void>();

  private amChannel: BroadcastChannel | null = null;
  private omniChannel: BroadcastChannel | null = null;
  private processedIds = new Set<string>();
  private ssl1Unsubs = new Map<string, () => void>();
  public state: MeshConnectionState = 'disconnected';
  public readonly localNeuron = getOrCreateLocalNeuronInfo();
  private readonly instanceId = Math.random().toString(36).slice(2, 8);
  private buffer = '';

  constructor() {
    this.initBroadcastMeshes();
    this.bindSsl1Links();
    this.pruneInterval();
  }

  private initBroadcastMeshes(): void {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    try {
      this.amChannel = new BroadcastChannel('starseed_audiomorphic_mesh');
      this.amChannel.onmessage = (ev) => this.handleIncomingPacket(ev.data, 'broadcast');

      // Listen also on Omnifrecuencias channel so both apps discover & bridge automatically
      this.omniChannel = new BroadcastChannel('omni_quantum_mesh');
      this.omniChannel.onmessage = (ev) => this.handleIncomingPacket(ev.data, 'broadcast');

      this.state = 'connected';
      this.broadcastPresence(true);
      setInterval(() => this.broadcastPresence(false), 10_000);
    } catch {
      /* BroadcastChannel unavailable */
    }
  }

  private bindSsl1Links(): void {
    const syncLinks = () => {
      const active = new Map(enlacesLocales().map((e) => [e.id, e] as const));
      for (const [id, e] of active) {
        this.upsertSsl1Node(e);
        if (!this.ssl1Unsubs.has(id)) {
          const unsub = e.alMensaje((txt) => {
            if (!txt.startsWith(MESH_PREFIX)) return;
            try {
              const pkt = JSON.parse(txt);
              this.handleIncomingPacket(pkt, 'ssl1', e.rttMs());
            } catch {
              /* ignore invalid mesh packet */
            }
          });
          this.ssl1Unsubs.set(id, unsub);
        }
      }
      for (const [id, unsub] of Array.from(this.ssl1Unsubs.entries())) {
        if (!active.has(id)) {
          unsub();
          this.ssl1Unsubs.delete(id);
          this.nodes.delete(`ssl1:${id}`);
          this.notifyNodes();
        }
      }
    };
    syncLinks();
    alCambiarEnlacesLocales(syncLinks);
  }

  private upsertSsl1Node(e: EnlaceLocal): void {
    const name = e.par?.nombre || `Neurona P2P (${e.id.slice(0, 4)})`;
    this.nodes.set(`ssl1:${e.id}`, {
      id: e.par?.neuronDeviceId || `ssl1:${e.id}`,
      shortName: name.slice(0, 6),
      longName: name,
      app: 'starseed-os',
      lastHeard: Date.now(),
      rttMs: e.rttMs(),
      snr: 14,
      medium: 'ssl1',
    });
    this.notifyNodes();
  }

  private pruneInterval(): void {
    if (typeof window === 'undefined') return;
    setInterval(() => {
      const now = Date.now();
      let changedNodes = false;
      let changedAds = false;
      for (const [k, n] of Array.from(this.nodes.entries())) {
        if (n.medium === 'broadcast' && now - n.lastHeard > 35_000) {
          this.nodes.delete(k);
          changedNodes = true;
        }
      }
      for (const [k, ad] of Array.from(this.sessionAds.entries())) {
        if (now - ad.updatedAt > 25_000) {
          this.sessionAds.delete(k);
          changedAds = true;
        }
      }
      if (changedNodes) this.notifyNodes();
      if (changedAds) this.notifyAds();
    }, 10_000);
  }

  private handleIncomingPacket(packet: any, medium: MeshMedium, rttMs?: number | null): void {
    if (!packet || typeof packet !== 'object') return;
    const pid = packet._packetId;
    if (typeof pid === 'string') {
      if (this.processedIds.has(pid)) return;
      this.processedIds.add(pid);
      if (this.processedIds.size > 300) {
        const first = this.processedIds.values().next().value;
        if (first) this.processedIds.delete(first);
      }
    }

    if (packet.instanceId && packet.instanceId === this.instanceId) return;

    const isRemoteNeuron = Boolean(packet.senderId && packet.senderId !== this.localNeuron.id);
    const isRemoteInstance = Boolean(
      packet.senderId && packet.instanceId && packet.instanceId !== this.instanceId
    );

    if (isRemoteNeuron || isRemoteInstance) {
      const senderName = String(packet.senderName || 'Neurona StarSeed');
      const isSameNeuronTab = packet.senderId === this.localNeuron.id;
      const peerKey = isSameNeuronTab
        ? `${packet.senderId}#${packet.instanceId}`
        : String(packet.senderId);
      const peerLongName = isSameNeuronTab
        ? `${senderName} · Pestaña ${String(packet.instanceId).slice(0, 4)}`
        : senderName;

      this.nodes.set(peerKey, {
        id: peerKey,
        shortName: senderName.slice(0, 6),
        longName: peerLongName,
        app: String(packet.app || (packet.type === 'heartbeat' ? 'omnifrecuencias' : 'audiomorphic')),
        lastHeard: Date.now(),
        snr: medium === 'lora' ? packet.snr : 12,
        rttMs: rttMs ?? null,
        medium,
        capabilities: packet.capabilities,
      });
      this.notifyNodes();

      if (packet.replyRequested === true && medium === 'broadcast') {
        this.broadcastPresence(false);
      }
    }

    if (packet.payload) {
      if (packet.payload.type === 'session_ad' && packet.payload.ad) {
        const ad = packet.payload.ad as LiveMeshSessionAd;
        if (ad.sessionId) {
          this.sessionAds.set(ad.sessionId, { ...ad, updatedAt: Date.now() });
          this.notifyAds();
        }
      } else if (packet.payload.type === 'session_closed' && packet.payload.sessionId) {
        if (this.sessionAds.delete(String(packet.payload.sessionId))) {
          this.notifyAds();
        }
      }
      for (const cb of Array.from(this.dataListeners)) cb(packet.payload);
    }
  }

  private setState(s: MeshConnectionState): void {
    this.state = s;
    for (const cb of Array.from(this.stateListeners)) cb(s);
  }

  private notifyNodes(): void {
    const arr = Array.from(this.nodes.values()).sort((a, b) => b.lastHeard - a.lastHeard);
    for (const cb of Array.from(this.nodeListeners)) cb(arr);
  }

  private notifyAds(): void {
    const arr = Array.from(this.sessionAds.values()).sort((a, b) => b.updatedAt - a.updatedAt);
    for (const cb of Array.from(this.adListeners)) cb(arr);
  }

  public broadcastPresence(replyRequested = false): void {
    const pkt = {
      _amMesh: 1,
      _packetId: `hb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      senderId: this.localNeuron.id,
      instanceId: this.instanceId,
      senderName: this.localNeuron.name,
      app: 'audiomorphic',
      type: 'heartbeat',
      replyRequested,
      timestamp: Date.now(),
    };
    try {
      this.amChannel?.postMessage(pkt);
      this.omniChannel?.postMessage(pkt);
    } catch {
      /* ignore */
    }
  }

  public async broadcastData(payload: any): Promise<void> {
    const packetId = `pkt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.processedIds.add(packetId);
    if (payload?.type === 'session_ad' && payload.ad?.sessionId) {
      this.sessionAds.set(payload.ad.sessionId, { ...payload.ad, updatedAt: Date.now() });
      this.notifyAds();
    } else if (payload?.type === 'session_closed' && payload.sessionId) {
      this.sessionAds.delete(String(payload.sessionId));
      this.notifyAds();
    }

    const packet = {
      _amMesh: 1,
      _packetId: packetId,
      senderId: this.localNeuron.id,
      instanceId: this.instanceId,
      senderName: this.localNeuron.name,
      app: 'audiomorphic',
      timestamp: Date.now(),
      payload,
    };

    try {
      this.amChannel?.postMessage(packet);
      this.omniChannel?.postMessage(packet);
    } catch {
      /* ignore */
    }

    const encoded = JSON.stringify(packet);
    for (const link of enlacesLocales()) {
      try {
        if (link.abierto()) link.enviar(encoded);
      } catch {
        /* ignore */
      }
    }

    if (this.port?.writable && encoded.length <= 512) {
      try {
        const writer = this.port.writable.getWriter();
        await writer.write(new TextEncoder().encode(`DATA:${encoded}\n`));
        writer.releaseLock();
      } catch {
        /* ignore serial write errors */
      }
    }
  }

  public async connectSerial(): Promise<{ ok: boolean; error?: string }> {
    if (typeof navigator === 'undefined' || !('serial' in navigator)) {
      this.setState('connected');
      return { ok: false, error: 'Web Serial LoRa no disponible en este navegador; usando Mesh Broadcast + SSL1 P2P.' };
    }
    try {
      this.setState('connecting');
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({ baudRate: 115200 });
      this.setState('connected');
      void this.startReadingSerial();
      return { ok: true };
    } catch (err: any) {
      this.setState('connected');
      return { ok: false, error: err?.message || 'No se seleccionó puerto serial LoRa.' };
    }
  }

  public async autoConnectSerial(): Promise<void> {
    if (typeof navigator === 'undefined' || !('serial' in navigator)) {
      this.setState('connected');
      return;
    }
    try {
      const ports = await (navigator as any).serial.getPorts();
      if (Array.isArray(ports) && ports.length > 0) {
        this.port = ports[0];
        await this.port.open({ baudRate: 115200 });
        this.setState('connected');
        void this.startReadingSerial();
      } else {
        this.setState('connected');
      }
    } catch {
      this.setState('connected');
    }
  }

  public async disconnectSerial(): Promise<void> {
    try {
      if (this.reader) await this.reader.cancel();
    } catch {
      /* ignore */
    }
    try {
      if (this.port) await this.port.close();
    } catch {
      /* ignore */
    }
    this.reader = null;
    this.port = null;
  }

  private async startReadingSerial(): Promise<void> {
    if (!this.port?.readable) return;
    try {
      const decoder = new TextDecoderStream();
      this.port.readable.pipeTo(decoder.writable);
      this.reader = decoder.readable.getReader();
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;
        this.buffer += value;
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.includes('NODE_INFO') || line.includes('NodeInfo')) {
            const idM = line.match(/id=([^\s]+)/);
            const nameM = line.match(/name=([^\s]+)/);
            const snrM = line.match(/snr=([-\d.]+)/);
            if (idM) {
              const id = idM[1];
              const name = nameM ? nameM[1] : 'Antena LoRa';
              this.nodes.set(id, {
                id,
                shortName: name.slice(0, 6),
                longName: name,
                app: 'meshtastic',
                lastHeard: Date.now(),
                snr: snrM ? parseFloat(snrM[1]) : 0,
                medium: 'lora',
              });
              this.notifyNodes();
            }
          } else if (line.includes('DATA:')) {
            try {
              const pkt = JSON.parse(line.split('DATA:')[1]);
              this.handleIncomingPacket(pkt, 'lora');
            } catch {
              /* ignore */
            }
          }
        }
      }
    } catch {
      /* serial closed */
    } finally {
      try {
        this.reader?.releaseLock();
      } catch {
        /* ignore */
      }
    }
  }

  public getNodes(): MeshPeerNode[] {
    return Array.from(this.nodes.values()).sort((a, b) => b.lastHeard - a.lastHeard);
  }

  public getSessionAds(): LiveMeshSessionAd[] {
    return Array.from(this.sessionAds.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public onNodesUpdate(cb: (nodes: MeshPeerNode[]) => void): () => void {
    this.nodeListeners.add(cb);
    cb(this.getNodes());
    return () => this.nodeListeners.delete(cb);
  }

  public onAdsUpdate(cb: (ads: LiveMeshSessionAd[]) => void): () => void {
    this.adListeners.add(cb);
    cb(this.getSessionAds());
    return () => this.adListeners.delete(cb);
  }

  public onDataReceive(cb: (data: any) => void): () => void {
    this.dataListeners.add(cb);
    return () => this.dataListeners.delete(cb);
  }

  public onStateChange(cb: (state: MeshConnectionState) => void): () => void {
    this.stateListeners.add(cb);
    cb(this.state);
    return () => this.stateListeners.delete(cb);
  }
}

export const starseedMeshNetwork = new StarSeedMeshNetworkManager();
export default starseedMeshNetwork;
