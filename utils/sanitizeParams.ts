import {
  DEFAULT_PARAMS,
  GeometryInfo,
  SacredGeometryMode,
  SacredGeometrySettings,
  VisualizerParams,
} from '../types';

export function safeNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.isFinite(fallback) ? fallback : 0;
}

export function safeFixed(value: unknown, digits: number, fallback = 0): string {
  const safeDigits = Math.max(0, Math.min(20, Math.floor(safeNumber(digits, 0))));
  return safeNumber(value, fallback).toFixed(safeDigits);
}

function sanitizeSgSettings(
  raw: unknown,
  fallback: SacredGeometrySettings
): SacredGeometrySettings {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    complexity: safeNumber(src.complexity, fallback.complexity),
    connectionSpan: safeNumber(src.connectionSpan, fallback.connectionSpan),
    scale: safeNumber(src.scale, fallback.scale),
    lineOpacity: safeNumber(src.lineOpacity, fallback.lineOpacity),
    bgOpacity: safeNumber(src.bgOpacity, fallback.bgOpacity),
    thickness: safeNumber(src.thickness, fallback.thickness),
    flowSpeed: safeNumber(src.flowSpeed, fallback.flowSpeed),
    audioReactivity: safeNumber(src.audioReactivity, fallback.audioReactivity),
    viscosity: safeNumber(src.viscosity, fallback.viscosity),
    colored: typeof src.colored === 'boolean' ? src.colored : fallback.colored,
    customColor: safeNumber(src.customColor, fallback.customColor),
  };
}

function sanitizeGeometryData(raw: unknown): GeometryInfo | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const gd = raw as Record<string, unknown>;
  const regime =
    gd.regime === 'primary' || gd.regime === 'reciprocal' || gd.regime === 'void'
      ? gd.regime
      : 'primary';
  return {
    V: safeNumber(gd.V, 12),
    E: safeNumber(gd.E, 12),
    alpha: safeNumber(gd.alpha, 6),
    beta: safeNumber(gd.beta, 3.46),
    regime,
    name: typeof gd.name === 'string' && gd.name.trim() !== '' ? gd.name : 'Cromática',
  };
}

const OPTIONAL_TARGET_KEYS = [
  'targetZoom',
  'targetIter',
  'targetDistanceZoom',
  'targetSpiralThickness',
  'targetK',
  'targetPsi',
  'targetZ0_r',
  'targetZ0_i',
  'targetBaseHue',
] as const;

export function sanitizeVisualizerParams(
  raw: unknown,
  base: VisualizerParams = DEFAULT_PARAMS
): VisualizerParams {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const fallbackBase =
    base === DEFAULT_PARAMS ? DEFAULT_PARAMS : sanitizeVisualizerParams(base, DEFAULT_PARAMS);

  const out: Record<string, unknown> = {};

  for (const key of Object.keys(DEFAULT_PARAMS) as Array<keyof VisualizerParams>) {
    if (key === 'sgSettings' || key === 'geometryData') continue;
    const defVal = DEFAULT_PARAMS[key];
    const baseVal = fallbackBase[key];
    const cand = Object.prototype.hasOwnProperty.call(src, key) ? src[key] : baseVal;

    if (typeof defVal === 'number') {
      out[key] = safeNumber(cand, safeNumber(baseVal, defVal));
    } else if (typeof defVal === 'boolean') {
      out[key] = typeof cand === 'boolean' ? cand : typeof baseVal === 'boolean' ? baseVal : defVal;
    } else if (typeof defVal === 'string') {
      out[key] =
        typeof cand === 'string' && cand.trim() !== ''
          ? cand
          : typeof baseVal === 'string' && baseVal.trim() !== ''
          ? baseVal
          : defVal;
    } else if (Array.isArray(defVal)) {
      if (key === 'bgColors') {
        const arr = Array.isArray(cand)
          ? cand.filter((c): c is string => typeof c === 'string' && c.trim() !== '')
          : [];
        const baseArr = Array.isArray(baseVal) ? (baseVal as string[]) : DEFAULT_PARAMS.bgColors;
        out[key] = arr.length >= 2 ? arr : baseArr.length >= 2 ? [...baseArr] : [...DEFAULT_PARAMS.bgColors];
      } else {
        const arr = Array.isArray(cand)
          ? cand.filter((item): item is string => typeof item === 'string')
          : Array.isArray(baseVal)
          ? [...(baseVal as string[])]
          : [];
        out[key] = arr;
      }
    }
  }

  // Deep-sanitize sacred geometry per-mode settings
  const rawSg =
    src.sgSettings && typeof src.sgSettings === 'object'
      ? (src.sgSettings as Record<string, unknown>)
      : {};
  const sanitizedSg = {} as Record<SacredGeometryMode, SacredGeometrySettings>;
  for (const mode of Object.keys(DEFAULT_PARAMS.sgSettings) as SacredGeometryMode[]) {
    const modeFallback =
      fallbackBase.sgSettings?.[mode] ?? DEFAULT_PARAMS.sgSettings[mode];
    const modeCand = Object.prototype.hasOwnProperty.call(rawSg, mode)
      ? rawSg[mode]
      : modeFallback;
    sanitizedSg[mode] = sanitizeSgSettings(modeCand, modeFallback);
  }
  out.sgSettings = sanitizedSg;

  // Guard optional target* fields (strip null/NaN)
  for (const tKey of OPTIONAL_TARGET_KEYS) {
    const cand = Object.prototype.hasOwnProperty.call(src, tKey)
      ? src[tKey]
      : fallbackBase[tKey];
    if (typeof cand === 'number' && Number.isFinite(cand)) {
      out[tKey] = cand;
    }
  }

  // Guard optional geometryData (normalize null alpha/beta/name/regime)
  const rawGeom = Object.prototype.hasOwnProperty.call(src, 'geometryData')
    ? src.geometryData
    : fallbackBase.geometryData;
  const cleanGeom = sanitizeGeometryData(rawGeom);
  if (cleanGeom) {
    out.geometryData = cleanGeom;
  }

  return out as unknown as VisualizerParams;
}
