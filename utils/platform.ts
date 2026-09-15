/**
 * platform.ts
 * ---------------------------------------------------------------------------
 * Detección unificada de plataforma para Audiomorphic AR.
 * Permite identificar si la app se está ejecutando en un entorno instalado:
 * - PWA instalada en modo Standalone (iOS / Android / Desktop Chrome/Safari)
 * - Electron Desktop (macOS, Windows, Linux)
 * - Capacitor Mobile (Android APK / iOS)
 */

export const isInstalledApp = (): boolean => {
  if (typeof window === 'undefined') return false;

  // 1. PWA Standalone (display-mode: standalone o fullscreen)
  const isPWA = 
    Boolean(window.matchMedia?.('(display-mode: standalone)').matches) ||
    Boolean(window.matchMedia?.('(display-mode: fullscreen)').matches) ||
    Boolean((window.navigator as any)?.standalone === true);

  // 2. Electron Desktop
  const isElectron = 
    (window as any).electronAPI !== undefined ||
    (typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron'));

  // 3. Capacitor Native (Android / iOS)
  const isCapacitor = 
    Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
    window.location.protocol === 'capacitor:';

  return isPWA || isElectron || isCapacitor;
};

/**
 * Abre URLs externas de manera universal y segura en cualquier entorno:
 * - Electron: a través de IPC shell.openExternal
 * - Capacitor: con el plugin App o _system
 * - Web/PWA: mediante window.open y fallback de etiqueta <a>
 */
export const openExternalUrl = (url: string): void => {
  if (typeof window === 'undefined' || !url) return;

  // 1. Electron Desktop
  try {
    if ((window as any).electronAPI?.openExternal) {
      (window as any).electronAPI.openExternal(url);
      return;
    }
  } catch {}

  // 2. Capacitor Mobile
  try {
    const cap = (window as any).Capacitor;
    if (cap?.Plugins?.App?.openUrl) {
      cap.Plugins.App.openUrl({ url });
      return;
    }
  } catch {}

  // 3. Android WebView / Capacitor fallback usando _system
  try {
    const w = window.open(url, '_system');
    if (w) return;
  } catch {}

  // 4. Navegador web estándar o PWA
  try {
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (w) return;
  } catch {}

  // 5. Fallback DOM click
  try {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    window.location.href = url;
  }
};

/**
 * Construye la URL de StarSeed OS con hand-off seguro de sesión.
 * Si existen tokens JWT válidos de Supabase, los envía en el hash.
 * Si es una sesión soberana o local, envía los parámetros de identidad soberana
 * sin inyectar "undefined" que cause errores de validación de tokens en StarSeed OS.
 */
export const buildStarSeedOsHandoffUrl = (session?: any): string => {
  const baseUrl = 'https://starseed-os.vercel.app/funciones';
  if (!session) {
    return baseUrl;
  }

  // 1. Si existe un token JWT Supabase válido
  const accessToken = session.access_token || session.accessToken;
  const refreshToken = session.refresh_token || session.refreshToken;
  if (accessToken && typeof accessToken === 'string' && accessToken !== 'undefined' && accessToken.length > 20) {
    const hashParams = new URLSearchParams({
      access_token: accessToken,
      refresh_token: refreshToken || '',
      token_type: 'bearer',
      expires_in: '3600',
      type: 'signup',
    });
    return `${baseUrl}#${hashParams.toString()}`;
  }

  // 2. Sesión Soberana / Identidad local StarSeed
  const email = session.email || 'soberano@star.seed';
  const rawHandle = session.handle || `@${email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')}`;
  const handle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;
  const displayName = session.name || session.displayName || email.split('@')[0];

  const searchParams = new URLSearchParams({
    source: 'audiomorphic',
    from: 'audiomorphic-ar',
    sovereign: '1',
    user: email,
    email: email,
    handle: handle,
    name: displayName,
  });

  const hashParams = new URLSearchParams({
    sovereign: 'true',
    email: email,
    handle: handle,
    name: displayName,
    plan: 'lifetime',
  });

  return `${baseUrl}?${searchParams.toString()}#${hashParams.toString()}`;
};

