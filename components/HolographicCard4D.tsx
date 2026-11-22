import React, { useEffect, useMemo, useRef, useState, Component, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  Camera,
  CameraOff,
  Compass,
  ExternalLink,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Check,
  Volume2,
} from 'lucide-react';
import { ThankYouCardRecord } from '../lib/starseedDb';
import { resolveCardDesign } from '../lib/starseedCards';
import { useAmbientCameraLight, type AmbientCameraLightState } from '../hooks/useAmbientCameraLight';
import StarSeedSymbol from './StarSeedSymbol';

interface HolographicCard4DProps {
  card: ThankYouCardRecord;
  audioLevel?: number;
  audioBass?: number;
  compact?: boolean;
  onOpenPortable?: () => void;
  extraToolbarSlot?: ReactNode;
}

class CardWebGLErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  public declare props: { fallback: ReactNode; children: ReactNode };
  public state: { hasError: boolean } = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

/**
 * Genera un entorno de estudio espectral 100% offline usando PMREMGenerator
 * para reflejos metálicos, obsidiana y películas delgadas tornasol sin red externa.
 */
const IridescentStudioEnvironment: React.FC<{
  ambientHex: string;
  cameraActive: boolean;
}> = ({ ambientHex, cameraActive }) => {
  const { gl, scene } = useThree();
  const envTexRef = useRef<THREE.Texture | null>(null);

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.18;

    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();

    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color('#040712');

    const strips: Array<{
      pos: [number, number, number];
      scale: [number, number, number];
      color: string;
      intensity: number;
    }> = [
      { pos: [-4.5, 4.2, 4.0], scale: [4.2, 1.6, 0.2], color: '#fde68a', intensity: 3.4 },
      { pos: [4.5, 3.8, 4.2], scale: [2.8, 3.6, 0.2], color: '#ffffff', intensity: 4.4 },
      { pos: [5.0, -1.2, 2.8], scale: [1.6, 5.2, 0.2], color: '#22d3ee', intensity: 3.2 },
      { pos: [-5.0, -1.5, 2.5], scale: [1.6, 5.0, 0.2], color: '#e879f9', intensity: 3.0 },
      { pos: [0.0, -5.2, 2.2], scale: [5.5, 1.4, 0.2], color: '#34d399', intensity: 2.0 },
      { pos: [0.0, 4.5, -4.5], scale: [5.0, 2.2, 0.2], color: cameraActive ? ambientHex : '#818cf8', intensity: 3.1 },
    ];

    const disposables: Array<{ dispose: () => void }> = [];
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    disposables.push(boxGeo);

    for (const s of strips) {
      const col = new THREE.Color(s.color).multiplyScalar(s.intensity);
      const mat = new THREE.MeshBasicMaterial({ color: col });
      disposables.push(mat);
      const mesh = new THREE.Mesh(boxGeo, mat);
      mesh.position.set(...s.pos);
      mesh.scale.set(...s.scale);
      mesh.lookAt(0, 0, 0);
      envScene.add(mesh);
    }

    const rt = pmrem.fromScene(envScene, 0.035);
    envTexRef.current = rt.texture;
    scene.environment = rt.texture;

    return () => {
      if (scene.environment === rt.texture) {
        scene.environment = null;
      }
      rt.dispose();
      pmrem.dispose();
      disposables.forEach((d) => d.dispose());
    };
  }, [gl, scene, ambientHex, cameraActive]);

  return null;
};

interface ParticleLayerProps {
  cameraLight: AmbientCameraLightState;
  audioLevel: number;
  tiltRef: React.MutableRefObject<{ x: number; y: number }>;
  palette: { primary: string; secondary: string; accent: string };
}

