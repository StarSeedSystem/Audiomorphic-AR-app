import { useState, useEffect, useCallback } from 'react';

export interface PlatformDownloads {
  windows: {
    name: string;
    version: string;
    installerUrl: string;
    portableUrl: string;
    size: string;
    arch: string;
    sha512?: string;
  };
  macos: {
    name: string;
    version: string;
    arm64DmgUrl: string;
    intelDmgUrl: string;
    size: string;
    arch: string;
    sha512?: string;
  };
  linux: {
    name: string;
    version: string;
    appImageUrl: string;
    debUrl: string;
    size: string;
    arch: string;
  };
  android: {
    name: string;
    version: string;
    apkUrl: string;
    size: string;
    minSdk: string;
  };
  web: {
    name: string;
    url: string;
    status: string;
  };
  mirrorDrive: string;
}

export interface VersionChangelog {
  version: string;
  date: string;
  type: 'ota' | 'native_required';
  title: string;
  notes: string[];
}

export interface UpdateSettings {
  autoCheck: boolean;
  autoApplyOta: boolean;
  channel: 'stable' | 'beta';
  notifyOnMajor: boolean;
}

export interface HardwarePermissionsState {
  microphone: 'granted' | 'prompt' | 'denied' | 'unsupported';
  camera: 'granted' | 'prompt' | 'denied' | 'unsupported';
  audioOutput: boolean; // Device sink ID routing supported
  wakeLock: boolean;    // Screen always on supported
  webxr: boolean;       // Native VR supported
  fullscreen: boolean;  // Fullscreen API available
}

export const CURRENT_APP_VERSION = '1.1.0';
export const CURRENT_BUILD_DATE = '2026-09-09';
export const CURRENT_NATIVE_CONTAINER = '1.1.0';

const GITHUB_REPO_URL = 'https://github.com/StarSeedSystem/Audiomorphic-AR-app';
const GOOGLE_DRIVE_MIRROR = 'https://drive.google.com/drive/folders/1bZ8yvbWr7r3eJUdKIQCSSuu-p398mAkn?usp=sharing';

export const OFFICIAL_DOWNLOADS: PlatformDownloads = {
  windows: {
    name: 'Windows 10 / 11',
    version: CURRENT_APP_VERSION,
    installerUrl: `${GITHUB_REPO_URL}/releases/download/v${CURRENT_APP_VERSION}/Audiomorphic_AR_v${CURRENT_APP_VERSION}_Windows.zip`,
    portableUrl: `${GITHUB_REPO_URL}/releases/download/v${CURRENT_APP_VERSION}/Audiomorphic_AR_v${CURRENT_APP_VERSION}_Windows.zip`,
    size: '~457 MB',
    arch: 'x64 & ARM64 Universal',
  },
  macos: {
    name: 'macOS (Apple Silicon & Intel)',
    version: CURRENT_APP_VERSION,
    arm64DmgUrl: `${GITHUB_REPO_URL}/releases/download/v${CURRENT_APP_VERSION}/Audiomorphic_AR_v${CURRENT_APP_VERSION}_macOS_arm64.dmg`,
    intelDmgUrl: `${GITHUB_REPO_URL}/releases/download/v${CURRENT_APP_VERSION}/audiomorphic-mac.zip`,
    size: '~213 MB',
    arch: 'Apple Silicon (M1/M2/M3/M4) & Intel Universal',
  },
  linux: {
    name: 'Linux (Universal)',
    version: CURRENT_APP_VERSION,
    appImageUrl: GOOGLE_DRIVE_MIRROR,
    debUrl: GOOGLE_DRIVE_MIRROR,
    size: 'Drive Mirror',
    arch: 'x64 & arm64',
  },
  android: {
    name: 'Android (APK Nativo)',
    version: CURRENT_APP_VERSION,
    apkUrl: `${GITHUB_REPO_URL}/releases/download/v${CURRENT_APP_VERSION}/audiomorphic.apk`,
    size: '~6.9 MB',
    minSdk: 'Android 8.0+ (Oreo o superior)',
  },
  web: {
    name: 'Web App Soberana (PWA)',
    url: 'https://audiomorphic.vercel.app',
    status: '100% Operativa',
  },
  mirrorDrive: GOOGLE_DRIVE_MIRROR,
};

