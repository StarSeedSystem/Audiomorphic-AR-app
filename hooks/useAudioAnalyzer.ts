import { useEffect, useRef, useState, useCallback } from 'react';

export const useAudioAnalyzer = () => {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  useEffect(() => {
    const getDevices = async () => {
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        const audioDevs = devs.filter(d => d.kind === 'audioinput');
        setDevices(audioDevs);
        if (audioDevs.length > 0 && !selectedDeviceId) {
           setSelectedDeviceId(audioDevs[0].deviceId);
        }
      } catch (e) {}
    };
    getDevices();
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
  }, [selectedDeviceId]);

  const startAudio = async (sourceType: 'microphone' | 'system' = 'microphone', deviceId?: string) => {
    try {
      setError(null);
      console.log(`Iniciando captura de audio: ${sourceType}...`);
      
      const isElectron = (window as any).electronAPI !== undefined;
      const isCapacitor = (window as any).Capacitor?.isNative;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isMac = navigator.userAgent.includes('Mac') || navigator.platform.toUpperCase().indexOf('MAC') >= 0;

      // --- PERMISOS NATIVOS ---
      if (isCapacitor) {
        // En Android/iOS Capacitor, pedir permiso explícitamente vía plugin si está disponible
        const CapPermissions = (window as any).Capacitor?.Plugins?.Permissions;
        if (CapPermissions) {
           await CapPermissions.request({ name: 'microphone' }).catch(() => {});
        }
      }

      if (isElectron && isMac) {
        const audioStatus = await (window as any).electronAPI.getMediaAccessStatus('microphone');
        if (audioStatus === 'denied') {
          throw new Error("PERMISO DENEGADO (macOS): Active el Micrófono para Audiomorphic en Ajustes del Sistema y reinicie.");
        }
      }

      // Detener pistas anteriores si existen
      if (sourceRef.current) {
        if (sourceRef.current.mediaStream) {
          sourceRef.current.mediaStream.getTracks().forEach(t => t.stop());
        }
        sourceRef.current.disconnect();
      }

      if (audioContextRef.current?.state === 'closed') {
        audioContextRef.current = null;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          latencyHint: 'interactive'
        });
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      let stream: MediaStream;

      if (sourceType === 'system') {
        if (isElectron) {
          const sources = await (window as any).electronAPI.getDesktopSources();
          const source = sources.find((s: any) => s.id.includes('screen') || s.name.toLowerCase().includes('system')) || sources[0];
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { 
              mandatory: { 
                chromeMediaSource: 'desktop', 
                chromeMediaSourceId: source.id,
                echoCancellation: false
              } 
            } as any,
            video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: source.id } } as any
          });
        } else {
          // Web o Capacitor (Screen Capture)
          stream = await (navigator.mediaDevices as any).getDisplayMedia({ 
            video: true, 
            audio: { echoCancellation: false } 
          });
        }
        
        // Detener video inmediatamente
        stream.getVideoTracks().forEach(t => t.stop());
      } else {
        // Micrófono
        const constraints = {
          audio: {
            deviceId: deviceId || selectedDeviceId ? { exact: deviceId || selectedDeviceId } : undefined,
            echoCancellation: true,
            noiseSuppression: true
          }
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }

      if (!stream || stream.getAudioTracks().length === 0) {
        throw new Error("No se detectó señal de audio. Verifique permisos.");
      }

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      setIsActive(true);
      console.log("Analizador ACTIVADO con éxito.");
    } catch (err: any) {
      console.error("Error al iniciar audio:", err);
      let errMsg = err.message || "Error al activar el audio.";
      if (err.name === 'NotAllowedError') errMsg = "PERMISO DENEGADO: Verifique ajustes de privacidad.";
      setError(errMsg);
      setIsActive(false);
      setTimeout(() => setError(null), 8000);
    }
  };

  const stopAudio = () => {
    if (sourceRef.current) {
      if (sourceRef.current.mediaStream) {
        sourceRef.current.mediaStream.getTracks().forEach(t => t.stop());
      }
      sourceRef.current.disconnect();
    }
    setIsActive(false);
  };

  const getAudioMetrics = useCallback((sensitivity: number, freqRange: number): { volume: number, frequency: number, bass: number, mid: number, treble: number } => {
    if (!analyserRef.current || !dataArrayRef.current || !isActive) {
      return { volume: 0, frequency: 0, bass: 0, mid: 0, treble: 0 };
    }

    analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
    const rangeLimit = Math.floor(dataArrayRef.current.length * freqRange);
    
    let totalMagnitude = 0;
    let weightedFrequencySum = 0;
    let bassSum = 0, midSum = 0, trebleSum = 0;
    let bassCount = 0, midCount = 0, trebleCount = 0;
    
    for (let i = 0; i < rangeLimit; i++) {
      const val = dataArrayRef.current[i];
      if (val > 20) { 
        totalMagnitude += val;
        weightedFrequencySum += i * val;
        if (i > 0 && i <= 10) { bassSum += val; bassCount++; }
        else if (i > 10 && i <= 80) { midSum += val; midCount++; }
        else { trebleSum += val; trebleCount++; }
      }
    }

    const average = rangeLimit > 0 ? totalMagnitude / rangeLimit : 0;
    const volume = Math.min((average / 50) * sensitivity, 1.0); 
    const frequency = totalMagnitude > 0 ? (weightedFrequencySum / totalMagnitude) / rangeLimit : 0;
    
    const bass = bassCount > 0 ? Math.min((bassSum / bassCount / 255) * sensitivity * 1.5, 1.0) : 0;
    const mid = midCount > 0 ? Math.min((midSum / midCount / 255) * sensitivity * 1.2, 1.0) : 0;
    const treble = trebleCount > 0 ? Math.min((trebleSum / trebleCount / 255) * sensitivity * 1.0, 1.0) : 0;

    return { volume, frequency, bass, mid, treble };
  }, [isActive]);

  return { isActive, error, devices, selectedDeviceId, setSelectedDeviceId, startAudio, stopAudio, getAudioMetrics };
};