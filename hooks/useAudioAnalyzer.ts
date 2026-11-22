import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

export interface SpectrumSnapshot {
  freq: Uint8Array;
  time: Uint8Array;
  rms: number;
  peakDb: number;
  active: boolean;
}

const elementSourceCache = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();
const elementBoundCtx = new WeakMap<HTMLAudioElement, AudioContext>();

export const useAudioAnalyzer = () => {
  const [localCaptureActive, setLocalCaptureActive] = useState(false);
  const [externalAudioActive, setExternalAudioActive] = useState(false);
  const isActive = localCaptureActive || externalAudioActive;

  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const limiterRef = useRef<DynamicsCompressorNode | null>(null);
  const masterInputRef = useRef<GainNode | null>(null);
  const speakerGainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const remoteStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const connectedMediaElRef = useRef<HTMLAudioElement | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const timeArrayRef = useRef<Uint8Array | null>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedOutputDeviceId, setSelectedOutputDeviceId] = useState<string>('');

  useEffect(() => {
    const getDevices = async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devs = await navigator.mediaDevices.enumerateDevices();

        const audioDevs = devs.filter((d) => d.kind === 'audioinput');
        setDevices(audioDevs);
        if (audioDevs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(audioDevs[0].deviceId);
        }

        const outputDevs = devs.filter((d) => d.kind === 'audiooutput');
        setOutputDevices(outputDevs);
        if (outputDevs.length > 0 && !selectedOutputDeviceId) {
          setSelectedOutputDeviceId(outputDevs[0].deviceId);
        }
      } catch (e) {
        console.warn('Error al enumerar dispositivos de audio:', e);
      }
    };
    getDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', getDevices);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', getDevices);
  }, [selectedDeviceId, selectedOutputDeviceId]);

  const ensureAudioGraph = useCallback((): {
    ctx: AudioContext;
    analyser: AnalyserNode;
    limiter: DynamicsCompressorNode;
    masterInput: GainNode;
    speakerGain: GainNode;
  } | null => {
    if (typeof window === 'undefined') return null;
    if (audioContextRef.current?.state === 'closed') {
      audioContextRef.current = null;
      analyserRef.current = null;
      limiterRef.current = null;
      masterInputRef.current = null;
      speakerGainRef.current = null;
    }

    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      audioContextRef.current = new AudioCtx({ latencyHint: 'interactive' });
    }
    const ctx = audioContextRef.current;

    if (!analyserRef.current) {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      timeArrayRef.current = new Uint8Array(analyser.fftSize);
    }

    if (!limiterRef.current) {
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.knee.value = 12;
      limiter.ratio.value = 6;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.12;
      limiterRef.current = limiter;
    }

    if (!speakerGainRef.current) {
      const spk = ctx.createGain();
      spk.gain.value = 1.0;
      limiterRef.current.connect(spk);
      spk.connect(ctx.destination);
      speakerGainRef.current = spk;
    }

    if (!masterInputRef.current) {
      const masterIn = ctx.createGain();
      masterIn.gain.value = 1.0;
      masterIn.connect(limiterRef.current);
      limiterRef.current.connect(analyserRef.current);
      masterInputRef.current = masterIn;
    }

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }

    return {
      ctx,
      analyser: analyserRef.current,
      limiter: limiterRef.current,
      masterInput: masterInputRef.current,
      speakerGain: speakerGainRef.current,
    };
  }, []);

  const setAudioOutputDevice = async (sinkId: string) => {
    setSelectedOutputDeviceId(sinkId);
    try {
      if (audioContextRef.current && 'setSinkId' in audioContextRef.current) {
        await (audioContextRef.current as any).setSinkId(sinkId);
      }
    } catch (e) {
      console.warn('AudioContext setSinkId no soportado en esta plataforma:', e);
    }

    try {
      const mediaElements = document.querySelectorAll('audio, video');
      mediaElements.forEach(async (el: any) => {
        if (typeof el.setSinkId === 'function') {
          try {
            await el.setSinkId(sinkId);
          } catch {
            /* ignore sink assignment errors */
          }
        }
      });
    } catch {
      /* ignore DOM errors */
    }
  };

  const startAudio = async (sourceType: 'microphone' | 'system' = 'microphone', deviceId?: string) => {
    try {
      setError(null);
      const isElectron = (window as any).electronAPI !== undefined;
      const isCapacitor = (window as any).Capacitor?.isNative;
      const isMac = navigator.userAgent.includes('Mac') || navigator.platform.toUpperCase().indexOf('MAC') >= 0;

      if (isCapacitor) {
        const CapPermissions = (window as any).Capacitor?.Plugins?.Permissions;
        if (CapPermissions) {
          await CapPermissions.request({ name: 'microphone' }).catch(() => {});
        }
      }

      if (isElectron && isMac) {
        const audioStatus = await (window as any).electronAPI.getMediaAccessStatus('microphone');
        if (audioStatus === 'denied') {
          throw new Error(
            'PERMISO DENEGADO (macOS): Active el Micrófono para Audiomorphic en Ajustes del Sistema y reinicie.'
          );
        }
      }

      if (sourceRef.current) {
        if (sourceRef.current.mediaStream) {
          sourceRef.current.mediaStream.getTracks().forEach((t) => t.stop());
        }
        sourceRef.current.disconnect();
      }

      const graph = ensureAudioGraph();
      if (!graph) {
        throw new Error('Web Audio API no disponible en este navegador.');
      }
      if (graph.ctx.state === 'suspended') {
        await graph.ctx.resume();
      }

      let stream: MediaStream;

      if (sourceType === 'system') {
        if (isElectron) {
          const sources = await (window as any).electronAPI.getDesktopSources();
          const source =
            sources.find((s: any) => s.id.includes('screen') || s.name.toLowerCase().includes('system')) || sources[0];
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: source.id,
                echoCancellation: false,
              },
            } as any,
            video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: source.id } } as any,
          });
        } else {
          stream = await (navigator.mediaDevices as any).getDisplayMedia({
            video: true,
            audio: { echoCancellation: false },
          });
        }
        stream.getVideoTracks().forEach((t) => t.stop());
      } else {
        const constraints = {
          audio: {
            deviceId: deviceId || selectedDeviceId ? { exact: deviceId || selectedDeviceId } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
          },
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }

      if (!stream || stream.getAudioTracks().length === 0) {
        throw new Error('No se detectó señal de audio. Verifique permisos.');
      }

      sourceRef.current = graph.ctx.createMediaStreamSource(stream);
      // Local mic connects to analyser only so it never causes acoustic feedback
      sourceRef.current.connect(graph.analyser);
      setLocalCaptureActive(true);
    } catch (err: any) {
      console.error('Error al iniciar audio:', err);
      let errMsg = err.message || 'Error al activar el audio.';
      if (err.name === 'NotAllowedError') errMsg = 'PERMISO DENEGADO: Verifique ajustes de privacidad.';
      setError(errMsg);
      setLocalCaptureActive(false);
      setTimeout(() => setError(null), 8000);
    }
  };

  const stopAudio = () => {
    if (sourceRef.current) {
      if (sourceRef.current.mediaStream) {
        sourceRef.current.mediaStream.getTracks().forEach((t) => t.stop());
      }
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    setLocalCaptureActive(false);
  };

  /** Connects a synced <audio> queue element safely into speakers + shared analyser (once per element). */
  const connectExternalMediaElement = useCallback(
    (el: HTMLAudioElement | null) => {
      if (!el) {
        connectedMediaElRef.current = null;
        return;
      }
      const graph = ensureAudioGraph();
      if (!graph) return;
      try {
        let src = elementSourceCache.get(el);
        const boundCtx = elementBoundCtx.get(el);
        if (!src || boundCtx !== graph.ctx) {
          src = graph.ctx.createMediaElementSource(el);
          elementSourceCache.set(el, src);
          elementBoundCtx.set(el, graph.ctx);
          src.connect(graph.masterInput);
        }
        connectedMediaElRef.current = el;
        setExternalAudioActive(true);
      } catch (e) {
        console.warn('No se pudo enlazar elemento de audio al analizador (CORS o estado):', e);
      }
    },
    [ensureAudioGraph]
  );

  /** Routes a remote WebRTC peer neuron audio stream into the analyser + optional speaker playback. */
  const connectExternalMediaStream = useCallback(
    (stream: MediaStream | null, monitorSpeakers = true) => {
      if (remoteStreamRef.current === stream && stream !== null) return;
      if (remoteStreamSourceRef.current) {
        try {
          remoteStreamSourceRef.current.disconnect();
        } catch {
          /* ignore */
        }
        remoteStreamSourceRef.current = null;
      }
      remoteStreamRef.current = stream;
      if (!stream || stream.getAudioTracks().length === 0) {
        return;
      }
      const graph = ensureAudioGraph();
      if (!graph) return;
      try {
        const src = graph.ctx.createMediaStreamSource(stream);
        if (monitorSpeakers) {
          src.connect(graph.masterInput);
        } else {
          src.connect(graph.analyser);
        }
        remoteStreamSourceRef.current = src;
        setExternalAudioActive(true);
      } catch (e) {
        console.warn('No se pudo conectar stream de neurona al analizador:', e);
      }
    },
    [ensureAudioGraph]
  );

  const getMasterInputNode = useCallback((): GainNode | null => {
    const graph = ensureAudioGraph();
    return graph ? graph.masterInput : null;
  }, [ensureAudioGraph]);

  const getAudioContext = useCallback((): AudioContext | null => {
    const graph = ensureAudioGraph();
    return graph ? graph.ctx : null;
  }, [ensureAudioGraph]);

  const getAnalyserNode = useCallback((): AnalyserNode | null => {
    return analyserRef.current;
  }, []);

  const getSpectrumSnapshot = useCallback(
    (outFreq?: Uint8Array, outTime?: Uint8Array): SpectrumSnapshot => {
      const analyser = analyserRef.current;
      const freq = outFreq || dataArrayRef.current || new Uint8Array(128);
      const time = outTime || timeArrayRef.current || new Uint8Array(128);
      if (!analyser || !isActive) {
        freq.fill(0);
        time.fill(128);
        return { freq, time, rms: 0, peakDb: -96, active: false };
      }
      analyser.getByteFrequencyData(freq as any);
      analyser.getByteTimeDomainData(time as any);
      let sumSq = 0;
      let peak = 0;
      for (let i = 0; i < time.length; i++) {
        const norm = (time[i] - 128) / 128;
        const abs = Math.abs(norm);
        if (abs > peak) peak = abs;
        sumSq += norm * norm;
      }
      const rms = Math.sqrt(sumSq / Math.max(1, time.length));
      const peakDb = peak > 0.0001 ? Math.max(-96, Math.round(20 * Math.log10(peak) * 10) / 10) : -96;
      return { freq, time, rms, peakDb, active: true };
    },
    [isActive]
  );

  const getAudioMetrics = useCallback(
    (
      sensitivity: number,
      freqRange: number
    ): { volume: number; frequency: number; bass: number; mid: number; treble: number } => {
      if (!analyserRef.current || !dataArrayRef.current || !isActive) {
        return { volume: 0, frequency: 0, bass: 0, mid: 0, treble: 0 };
      }

      analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
      const rangeLimit = Math.floor(dataArrayRef.current.length * freqRange);

      let totalMagnitude = 0;
      let weightedFrequencySum = 0;
      let bassSum = 0,
        midSum = 0,
        trebleSum = 0;
      let bassCount = 0,
        midCount = 0,
        trebleCount = 0;

      for (let i = 0; i < rangeLimit; i++) {
        const val = dataArrayRef.current[i];
        if (val > 20) {
          totalMagnitude += val;
          weightedFrequencySum += i * val;
          if (i > 0 && i <= 10) {
            bassSum += val;
            bassCount++;
          } else if (i > 10 && i <= 80) {
            midSum += val;
            midCount++;
          } else {
            trebleSum += val;
            trebleCount++;
          }
        }
      }

      const average = rangeLimit > 0 ? totalMagnitude / rangeLimit : 0;
      const volume = Math.min((average / 50) * sensitivity, 1.0);
      const frequency = totalMagnitude > 0 ? weightedFrequencySum / totalMagnitude / rangeLimit : 0;

      const bass = bassCount > 0 ? Math.min((bassSum / bassCount / 255) * sensitivity * 1.5, 1.0) : 0;
      const mid = midCount > 0 ? Math.min((midSum / midCount / 255) * sensitivity * 1.2, 1.0) : 0;
      const treble = trebleCount > 0 ? Math.min((trebleSum / trebleCount / 255) * sensitivity * 1.0, 1.0) : 0;

      return { volume, frequency, bass, mid, treble };
    },
    [isActive]
  );

  return useMemo(
    () => ({
      isActive,
      localCaptureActive,
      externalAudioActive,
      setExternalAudioActive,
      error,
      devices,
      selectedDeviceId,
      setSelectedDeviceId,
      outputDevices,
      selectedOutputDeviceId,
      setAudioOutputDevice,
      startAudio,
      stopAudio,
      getAudioMetrics,
      getAudioContext,
      getAnalyserNode,
      getMasterInputNode,
      getSpectrumSnapshot,
      connectExternalMediaElement,
      connectExternalMediaStream,
    }),
    [
      isActive,
      localCaptureActive,
      externalAudioActive,
      error,
      devices,
      selectedDeviceId,
      outputDevices,
      selectedOutputDeviceId,
      setAudioOutputDevice,
      startAudio,
      stopAudio,
      getAudioMetrics,
      getAudioContext,
      getAnalyserNode,
      getMasterInputNode,
      getSpectrumSnapshot,
      connectExternalMediaElement,
      connectExternalMediaStream,
    ]
  );
};
