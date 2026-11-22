import {
  inicioEnFase,
  osciladoresDesdeEntonacion,
  valoresOscilador,
  type EntonacionParam,
  type OsciladorApp,
  type OsciladorParam,
} from './starseedLink';

export type TrackSourceKind =
  | 'upload_temp'
  | 'upload_library'
  | 'private_library'
  | 'public_library'
  | 'spotify'
  | 'neuron_stream'
  | 'omnifrecuencias';

export interface LiveTrackItem {
  id: string;
  title: string;
  artist?: string;
  coverUrl?: string;
  source: TrackSourceKind;
  url?: string;
  spotifyUri?: string;
  spotifyEmbedUrl?: string;
  storagePath?: string;
  osFileId?: string;
  mime?: string;
  durationMs?: number;
  addedById: string;
  addedByName: string;
  sourceNeuronId?: string;
  permissionNote?: string;
  isTemporary?: boolean;
  addedAt: number;
}

export interface LiveAudioTransport {
  activeTrackId: string | null;
  status: 'playing' | 'paused' | 'stopped';
  /** Instante común (ms del RelojComun) en que la pista valdría posición 0. */
  anchorCommonMs: number | null;
  /** Posición acumulada en pausa o detención (ms). */
  positionMs: number;
  volume: number;
  primaryAudioMode: 'queue' | 'neuron_stream' | 'local_mic' | 'omnifrecuencias';
  primaryNeuronId: string | null;
  revision: number;
}

export const INITIAL_AUDIO_TRANSPORT: LiveAudioTransport = {
  activeTrackId: null,
  status: 'stopped',
  anchorCommonMs: null,
  positionMs: 0,
  volume: 0.85,
  primaryAudioMode: 'queue',
  primaryNeuronId: null,
  revision: 0,
};

export function computeExpectedPositionMs(transport: LiveAudioTransport, nowCommonMs: number): number {
  if (transport.status === 'playing' && typeof transport.anchorCommonMs === 'number') {
    return Math.max(0, nowCommonMs - transport.anchorCommonMs);
  }
  return Math.max(0, transport.positionMs || 0);
}

/**
 * Sincroniza un <audio> HTML con el reloj común del transmisor sin cortes audibles:
 * - < 35 ms de deriva: playbackRate = 1.000
 * - 35..250 ms: ajuste suave de velocidad (0.985..1.015) sin reiniciar el buffer
 * - > 250 ms: seek limpio al instante exacto
 */
export function applyClockSyncedAudioElement(
  el: HTMLAudioElement | null,
  transport: LiveAudioTransport,
  nowCommonMs: number
): number | null {
  if (!el) return null;

  el.volume = Math.max(0, Math.min(1, transport.volume));
  const targetMs = computeExpectedPositionMs(transport, nowCommonMs);
  const targetSec = targetMs / 1000;

  if (transport.status !== 'playing') {
    el.playbackRate = 1.0;
    if (!el.paused) el.pause();
    if (Number.isFinite(el.duration) && el.duration > 0 && Math.abs(el.currentTime - targetSec) > 0.25) {
      el.currentTime = Math.min(el.duration - 0.05, Math.max(0, targetSec));
    }
    return 0;
  }

  if (el.readyState < 1) {
    return null;
  }

  if (el.paused) {
    if (Number.isFinite(el.duration) && targetSec < el.duration) {
      el.currentTime = Math.max(0, targetSec);
    }
    void el.play().catch(() => undefined);
    return 0;
  }

  const actualMs = el.currentTime * 1000;
  const driftMs = targetMs - actualMs; // >0 = local detrás de la sesión
  const absDrift = Math.abs(driftMs);

  if (absDrift <= 35) {
    if (el.playbackRate !== 1.0) el.playbackRate = 1.0;
  } else if (absDrift <= 250) {
    el.playbackRate = driftMs > 0 ? 1.015 : 0.985;
  } else {
    el.playbackRate = 1.0;
    if (!Number.isFinite(el.duration) || targetSec < el.duration) {
      el.currentTime = Math.max(0, targetSec);
    }
  }

  return Math.round(driftMs);
}

/**
 * Motor WebAudio local para reproducir osciladores armónicos de estaciones de Omnifrecuencias
 * programados contra el reloj común (`inicioEnFase` + `valoresOscilador`).
 */
export class OmnifrecuenciasSynthEngine {
  private nodes: Array<{
    osc: OscillatorNode;
    gain: GainNode;
    panner: StereoPannerNode;
    param: OsciladorParam;
  }> = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  public start(
    ctx: AudioContext,
    dest: AudioNode,
    entonacion: EntonacionParam,
    anchorCommonMs: number | null,
    nowCommonMs: number,
    volume: number,
    phaseOnlyAtLocalMs?: (tComun: number) => number,
    getNowCommonMs?: () => number
  ): void {
    this.stop();
    if (!entonacion.osciladores.length) return;
    this.running = true;

    const nowFn = getNowCommonMs ?? (() => Date.now());
    const ancla = anchorCommonMs ?? nowCommonMs;
    const toLocal = phaseOnlyAtLocalMs ?? ((t: number) => t);
    const basePosS = Math.max(0, (nowCommonMs - ancla) / 1000);

    for (const o of entonacion.osciladores) {
      const vals = valoresOscilador(o, basePosS);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner();

      osc.type = vals.onda;
      osc.frequency.value = vals.f;
      panner.pan.value = Math.max(-1, Math.min(1, vals.x));
      gain.gain.value = 0.0001;

      osc.connect(panner);
      panner.connect(gain);
      gain.connect(dest);

      const startCommon = inicioEnFase(ancla, nowCommonMs + 25, vals.f);
      const localStartMs = toLocal(startCommon);
      const whenSec = ctx.currentTime + Math.max(0.01, (localStartMs - Date.now()) / 1000);
      const targetVol = Math.max(0, Math.min(0.6, vals.vol * volume * 0.4));

      osc.start(whenSec);
      gain.gain.setTargetAtTime(targetVol, whenSec, 0.03);
      this.nodes.push({ osc, gain, panner, param: o });
    }

    // Update transitions every 100ms deterministically
    this.timer = setInterval(() => {
      if (!this.running || !this.nodes.length) return;
      const posS = Math.max(0, (nowFn() - ancla) / 1000);
      for (const n of this.nodes) {
        if (!n.param.trans) continue;
        const v = valoresOscilador(n.param, posS);
        n.osc.frequency.setTargetAtTime(v.f, ctx.currentTime, 0.04);
        n.panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, v.x)), ctx.currentTime, 0.04);
        n.gain.gain.setTargetAtTime(Math.max(0, Math.min(0.6, v.vol * volume * 0.4)), ctx.currentTime, 0.04);
      }
    }, 100);
  }

  public stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    for (const n of this.nodes) {
      try {
        n.osc.stop();
      } catch {
        /* ignore */
      }
      try {
        n.osc.disconnect();
        n.panner.disconnect();
        n.gain.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.nodes = [];
  }
}

export function describeOscillators(oscs: OsciladorApp[] | undefined): string {
  if (!Array.isArray(oscs) || oscs.length === 0) return 'Sin osciladores';
  return oscs
    .slice(0, 4)
    .map((o) => `${Math.round(Number(o.frequency) || 0)}Hz`)
    .join(' · ');
}

export { osciladoresDesdeEntonacion };