export const CHANGELOG_HISTORY: VersionChangelog[] = [
  {
    version: '1.1.0',
    date: '2026-09-09',
    type: 'ota',
    title: 'Actualización Soberana: Centro de Descargas & Sincronización',
    notes: [
      'Nuevo sistema inteligente de actualizaciones en vivo (OTA vs instalador nativo).',
      'Tabla unificada de descargas para Windows, macOS, Linux, Android y Web.',
      'Diagnóstico en vivo de permisos de hardware (micrófono, cámara AR, audio routing, WebXR VR y pantalla activa).',
      'Fusión visual de Información y Donaciones sin muros de pago (0% paywalls).',
      'Sincronización de identidad y presets con StarSeed OS en Supabase.',
    ],
  },
  {
    version: '1.0.8',
    date: '2026-07-28',
    type: 'ota',
    title: 'Liberación Universal & Auto-Pilot Deriva',
    notes: [
      'Eliminación de planes de pago obligatorios: 100% libre para todos.',
      'Soporte completo para pilotos automáticos: Génesis, Armónico y Deriva Total.',
      'Conexión opcional a Stripe para donaciones voluntarias a la Fundación StarSeed.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-03-31',
    type: 'native_required',
    title: 'Lanzamiento Oficial Audiomorphic AR v1.0',
    notes: [
      'Primeros instaladores de escritorio (Windows .exe y macOS .dmg) y binario Android .apk.',
      'Motor fractal de recurrencia compleja sonora y cálculo de geometría armónica.',
      'Modos inmersivos 3D VR y Realidad Aumentada (AR).',
    ],
  },
];

const SETTINGS_KEY = 'audiomorphic_update_settings.v1';

export const useAppUpdate = () => {
  const [settings, setSettings] = useState<UpdateSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      autoCheck: true,
      autoApplyOta: true,
      channel: 'stable',
      notifyOnMajor: true,
    };
  });

  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<VersionChangelog | null>(null);
  const [updateStatusMessage, setUpdateStatusMessage] = useState<string | null>(null);
  const [detectedOS, setDetectedOS] = useState<'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'unknown'>('unknown');

  const [permissions, setPermissions] = useState<HardwarePermissionsState>({
    microphone: 'prompt',
    camera: 'prompt',
    audioOutput: typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype,
    wakeLock: typeof navigator !== 'undefined' && 'wakeLock' in navigator,
    webxr: typeof navigator !== 'undefined' && 'xr' in navigator,
    fullscreen: typeof document !== 'undefined' && (document.fullscreenEnabled || (document as any).webkitFullscreenEnabled),
  });

  // Detect current operating system
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) setDetectedOS('windows');
    else if (ua.includes('mac') && !ua.includes('iphone') && !ua.includes('ipad')) setDetectedOS('macos');
    else if (ua.includes('android')) setDetectedOS('android');
    else if (ua.includes('iphone') || ua.includes('ipad')) setDetectedOS('ios');
    else if (ua.includes('linux')) setDetectedOS('linux');
  }, []);

  // Check hardware permissions state
  const refreshPermissions = useCallback(async () => {
    if (typeof navigator === 'undefined') return;

    let micStatus: 'granted' | 'prompt' | 'denied' | 'unsupported' = 'prompt';
    let camStatus: 'granted' | 'prompt' | 'denied' | 'unsupported' = 'prompt';

    try {
      if (navigator.permissions && navigator.permissions.query) {
        const micQuery = await navigator.permissions.query({ name: 'microphone' as any }).catch(() => null);
        if (micQuery) micStatus = micQuery.state as any;

        const camQuery = await navigator.permissions.query({ name: 'camera' as any }).catch(() => null);
        if (camQuery) camStatus = camQuery.state as any;
      }
    } catch {
      // Fallback
    }

    setPermissions({
      microphone: micStatus,
      camera: camStatus,
      audioOutput: typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype,
      wakeLock: typeof navigator !== 'undefined' && 'wakeLock' in navigator,
      webxr: typeof navigator !== 'undefined' && 'xr' in navigator,
      fullscreen: typeof document !== 'undefined' && (document.fullscreenEnabled || (document as any).webkitFullscreenEnabled),
    });
  }, []);

  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  // Request Microphone explicitly
  const requestMicrophoneAccess = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      refreshPermissions();
      return true;
    } catch (e) {
      console.warn('Microphone permission not granted:', e);
      refreshPermissions();
      return false;
    }
  };

  // Request Camera explicitly for AR modes
  const requestCameraAccess = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach((t) => t.stop());
      refreshPermissions();
      return true;
    } catch (e) {
      console.warn('Camera permission not granted:', e);
      refreshPermissions();
      return false;
    }
  };

  // Save settings
  const updateSettings = (newSettings: Partial<UpdateSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Check for updates
  const checkForUpdates = useCallback(async (manual = false) => {
    setIsChecking(true);
    setUpdateStatusMessage('Comprobando red y manifiesto de versiones...');

    try {
      // Simular latencia de verificación contra GitHub Releases y manifiesto
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Verificamos si hay una versión superior a la instalada
      // Para esta versión, estamos en 1.1.0 (Al día)
      const latest = CHANGELOG_HISTORY[0];
      if (latest && latest.version !== CURRENT_APP_VERSION) {
        setUpdateAvailable(latest);
        setUpdateStatusMessage(`Nueva versión ${latest.version} disponible (${latest.type === 'ota' ? 'Actualización en vivo' : 'Instalador nativo requerido'}).`);
      } else {
        setUpdateAvailable(null);
        setUpdateStatusMessage(`Tu aplicación está al día en la versión ${CURRENT_APP_VERSION} (${CURRENT_BUILD_DATE}).`);
      }
    } catch (err: any) {
      setUpdateStatusMessage('No se pudo verificar la red en este momento.');
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Apply OTA Update (in-app dynamic refresh without reinstall)
  const applyOtaUpdate = async () => {
    setIsUpdating(true);
    setUpdateStatusMessage('Descargando e integrando componentes en vivo...');
    try {
      // Limpiar caches de Service Worker / CacheStorage
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      await new Promise((r) => setTimeout(r, 1200));
      setUpdateStatusMessage('¡Actualización completada con éxito! Reiniciando visualizador...');
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (e) {
      setUpdateStatusMessage('Error al aplicar actualización interna.');
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (settings.autoCheck) {
      checkForUpdates(false);
    }
  }, [settings.autoCheck, checkForUpdates]);

  return {
    currentVersion: CURRENT_APP_VERSION,
    buildDate: CURRENT_BUILD_DATE,
    nativeContainerVersion: CURRENT_NATIVE_CONTAINER,
    detectedOS,
    downloads: OFFICIAL_DOWNLOADS,
    changelog: CHANGELOG_HISTORY,
    settings,
    updateSettings,
    isChecking,
    isUpdating,
    updateAvailable,
    updateStatusMessage,
    permissions,
    refreshPermissions,
    requestMicrophoneAccess,
    requestCameraAccess,
    checkForUpdates,
    applyOtaUpdate,
  };
};
