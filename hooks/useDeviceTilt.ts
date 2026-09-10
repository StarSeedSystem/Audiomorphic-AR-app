import { useState, useEffect, useRef, useCallback } from 'react';

export interface DeviceTilt {
  rotateX: number; // degrees (-30 to +30)
  rotateY: number; // degrees (-30 to +30)
  glareX: number;  // percentage (0 to 100)
  glareY: number;  // percentage (0 to 100)
  isGyroActive: boolean;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
}

export function useDeviceTilt(intensity: number = 22): DeviceTilt {
  const [tilt, setTilt] = useState<{ rotateX: number; rotateY: number; glareX: number; glareY: number }>({
    rotateX: 0,
    rotateY: 0,
    glareX: 50,
    glareY: 50,
  });
  const [isGyroActive, setIsGyroActive] = useState(false);
  const targetRef = useRef({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  const animFrameRef = useRef<number | null>(null);

  // Smooth interpolation loop
  useEffect(() => {
    const loop = () => {
      setTilt((prev) => {
        const dx = targetRef.current.rotateX - prev.rotateX;
        const dy = targetRef.current.rotateY - prev.rotateY;
        const gx = targetRef.current.glareX - prev.glareX;
        const gy = targetRef.current.glareY - prev.glareY;

        // If very close, avoid unnecessary renders
        if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05 && Math.abs(gx) < 0.1 && Math.abs(gy) < 0.1) {
          return prev;
        }

        return {
          rotateX: prev.rotateX + dx * 0.14,
          rotateY: prev.rotateY + dy * 0.14,
          glareX: prev.glareX + gx * 0.14,
          glareY: prev.glareY + gy * 0.14,
        };
      });
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Device orientation (mobile / tablet gyroscope)
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      setIsGyroActive(true);

      // Clamp gamma (-45 to +45) -> rotateY
      const clampedGamma = Math.max(-45, Math.min(45, e.gamma));
      // Clamp beta (20 to 70 holding angle) -> rotateX
      const baseBeta = 45;
      const diffBeta = Math.max(-35, Math.min(35, e.beta - baseBeta));

      const rotY = (clampedGamma / 45) * intensity;
      const rotX = (-diffBeta / 35) * intensity;

      const gX = 50 + (clampedGamma / 45) * 45;
      const gY = 50 + (diffBeta / 35) * 45;

      targetRef.current = {
        rotateX: rotX,
        rotateY: rotY,
        glareX: Math.max(5, Math.min(95, gX)),
        glareY: Math.max(5, Math.min(95, gY)),
      };
    };

    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      }
    };
  }, [intensity]);

  // Pointer move handler for desktop / direct touch
  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left; // x position within the element
      const y = e.clientY - rect.top;  // y position within the element

      const normX = (x / rect.width) * 2 - 1; // -1 to +1
      const normY = (y / rect.height) * 2 - 1; // -1 to +1

      const rotY = normX * intensity;
      const rotX = -normY * intensity;

      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;

      targetRef.current = {
        rotateX: rotX,
        rotateY: rotY,
        glareX,
        glareY,
      };
    },
    [intensity]
  );

  const onPointerLeave = useCallback(() => {
    if (!isGyroActive) {
      targetRef.current = {
        rotateX: 0,
        rotateY: 0,
        glareX: 50,
        glareY: 50,
      };
    }
  }, [isGyroActive]);

  return {
    rotateX: tilt.rotateX,
    rotateY: tilt.rotateY,
    glareX: tilt.glareX,
    glareY: tilt.glareY,
    isGyroActive,
    onPointerMove,
    onPointerLeave,
  };
}
