import { useState, useEffect, useRef, useCallback } from 'react';

export interface AmbientCameraLightState {
  active: boolean;
  supported: boolean;
  error: string | null;
  ambientHex: string;
  r: number;
  g: number;
  b: number;
  luminance: number;   // 0.15 .. 1.0
  warmth: number;      // -1.0 (cool) .. +1.0 (warm)
  dominantHue: number; // 0 .. 360 deg
  lightX: number;      // -1.0 .. +1.0 directional light offset
  lightY: number;      // -1.0 .. +1.0 directional light offset
  toggle: () => Promise<void>;
  stop: () => void;
}

function rgbToHue(r: number, g: number, b: number): number {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  if (d < 0.02) return 195;
  let h = 0;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return (Math.round(h * 60) + 360) % 360;
}

function toHexByte(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, '0');
}

/**
 * Muestreador local 100% privado de iluminación ambiental por cámara para tarjetas 4D.
 * No almacena ni envía imágenes: únicamente extrae color promedio, luminancia,
 * temperatura de color y vector direccional de luz a baja frecuencia (~8 fps).
 */
export function useAmbientCameraLight(): AmbientCameraLightState {
  const supported =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    ambientHex: '#7dd3fc',
    r: 125,
    g: 211,
    b: 252,
    luminance: 0.65,
    warmth: 0,
    dominantHue: 195,
    lightX: 0.35,
    lightY: 0.55,
  });

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafTimerRef = useRef<number | null>(null);
  const smoothRef = useRef({
    r: 125,
    g: 211,
    b: 252,
    lum: 0.65,
    warmth: 0,
    lx: 0.35,
    ly: 0.55,
  });

  const stop = useCallback(() => {
    if (rafTimerRef.current !== null) {
      window.clearInterval(rafTimerRef.current);
      rafTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
    setActive(false);
  }, []);

  const toggle = useCallback(async () => {
    if (active) {
      stop();
      setError(null);
      return;
    }
    if (!supported) {
      setError('Tu navegador no permite muestreo de cámara ambiental.');
      return;
    }

    setError(null);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 160 }, height: { ideal: 120 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      const video = document.createElement('video');
      video.playsInline = true;
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      videoRef.current = video;

      if (!canvasRef.current) {
        const c = document.createElement('canvas');
        c.width = 24;
        c.height = 18;
        canvasRef.current = c;
      }

      setActive(true);

      const sampleFrame = () => {
        const vid = videoRef.current;
        const can = canvasRef.current;
        if (!vid || !can || vid.readyState < 2) return;
        const ctx = can.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const w = can.width;
        const h = can.height;
        ctx.drawImage(vid, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;

        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let leftLum = 0;
        let rightLum = 0;
        let topLum = 0;
        let botLum = 0;
        const total = w * h;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            sumR += r;
            sumG += g;
            sumB += b;
            const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            if (x < w * 0.5) leftLum += l;
            else rightLum += l;
            if (y < h * 0.5) topLum += l;
            else botLum += l;
          }
        }

        const avgR = sumR / total;
        const avgG = sumG / total;
        const avgB = sumB / total;
        const half = (total * 0.5) * 255;
        const lum = Math.max(0.18, Math.min(1.0, (0.2126 * avgR + 0.7152 * avgG + 0.0722 * avgB) / 220));
        const targetLx = Math.max(-1, Math.min(1, ((rightLum - leftLum) / half) * 2.4));
        const targetLy = Math.max(-1, Math.min(1, ((topLum - botLum) / half) * 2.4));
        const warmth = Math.max(-1, Math.min(1, (avgR - avgB) / 160));

        const s = smoothRef.current;
        const alpha = 0.24;
        s.r += (avgR - s.r) * alpha;
        s.g += (avgG - s.g) * alpha;
        s.b += (avgB - s.b) * alpha;
        s.lum += (lum - s.lum) * alpha;
        s.warmth += (warmth - s.warmth) * alpha;
        s.lx += (targetLx - s.lx) * alpha;
        s.ly += (targetLy - s.ly) * alpha;

        const rOut = Math.round(s.r);
        const gOut = Math.round(s.g);
        const bOut = Math.round(s.b);

        setMetrics({
          ambientHex: `#${toHexByte(rOut)}${toHexByte(gOut)}${toHexByte(bOut)}`,
          r: rOut,
          g: gOut,
          b: bOut,
          luminance: Number(s.lum.toFixed(3)),
          warmth: Number(s.warmth.toFixed(3)),
          dominantHue: rgbToHue(rOut, gOut, bOut),
          lightX: Number(s.lx.toFixed(3)),
          lightY: Number(s.ly.toFixed(3)),
        });
      };

      sampleFrame();
      rafTimerRef.current = window.setInterval(sampleFrame, 125);
    } catch (err: any) {
      stop();
      setError(
        err?.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado (usando iluminación espectral autónoma).'
          : 'Cámara no disponible en este dispositivo.'
      );
    }
  }, [active, stop, supported]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    active,
    supported,
    error,
    ...metrics,
    toggle,
    stop,
  };
}