const AtmosphericMotes4D: React.FC<ParticleLayerProps> = ({ cameraLight, audioLevel, tiltRef, palette }) => {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, basePositions } = useMemo(() => {
    const count = 140;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const paletteCols = [
      new THREE.Color(palette.primary),
      new THREE.Color(palette.secondary),
      new THREE.Color(palette.accent),
      new THREE.Color('#fef08a'),
      new THREE.Color('#22d3ee'),
    ];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 12;
      const radius = 0.22 + ((i * 37) % 100) * 0.0055;
      pos[i * 3] = Math.cos(angle) * radius * 0.85;
      pos[i * 3 + 1] = Math.sin(angle) * radius * 1.15;
      pos[i * 3 + 2] = -0.32 + ((i * 53) % 100) * 0.0046;
      const c = paletteCols[i % paletteCols.length];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return { geometry: geo, basePositions: pos.slice() };
  }, [palette.primary, palette.secondary, palette.accent]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  useFrame((state) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const t = state.clock.getElapsedTime();
    const attr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const count = arr.length / 3;
    const pulse = 1 + audioLevel * 0.16;

    for (let i = 0; i < count; i++) {
      const bx = basePositions[i * 3];
      const by = basePositions[i * 3 + 1];
      const bz = basePositions[i * 3 + 2];
      arr[i * 3] = bx * pulse + Math.sin(t * 0.65 + i * 0.37) * 0.015 - tiltRef.current.y * 0.08;
      arr[i * 3 + 1] = by * pulse + Math.cos(t * 0.55 + i * 0.29) * 0.015 + tiltRef.current.x * 0.08;
      arr[i * 3 + 2] = bz + Math.sin(t * 0.8 + i) * 0.018;
    }
    attr.needsUpdate = true;

    const mat = pts.material as THREE.PointsMaterial;
    if (cameraLight.active) {
      mat.color.lerp(new THREE.Color(cameraLight.ambientHex), 0.12);
      mat.opacity = 0.45 + cameraLight.luminance * 0.35;
    } else {
      mat.color.lerp(new THREE.Color('#ffffff'), 0.08);
      mat.opacity = 0.55 + audioLevel * 0.35;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.014}
        vertexColors
        transparent
        opacity={0.65}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

interface CardSceneContentProps {
  modelUrl: string;
  palette: { primary: string; secondary: string; accent: string };
  isFlipped: boolean;
  targetTiltRef: React.MutableRefObject<{ x: number; y: number }>;
  cameraLight: AmbientCameraLightState;
  audioLevel: number;
  audioBass: number;
  onModelLoaded: () => void;
  onModelError: () => void;
}

const CardSceneContent: React.FC<CardSceneContentProps> = ({
  modelUrl,
  palette,
  isFlipped,
  targetTiltRef,
  cameraLight,
  audioLevel,
  audioBass,
  onModelLoaded,
  onModelError,
}) => {
  const cardGroupRef = useRef<THREE.Group>(null);
  const modelRootRef = useRef<THREE.Group | null>(null);
  const flowerLayerRef = useRef<THREE.Object3D | null>(null);
  const sacredLayerRef = useRef<THREE.Object3D | null>(null);
  const outerOrbitRef = useRef<THREE.Object3D | null>(null);
  const innerChamberRef = useRef<THREE.Object3D | null>(null);
  const prismMatsRef = useRef<THREE.MeshPhysicalMaterial[]>([]);
  const iridMatsRef = useRef<THREE.MeshPhysicalMaterial[]>([]);

  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const rimLightRef = useRef<THREE.PointLight>(null);
  const fillLightRef = useRef<THREE.PointLight>(null);

  const smoothTiltRef = useRef({ x: 0, y: 0, flipY: 0 });
  const loadedCbRef = useRef(onModelLoaded);
  loadedCbRef.current = onModelLoaded;
  const errCbRef = useRef(onModelError);
  errCbRef.current = onModelError;

  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();
    flowerLayerRef.current = null;
    sacredLayerRef.current = null;
    outerOrbitRef.current = null;
    innerChamberRef.current = null;

    loader.load(
      modelUrl,
      (gltf) => {
        if (cancelled) return;
        const root = gltf.scene;

        // Centrar pivote 3D exactamente en el origen
        const box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        root.position.sub(center);

        const prisms: THREE.MeshPhysicalMaterial[] = [];
        const irids: THREE.MeshPhysicalMaterial[] = [];

        root.traverse((obj) => {
          if (obj.name.includes('FlowerOfLifeLayer')) {
            flowerLayerRef.current = obj;
          } else if (obj.name.includes('SacredGeometry4D')) {
            sacredLayerRef.current = obj;
          } else if (obj.name.includes('OuterOrbit4D')) {
            outerOrbitRef.current = obj;
          } else if (obj.name.includes('InnerChamber4D')) {
            innerChamberRef.current = obj;
          }

          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => {
              if (!m) return;
              const phys = m as THREE.MeshPhysicalMaterial;
              if ('envMapIntensity' in phys) {
                phys.envMapIntensity = 1.65;
              }
              if (
                obj.name.includes('UpperTrinity') ||
                obj.name.includes('LowerTrinity') ||
                obj.name.includes('EyeCatchlight') ||
                obj.name.includes('CircuitRing') ||
                obj.name.includes('OuterOrbit4D') ||
                obj.name.includes('SacredGeometry4D')
              ) {
                prisms.push(phys);
              }
              if (
                obj.name.includes('IridescentRim') ||
                obj.name.includes('InnerChamber4D') ||
                obj.name.includes('VesicaLower') ||
                obj.name.includes('Crystal')
              ) {
                if (typeof phys.iridescence === 'number') {
                  phys.iridescence = Math.max(phys.iridescence, 0.95);
                  phys.iridescenceIOR = phys.iridescenceIOR || 1.48;
                  phys.iridescenceThicknessRange = [340, 640];
                }
                irids.push(phys);
              }
            });
          }
        });

        prismMatsRef.current = prisms;
        iridMatsRef.current = irids;
        modelRootRef.current = root;

        if (cardGroupRef.current) {
          cardGroupRef.current.clear();
          cardGroupRef.current.add(root);
        }
        loadedCbRef.current();
      },
      undefined,
      () => {
        if (!cancelled) errCbRef.current();
      }
    );

    return () => {
      cancelled = true;
      if (modelRootRef.current) {
        modelRootRef.current.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            mesh.geometry?.dispose();
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => m?.dispose());
          }
        });
      }
    };
  }, [modelUrl]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const s = smoothTiltRef.current;

    // Resorte suave de inclinación + giro 180° frente/reverso + flotación orgánica
    const goalX = targetTiltRef.current.x + Math.sin(t * 0.85) * 0.045;
    const goalY = targetTiltRef.current.y + Math.cos(t * 0.65) * 0.06;
    const goalFlip = isFlipped ? Math.PI : 0;

    s.x += (goalX - s.x) * 0.11;
    s.y += (goalY - s.y) * 0.11;
    s.flipY += (goalFlip - s.flipY) * 0.10;

    if (cardGroupRef.current) {
      cardGroupRef.current.rotation.x = s.x;
      cardGroupRef.current.rotation.y = s.y + s.flipY;
      cardGroupRef.current.position.y = Math.sin(t * 1.15) * 0.012;
    }

    // Paralaje 4D interno de las capas de geometría sagrada
    if (flowerLayerRef.current) {
      flowerLayerRef.current.rotation.z = t * 0.05;
      flowerLayerRef.current.position.x = -s.y * 0.014;
      flowerLayerRef.current.position.y = s.x * 0.014;
    }
    if (sacredLayerRef.current) {
      sacredLayerRef.current.rotation.z = t * 0.085;
      sacredLayerRef.current.position.x = -s.y * 0.016;
      sacredLayerRef.current.position.y = s.x * 0.016;
      const sc = 1 + audioLevel * 0.02;
      sacredLayerRef.current.scale.set(sc, sc, 1);
    }
    if (outerOrbitRef.current) {
      outerOrbitRef.current.rotation.z = -t * 0.06;
      outerOrbitRef.current.position.x = -s.y * 0.020;
      outerOrbitRef.current.position.y = s.x * 0.020;
      const scOrbit = 1 + audioBass * 0.025;
      outerOrbitRef.current.scale.set(scOrbit, scOrbit, 1);
    }
    if (innerChamberRef.current) {
      innerChamberRef.current.position.x = -s.y * 0.008;
      innerChamberRef.current.position.y = s.x * 0.008;
    }

    // Reactividad luminosa de cámara real vs espectro autónomo/sonoro
    const dynHue = cameraLight.active ? cameraLight.dominantHue : (t * 28) % 360;
    const shiftMin = 310 + Math.sin((dynHue * Math.PI) / 180) * 65 + Math.abs(s.y) * 45;
    const shiftMax = 560 + Math.cos((dynHue * Math.PI) / 180) * 90 + Math.abs(s.x) * 60;

    for (const mat of iridMatsRef.current) {
      if (mat.iridescenceThicknessRange) {
        mat.iridescenceThicknessRange = [shiftMin, shiftMax];
      }
      if ('envMapIntensity' in mat) {
        mat.envMapIntensity = cameraLight.active
          ? 1.15 + cameraLight.luminance * 0.95
          : 1.45 + audioLevel * 0.45;
      }
    }

    for (const mat of prismMatsRef.current) {
      if ('emissiveIntensity' in mat) {
        mat.emissiveIntensity = 1.25 + audioLevel * 1.35 + audioBass * 0.65 + Math.sin(t * 2.2) * 0.12;
      }
    }

    if (keyLightRef.current) {
      if (cameraLight.active) {
        keyLightRef.current.position.set(
          cameraLight.lightX * 3.4,
          1.2 + cameraLight.lightY * 2.6,
          2.8
        );
        keyLightRef.current.color.lerp(new THREE.Color(cameraLight.ambientHex), 0.16);
        keyLightRef.current.intensity = 1.4 + cameraLight.luminance * 1.8;
      } else {
        keyLightRef.current.position.set(-1.6 + Math.sin(t * 0.5) * 0.6, 1.8, 2.8);
        keyLightRef.current.color.lerp(new THREE.Color('#fff4d6'), 0.08);
        keyLightRef.current.intensity = 2.1 + audioLevel * 0.5;
      }
    }

    if (rimLightRef.current) {
      const rimColor = cameraLight.active
        ? new THREE.Color(cameraLight.ambientHex)
        : new THREE.Color().setHSL(((dynHue + 180) % 360) / 360, 0.88, 0.62);
      rimLightRef.current.color.lerp(rimColor, 0.12);
      rimLightRef.current.intensity = cameraLight.active
        ? 1.8 + cameraLight.luminance * 1.6
        : 2.2 + audioLevel * 1.4;
    }

    if (fillLightRef.current) {
      const fillColor = new THREE.Color().setHSL(((dynHue + 60) % 360) / 360, 0.85, 0.58);
      fillLightRef.current.color.lerp(fillColor, 0.1);
      fillLightRef.current.intensity = 1.4 + audioBass * 1.1;
    }
  });

  return (
    <>
      <IridescentStudioEnvironment
        ambientHex={cameraLight.ambientHex}
        cameraActive={cameraLight.active}
      />
      <ambientLight intensity={cameraLight.active ? 0.28 + cameraLight.luminance * 0.35 : 0.36} />
      <directionalLight ref={keyLightRef} position={[-1.6, 1.8, 2.8]} intensity={2.1} />
      <pointLight ref={rimLightRef} position={[2.2, 0.8, 1.6]} intensity={2.2} color="#22d3ee" />
      <pointLight ref={fillLightRef} position={[-2.1, -1.2, 1.5]} intensity={1.4} color="#e879f9" />
      <pointLight position={[0.2, 0.4, -2.5]} intensity={1.9} color="#fbbf24" />

      <AtmosphericMotes4D
        cameraLight={cameraLight}
        audioLevel={audioLevel}
        tiltRef={smoothTiltRef}
        palette={palette}
      />

      <group ref={cardGroupRef} scale={[1.28, 1.28, 1.28]} />
    </>
  );
};

