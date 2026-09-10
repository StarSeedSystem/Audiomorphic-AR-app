// utils/embedMode.ts
//
// StarSeed OS "FONDO / Background" embed mode.
// -------------------------------------------------------------
// Additive, opt-in behaviour controlled exclusively by URL params.
// If NO embed params are present, `EMBED.active` is false and the app
// behaves EXACTLY as before (normal landing / unlock / Stripe flow).
//
// Recognised params (read once at startup):
//   bg=1         -> background mode: hide ALL chrome, full-screen canvas,
//                   non-interactive (clicks pass through).
//   autostart=1  -> start the visualizer automatically (autoPilot on),
//                   no click required.
//   mic=1        -> try getUserMedia({audio:true}) automatically.
//   cam=1        -> try getUserMedia({video:true}) as a full-screen
//                   background texture (AR-ish).
//   preset=<id>  -> apply a built-in visual preset if it exists.
//
// This file intentionally has ZERO React / app imports so it can be used
// from anywhere safely.

import type { VisualizerParams, SacredGeometryMode } from '../types';

export interface EmbedConfig {
  /** True if ANY embed param is present. */
  active: boolean;
  /** bg=1 : hide all UI chrome and make the app non-interactive. */
  bg: boolean;
  /** autostart=1 : start the visualizer automatically. */
  autostart: boolean;
  /** mic=1 : auto-request the microphone. */
  mic: boolean;
  /** cam=1 : auto-request the camera as a background texture. */
  cam: boolean;
  /** preset=<id> : id of the built-in preset to apply (or null). */
  preset: string | null;
}

const readBool = (params: URLSearchParams, key: string): boolean => {
  if (!params.has(key)) return false;
  const v = (params.get(key) || '').toLowerCase();
  // `?bg`, `?bg=1`, `?bg=true`, `?bg=on`, `?bg=yes` are all truthy.
  return v === '' || v === '1' || v === 'true' || v === 'on' || v === 'yes';
};

const computeEmbedConfig = (): EmbedConfig => {
  const empty: EmbedConfig = {
    active: false,
    bg: false,
    autostart: false,
    mic: false,
    cam: false,
    preset: null,
  };

  if (typeof window === 'undefined') return empty;

  try {
    const params = new URLSearchParams(window.location.search);
    const bg = readBool(params, 'bg');
    const autostart = readBool(params, 'autostart');
    const mic = readBool(params, 'mic');
    const cam = readBool(params, 'cam');
    const preset = params.get('preset');
    const active = bg || autostart || mic || cam || !!preset;
    return {
      active,
      bg,
      autostart,
      mic,
      cam,
      preset: preset && preset.trim() ? preset.trim() : null,
    };
  } catch (e) {
    return empty;
  }
};

/** Parsed once at module load. */
export const EMBED: EmbedConfig = computeEmbedConfig();

// -------------------------------------------------------------
// Built-in visual presets (for ?preset=<id>).
// Each preset is a partial set of VisualizerParams merged on top of the
// current params. Kept small and curated so the param is genuinely useful.
// -------------------------------------------------------------
const SG = (modes: SacredGeometryMode[]): Partial<VisualizerParams> => ({
  sacredGeometryEnabled: true,
  sacredGeometryModes: modes,
  spiralResonanceModes: modes,
  sgAutoResonance: true,
  sgAutoHarmonic: true,
});

export const BUILTIN_PRESETS: Record<string, Partial<VisualizerParams>> = {
  // Calm, slow nebula — good default ambient background.
  nebula: {
    autoPilot: true,
    autoPilotMode: 'drift',
    autoSpeed: 0.6,
    baseHue: 220,
    saturation: 90,
    hueSpeed: 0.15,
    trail: 0.96,
    bgMode: 'morphing-colors',
    bgColors: ['#02010a', '#0a1030', '#1a0533'],
    bgAnimatable: true,
    bgSpeed: 0.3,
  },
  // Genesis sacred-geometry bloom.
  genesis: {
    autoPilot: true,
    autoPilotMode: 'genesis',
    baseHue: 200,
    saturation: 100,
    hueSpeed: 0.2,
    trail: 0.97,
    ...SG(['flowerOfLife', 'metatron', 'goldenSpiral']),
  },
  // Warm harmonic spiral.
  solaris: {
    autoPilot: true,
    autoPilotMode: 'harmonic',
    baseHue: 30,
    saturation: 100,
    hueSpeed: 0.25,
    trail: 0.95,
    bgMode: 'organic-fade',
    bgColors: ['#0a0400', '#1a0a00'],
    bgAnimatable: true,
  },
  // Deep aqua torus / quantum field.
  aqua: {
    autoPilot: true,
    autoPilotMode: 'drift',
    autoSpeed: 0.8,
    baseHue: 180,
    saturation: 95,
    hueSpeed: 0.2,
    trail: 0.96,
    ...SG(['torus', 'quantumWave', 'goldenSpiral']),
  },
  // Slow monochrome / minimal.
  void: {
    autoPilot: true,
    autoPilotMode: 'drift',
    autoSpeed: 0.4,
    baseHue: 260,
    saturation: 40,
    hueSpeed: 0.05,
    trail: 0.98,
    bgMode: 'solid',
    bgColors: ['#000000'],
  },
};

export const getPresetParams = (id: string | null): Partial<VisualizerParams> | null => {
  if (!id) return null;
  const key = id.toLowerCase();
  return BUILTIN_PRESETS[key] || null;
};

// -------------------------------------------------------------
// Autonomous fallback animation driver.
// -------------------------------------------------------------
// When the visualizer has no real audio (mic denied / unavailable), we feed
// it synthetic, time-based "audio metrics" so geometry ALWAYS moves. This is
// the key guarantee for ?bg=1&autostart=1: the background must never be a
// frozen frame.
//
// Returns values shaped exactly like useAudioAnalyzer.getAudioMetrics():
//   { volume, frequency, bass, mid, treble }  (each 0..1)
export interface SyntheticMetrics {
  volume: number;
  frequency: number;
  bass: number;
  mid: number;
  treble: number;
}

let synthStart = 0;
export const getSyntheticMetrics = (intensity = 1): SyntheticMetrics => {
  if (typeof performance === 'undefined') {
    return { volume: 0.25, frequency: 0.5, bass: 0.3, mid: 0.3, treble: 0.2 };
  }
  if (!synthStart) synthStart = performance.now();
  const t = (performance.now() - synthStart) / 1000; // seconds

  // Layered sine oscillators at incommensurate frequencies produce an
  // organic, never-repeating "breathing" signal that mimics gentle music.
  const osc = (f: number, p = 0) => 0.5 + 0.5 * Math.sin(t * f * Math.PI * 2 + p);

  // Slow swells + occasional pseudo-beats.
  const swell = osc(0.05);                       // very slow global breathing
  const beat = Math.pow(osc(0.55, 1.3), 4);      // sharper periodic "kick"
  const shimmer = osc(0.9, 0.7) * osc(0.13, 2.1); // high-freq sparkle

  const bass = Math.min(1, (0.25 + 0.55 * beat + 0.2 * swell) * intensity);
  const mid = Math.min(1, (0.25 + 0.4 * osc(0.27, 0.5) + 0.15 * swell) * intensity);
  const treble = Math.min(1, (0.15 + 0.45 * shimmer) * intensity);
  const volume = Math.min(1, (0.2 + 0.5 * swell + 0.3 * beat) * intensity);
  const frequency = 0.35 + 0.4 * osc(0.07, 1.0); // slowly drifting centroid

  return { volume, frequency, bass, mid, treble };
};
