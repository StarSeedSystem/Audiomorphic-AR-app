import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';

export interface Menu3DTiltOptions {
  /** Rotación máxima en grados (sutil para legibilidad profesional en menús grandes). */
  maxDeg?: number;
  /** Desplazamiento máximo de paralaje en px. */
  maxTranslatePx?: number;
  /** Permitir activar automáticamente la lectura de giroscopio si no requiere permiso explícito. */
  autoGyro?: boolean;
}

export interface Menu3DTiltResult {
  surfaceRef: RefObject<HTMLDivElement | null>;
  gyroSupported: boolean;
  gyroActive: boolean;
  needsGyroPermission: boolean;
  tiltEnabled: boolean;
  requestGyroPermission: () => Promise<boolean>;
  toggleTilt: () => void;
  setInteractionPaused: (paused: boolean) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
}

const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);

/**
 * Motor 3D de inclinación para menús/tarjetas por giroscopio + puntero sin re-renders de React.
 * Escribe --menu-rx, --menu-ry, --menu-tx, --menu-ty, --menu-glare-x y --menu-glare-y
 * directamente en el elemento destino dentro de un loop rAF suavizado por resorte.
 */
export function useMenu3DTilt(options: Menu3DTiltOptions = {}): Menu3DTiltResult {
  const { maxDeg = 3.5, maxTranslatePx = 6, autoGyro = true } = options;

  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [gyroSupported, setGyroSupported] = useState(false);
  const [gyroActive, setGyroActive] = useState(false);
  const [needsGyroPermission, setNeedsGyroPermission] = useState(false);
  const [tiltEnabled, setTiltEnabled] = useState(true);

  const tiltEnabledRef = useRef(tiltEnabled);
  tiltEnabledRef.current = tiltEnabled;
  const maxDegRef = useRef(maxDeg);
  maxDegRef.current = maxDeg;
  const maxTranslateRef = useRef(maxTranslatePx);
  maxTranslateRef.current = maxTranslatePx;
  const pausedRef = useRef(false);
  const gyroListenerAttachedRef = useRef(false);
  const gyroDetectedRef = useRef(false);

  // Referencias separadas de puntero y giroscopio para mezclar de forma orgánica
  const pointerTargetRef = useRef({ rx: 0, ry: 0, tx: 0, ty: 0, gx: 50, gy: 35 });
  const gyroTargetRef = useRef({ rx: 0, ry: 0, tx: 0, ty: 0, gx: 50, gy: 35 });
  const gyroBaseRef = useRef<{ beta: number; gamma: number } | null>(null);
  const currentRef = useRef({ rx: 0, ry: 0, tx: 0, ty: 0, gx: 50, gy: 35 });

  const reducedMotionRef = useRef(false);

  const attachOrientationListener = useCallback(() => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return;
    if (gyroListenerAttachedRef.current) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null || !Number.isFinite(e.beta) || !Number.isFinite(e.gamma)) return;

      if (!gyroDetectedRef.current) {
        gyroDetectedRef.current = true;
        setGyroActive(true);
        setNeedsGyroPermission(false);
      }

      if (!gyroBaseRef.current) {
        gyroBaseRef.current = { beta: e.beta, gamma: e.gamma };
      } else {
        // Re-centrado lento y natural al sostener el dispositivo en nueva postura
        const diffBetaRaw = e.beta - gyroBaseRef.current.beta;
        const diffGammaRaw = e.gamma - gyroBaseRef.current.gamma;
        if (Math.abs(diffBetaRaw) < 35) {
          gyroBaseRef.current.beta += diffBetaRaw * 0.008;
        }
        if (Math.abs(diffGammaRaw) < 35) {
          gyroBaseRef.current.gamma += diffGammaRaw * 0.008;
        }
      }

      const relGamma = clamp(e.gamma - gyroBaseRef.current.gamma, -32, 32) / 32;
      const relBeta = clamp(e.beta - gyroBaseRef.current.beta, -28, 28) / 28;
      const deg = maxDegRef.current;
      const tpx = maxTranslateRef.current;

      gyroTargetRef.current = {
        rx: -relBeta * deg * 1.15,
        ry: relGamma * deg * 1.15,
        tx: -relGamma * tpx,
        ty: -relBeta * tpx,
        gx: clamp(50 + relGamma * 38, 8, 92),
        gy: clamp(45 + relBeta * 34, 8, 92),
      };
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    gyroListenerAttachedRef.current = true;

    (surfaceRef as any).__cleanupOrientation = () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
      gyroListenerAttachedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = Boolean(mql?.matches);
    const onMqlChange = (ev: MediaQueryListEvent) => {
      reducedMotionRef.current = ev.matches;
    };
    mql?.addEventListener?.('change', onMqlChange);

    const hasOrientation = 'DeviceOrientationEvent' in window;
    setGyroSupported(hasOrientation);

    if (hasOrientation) {
      const reqFn = (window.DeviceOrientationEvent as any)?.requestPermission;
      if (typeof reqFn === 'function') {
        setNeedsGyroPermission(true);
      } else if (autoGyro) {
        attachOrientationListener();
      }
    }

    let rafId = 0;
    let lastApplied = { rx: 999, ry: 999, tx: 999, ty: 999, gx: 999, gy: 999 };

    const applyVars = (el: HTMLDivElement, s: typeof currentRef.current) => {
      el.style.setProperty('--menu-rx', `${s.rx.toFixed(3)}deg`);
      el.style.setProperty('--menu-ry', `${s.ry.toFixed(3)}deg`);
      el.style.setProperty('--menu-tx', `${s.tx.toFixed(2)}px`);
      el.style.setProperty('--menu-ty', `${s.ty.toFixed(2)}px`);
      el.style.setProperty('--menu-glare-x', `${s.gx.toFixed(1)}%`);
      el.style.setProperty('--menu-glare-y', `${s.gy.toFixed(1)}%`);
    };

    const tick = () => {
      const el = surfaceRef.current;
      const disabled = !tiltEnabledRef.current || reducedMotionRef.current;
      const paused = pausedRef.current;

      const pt = pointerTargetRef.current;
      const gt = gyroTargetRef.current;

      const useGyro = gyroDetectedRef.current && !disabled;
      const targetRx = disabled ? 0 : (useGyro ? gt.rx : 0) + (paused ? 0 : pt.rx * 0.72);
      const targetRy = disabled ? 0 : (useGyro ? gt.ry : 0) + (paused ? 0 : pt.ry * 0.72);
      const targetTx = disabled ? 0 : (useGyro ? gt.tx : 0) + (paused ? 0 : pt.tx * 0.7);
      const targetTy = disabled ? 0 : (useGyro ? gt.ty : 0) + (paused ? 0 : pt.ty * 0.7);
      const targetGx = disabled ? 50 : useGyro ? gt.gx : paused ? 50 : pt.gx;
      const targetGy = disabled ? 35 : useGyro ? gt.gy : paused ? 35 : pt.gy;

      const cur = currentRef.current;
      const alpha = paused ? 0.14 : 0.11;
      cur.rx += (targetRx - cur.rx) * alpha;
      cur.ry += (targetRy - cur.ry) * alpha;
      cur.tx += (targetTx - cur.tx) * alpha;
      cur.ty += (targetTy - cur.ty) * alpha;
      cur.gx += (targetGx - cur.gx) * alpha;
      cur.gy += (targetGy - cur.gy) * alpha;

      if (
        el &&
        (Math.abs(cur.rx - lastApplied.rx) > 0.015 ||
          Math.abs(cur.ry - lastApplied.ry) > 0.015 ||
          Math.abs(cur.tx - lastApplied.tx) > 0.04 ||
          Math.abs(cur.ty - lastApplied.ty) > 0.04 ||
          Math.abs(cur.gx - lastApplied.gx) > 0.12 ||
          Math.abs(cur.gy - lastApplied.gy) > 0.12)
      ) {
        lastApplied = { ...cur };
        applyVars(el, cur);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      mql?.removeEventListener?.('change', onMqlChange);
      (surfaceRef as any).__cleanupOrientation?.();
    };
  }, [attachOrientationListener, autoGyro]);

  const requestGyroPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return false;
    const reqFn = (window.DeviceOrientationEvent as any)?.requestPermission;
    try {
      if (typeof reqFn === 'function') {
        const res = await reqFn();
        if (res === 'granted') {
          setNeedsGyroPermission(false);
          setTiltEnabled(true);
          gyroBaseRef.current = null;
          attachOrientationListener();
          return true;
        }
        return false;
      }
      setNeedsGyroPermission(false);
      setTiltEnabled(true);
      gyroBaseRef.current = null;
      attachOrientationListener();
      return true;
    } catch {
      return false;
    }
  }, [attachOrientationListener]);

  const toggleTilt = useCallback(() => {
    setTiltEnabled((prev) => {
      const next = !prev;
      if (next) gyroBaseRef.current = null;
      return next;
    });
  }, []);

  const setInteractionPaused = useCallback((paused: boolean) => {
    pausedRef.current = paused;
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (!tiltEnabledRef.current || reducedMotionRef.current || pausedRef.current) return;
    if (e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const nx = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    const ny = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
    const deg = maxDegRef.current;
    const tpx = maxTranslateRef.current;

    pointerTargetRef.current = {
      rx: -ny * deg,
      ry: nx * deg,
      tx: -nx * tpx,
      ty: -ny * tpx,
      gx: clamp(((nx + 1) * 0.5) * 100, 5, 95),
      gy: clamp(((ny + 1) * 0.5) * 100, 5, 95),
    };
  }, []);

  const onPointerLeave = useCallback(() => {
    pointerTargetRef.current = { rx: 0, ry: 0, tx: 0, ty: 0, gx: 50, gy: 35 };
  }, []);

  return {
    surfaceRef,
    gyroSupported,
    gyroActive,
    needsGyroPermission,
    tiltEnabled,
    requestGyroPermission,
    toggleTilt,
    setInteractionPaused,
    onPointerMove,
    onPointerLeave,
  };
}