export const HolographicCard4D: React.FC<HolographicCard4DProps> = ({
  card,
  audioLevel = 0.22,
  audioBass = 0.18,
  compact = false,
  onOpenPortable,
  extraToolbarSlot,
}) => {
  const { design, serialLabel, fingerprint, portableModelUrl } = useMemo(
    () => resolveCardDesign(card),
    [card]
  );

  const cameraLight = useAmbientCameraLight();
  const [isFlipped, setIsFlipped] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [modelFailed, setModelFailed] = useState(false);

  useEffect(() => {
    setModelReady(false);
    setModelFailed(false);
  }, [portableModelUrl]);
  const [gyroActive, setGyroActive] = useState(false);
  const [needsGyroPerm, setNeedsGyroPerm] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const targetTiltRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStateRef = useRef<{ dragging: boolean; lastX: number; lastY: number; rotX: number; rotY: number }>({
    dragging: false,
    lastX: 0,
    lastY: 0,
    rotX: 0,
    rotY: 0,
  });

  // Giroscopio móvil nativo (con permiso explícito para iOS Safari)
  useEffect(() => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return;

    const reqPerm = (window.DeviceOrientationEvent as any)?.requestPermission;
    if (typeof reqPerm === 'function') {
      setNeedsGyroPerm(true);
      return;
    }

    let baseBeta: number | null = null;
    let baseGamma: number | null = null;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null || !Number.isFinite(e.beta) || !Number.isFinite(e.gamma)) return;
      setGyroActive(true);
      if (baseBeta === null || baseGamma === null) {
        baseBeta = e.beta;
        baseGamma = e.gamma;
      } else {
        baseBeta += (e.beta - baseBeta) * 0.01;
        baseGamma += (e.gamma - baseGamma) * 0.01;
      }
      const rx = Math.max(-0.55, Math.min(0.55, -((e.beta - baseBeta) / 35) * 0.45));
      const ry = Math.max(-0.65, Math.min(0.65, ((e.gamma - baseGamma) / 35) * 0.55));
      if (!dragStateRef.current.dragging) {
        targetTiltRef.current = { x: rx, y: ry };
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => window.removeEventListener('deviceorientation', handleOrientation, true);
  }, []);

  const handleRequestGyro = async () => {
    const reqPerm = (window.DeviceOrientationEvent as any)?.requestPermission;
    if (typeof reqPerm !== 'function') return;
    try {
      const res = await reqPerm();
      if (res === 'granted') {
        setNeedsGyroPerm(false);
        setGyroActive(true);
        const onOrient = (e: DeviceOrientationEvent) => {
          if (e.beta === null || e.gamma === null) return;
          const rx = Math.max(-0.55, Math.min(0.55, -((e.beta - 45) / 35) * 0.42));
          const ry = Math.max(-0.65, Math.min(0.65, (e.gamma / 35) * 0.52));
          if (!dragStateRef.current.dragging) {
            targetTiltRef.current = { x: rx, y: ry };
          }
        };
        window.addEventListener('deviceorientation', onOrient, true);
      }
    } catch {
      /* permiso denegado */
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragStateRef.current;
    if (d.dragging) {
      const dx = e.clientX - d.lastX;
      const dy = e.clientY - d.lastY;
      d.lastX = e.clientX;
      d.lastY = e.clientY;
      d.rotY = Math.max(-0.95, Math.min(0.95, d.rotY + dx * 0.008));
      d.rotX = Math.max(-0.75, Math.min(0.75, d.rotX + dy * 0.008));
      targetTiltRef.current = { x: d.rotX, y: d.rotY };
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    targetTiltRef.current = {
      x: Math.max(-0.42, Math.min(0.42, ny * 0.34)),
      y: Math.max(-0.48, Math.min(0.48, nx * 0.40)),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStateRef.current.dragging = true;
    dragStateRef.current.lastX = e.clientX;
    dragStateRef.current.lastY = e.clientY;
    dragStateRef.current.rotX = targetTiltRef.current.x;
    dragStateRef.current.rotY = targetTiltRef.current.y;
  };

  const handlePointerUp = () => {
    dragStateRef.current.dragging = false;
  };

  const handlePointerLeave = () => {
    dragStateRef.current.dragging = false;
    if (!gyroActive) {
      targetTiltRef.current = { x: 0, y: 0 };
    }
  };

  const handleSharePortable = async () => {
    if (onOpenPortable) {
      onOpenPortable();
      return;
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('card', design.designId);
      url.searchParams.set('donor', card.donorName || 'Pionero StarSeed');
      url.searchParams.set('serial', serialLabel);
      url.hash = '';
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url.toString());
        setCopiedLink(true);
        window.setTimeout(() => setCopiedLink(false), 2400);
      }
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
    } catch {
      /* ignore */
    }
  };

  const fallbackUI = (
    <div className="w-full h-full rounded-[26px] art-nouveau-frame p-6 flex flex-col items-center justify-between text-center">
      <div className="text-[11px] font-mono uppercase tracking-widest morph-accent-text">
        {design.editionTitle} · {serialLabel}
      </div>
      <div className="my-auto flex flex-col items-center gap-3">
        <StarSeedSymbol size="lg" glow />
        <h3 className="text-xl font-extrabold starseed-text-gradient">{design.title}</h3>
        <p className="text-xs text-slate-300 max-w-xs">{card.donorName}</p>
      </div>
      <div className="text-[10px] font-mono text-slate-400">{fingerprint}</div>
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center gap-3 select-none">
      {/* Stage 3D/4D */}
      <div
        className={`relative w-full ${
          compact ? 'max-w-[360px] h-[420px]' : 'max-w-[440px] h-[510px] sm:h-[550px]'
        } rounded-[28px] overflow-hidden art-nouveau-frame cursor-grab active:cursor-grabbing touch-none`}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        {/* Aura ambiental viva reactiva a luz de cámara o espectro sonoro */}
        <div
          className="absolute inset-0 pointer-events-none transition-colors duration-300"
          style={{
            background: cameraLight.active
              ? `radial-gradient(circle at ${50 + cameraLight.lightX * 35}% ${50 - cameraLight.lightY * 35}%, ${cameraLight.ambientHex}33 0%, rgba(4,7,18,0.92) 72%)`
              : 'radial-gradient(circle at 50% 35%, hsla(var(--morph-hue-1) 88% 58% / 0.16) 0%, hsla(var(--morph-hue-2) 84% 55% / 0.12) 45%, rgba(4,7,18,0.94) 85%)',
          }}
        />

        {!modelFailed ? (
          <CardWebGLErrorBoundary fallback={fallbackUI}>
            <Canvas
              dpr={[1, 2]}
              camera={{ position: [0, 0, 1.56], fov: 42, near: 0.05, far: 40 }}
              gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
            >
              <CardSceneContent
                modelUrl={portableModelUrl}
                palette={design.palette}
                isFlipped={isFlipped}
                targetTiltRef={targetTiltRef}
                cameraLight={cameraLight}
                audioLevel={audioLevel}
                audioBass={audioBass}
                onModelLoaded={() => setModelReady(true)}
                onModelError={() => setModelFailed(true)}
              />
            </Canvas>
          </CardWebGLErrorBoundary>
        ) : (
          fallbackUI
        )}

        {/* Loading indicator */}
        {!modelReady && !modelFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none bg-black/50">
            <StarSeedSymbol size="md" glow />
            <span className="text-[11px] font-mono text-cyan-200 animate-pulse">
              Cargando Escultura 4D Blender...
            </span>
          </div>
        )}

        {/* Badges superiores discretos */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none z-10">
          <span className="px-2.5 py-1 rounded-full bg-black/65 border border-amber-400/40 text-[10px] font-mono font-bold text-amber-200 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-300" />
            {serialLabel} · PIONEROS
          </span>
          <span className="px-2.5 py-1 rounded-full bg-black/65 border border-cyan-400/40 text-[10px] font-mono text-cyan-200 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            {card.donorName}
          </span>
        </div>

        {/* Sello inferior de autenticidad e interacción */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none z-10 text-[10px] font-mono">
          <span className="px-2 py-0.5 rounded-full bg-black/65 border border-white/15 text-slate-300 truncate">
            {design.title}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-black/65 border border-white/15 text-cyan-200/90 flex items-center gap-1 shrink-0">
            {cameraLight.active && (
              <span
                className="w-2 h-2 rounded-full border border-white/60"
                style={{ backgroundColor: cameraLight.ambientHex }}
              />
            )}
            <span>{gyroActive ? 'Gyro 4D' : 'Arrastra 3D'}</span>
          </span>
        </div>
      </div>

      {/* Controles 4D interactivos */}
      <div className="flex flex-wrap items-center justify-center gap-2 w-full max-w-[440px]">
        <button
          type="button"
          onClick={() => setIsFlipped((v) => !v)}
          className="px-3 py-1.5 rounded-full morph-btn-glass text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          title="Voltear tarjeta para ver el sello del reverso"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isFlipped ? 'text-amber-300' : 'text-cyan-300'}`} />
          <span>{isFlipped ? 'Ver Frente' : 'Voltear Reverso'}</span>
        </button>

        {cameraLight.supported && (
          <button
            type="button"
            onClick={() => {
              void cameraLight.toggle();
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer border transition-colors ${
              cameraLight.active
                ? 'bg-emerald-500/25 border-emerald-400/60 text-emerald-100'
                : 'morph-btn-glass text-slate-200'
            }`}
            title="Usa el color y dirección de la luz real de tu entorno vía cámara local (100% privado)"
          >
            {cameraLight.active ? (
              <Camera className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <CameraOff className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{cameraLight.active ? 'Luz Cámara Viva' : 'Luz Cámara 4D'}</span>
            {cameraLight.active && (
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/70"
                style={{ backgroundColor: cameraLight.ambientHex }}
              />
            )}
          </button>
        )}

        {needsGyroPerm && (
          <button
            type="button"
            onClick={handleRequestGyro}
            className="px-3 py-1.5 rounded-full morph-btn-glass text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-cyan-200 border-cyan-400/50"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Activar Giroscopio</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleSharePortable}
          className="px-3 py-1.5 rounded-full morph-btn-glass text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          title="Abrir vista portátil independiente (útil en cualquier ventana o vínculo StarSeed OS)"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <ExternalLink className="w-3.5 h-3.5 text-purple-300" />}
          <span>{copiedLink ? 'Enlace Copiado' : 'Vista Portátil'}</span>
        </button>

        {extraToolbarSlot}
      </div>

      {cameraLight.error && (
        <p className="text-[11px] font-mono text-amber-300/90 text-center max-w-sm">
          {cameraLight.error}
        </p>
      )}

      {/* Placa de Autenticidad & Ficha Técnica */}
      <div className="w-full max-w-[440px] rounded-2xl bg-black/50 border border-white/10 p-3 text-[11px] space-y-1.5">
        <div className="flex items-center justify-between text-slate-200 font-semibold">
          <span className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-cyan-300" />
            {design.editionTitle} · #{String(design.cardNumber).padStart(3, '0')}
          </span>
          <span className="font-mono text-amber-300">{card.amount} · {card.tierName}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>{design.phase}</span>
          <span>{fingerprint}</span>
        </div>
      </div>
    </div>
  );
};

export default HolographicCard4D;
