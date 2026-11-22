import { supabase } from './supabaseClient';

/**
 * Capas de Conciencia (Astraura 1.58 + Malla StarSeed OS) & Capacidades de Neuronas.
 * Interoperable con `starseed-os-main/src/lib/astraura/capas-conciencia.ts` y `capabilities`.
 */

export type CapaConciencia = 'local' | 'mesh' | 'nube' | 'colectiva';
export const CAPAS: readonly CapaConciencia[] = ['local', 'mesh', 'nube', 'colectiva'];

export type EstadoCapa = 'apagada' | 'sin-senal' | 'activa' | 'sincronizada';

export interface PreferenciaCapas {
  activo: boolean;
  capas: Record<CapaConciencia, boolean>;
  nivelador: number;
}

export const CLAVE_INTELIGENCIA = 'starseed.astraura.intelligence.v1';
export const CLAVE_CAPACIDADES_NEURONA = 'audiomorphic.neuron.capabilities.v1';
export const NIVELADOR_DEFECTO = 80;

export const PREFERENCIA_CAPAS_DEFECTO: PreferenciaCapas = {
  activo: true,
  capas: { local: true, mesh: true, nube: true, colectiva: true },
  nivelador: NIVELADOR_DEFECTO,
};

export const ETIQUETA_CAPA: Record<CapaConciencia, { nombre: string; descripcion: string }> = {
  local: {
    nombre: 'Local',
    descripcion: 'Procesamiento en esta neurona sin conexión y sin coste',
  },
  mesh: {
    nombre: 'Mesh P2P',
    descripcion: 'Neuronas enlazadas vía WebRTC LAN (SSL1), Broadcast y antena LoRa',
  },
  nube: {
    nombre: 'Nube StarSeed',
    descripcion: 'Servidores y relés cifrados de StarSeed OS / Supabase Realtime',
  },
  colectiva: {
    nombre: 'Colectiva',
    descripcion: 'Directorio comunitario, canales públicos y bibliotecas compartidas',
  },
};

export const ETIQUETA_ESTADO_CAPA: Record<EstadoCapa, string> = {
  apagada: 'Apagada',
  'sin-senal': 'Sin señal',
  activa: 'Activa',
  sincronizada: 'Sincronizada',
};

export type AmbitoFicha = 'propio' | 'cuenta' | 'publico';

export interface NeuronCapabilityOffer {
  /** Apagado de fábrica en dispositivos personales (contrato CRN / SES1115Q §3.5). */
  enabled: boolean;
  correr: boolean;
  llevar: boolean;
  guardar: boolean;
  ambitos: AmbitoFicha[];
  soloWifi: boolean;
  soloCargando: boolean;
  kbpsSubidaMax: number;
}

export const DEFAULT_NEURON_CAPABILITY_OFFER: NeuronCapabilityOffer = {
  enabled: false,
  correr: false,
  llevar: true,
  guardar: false,
  ambitos: ['propio', 'cuenta'],
  soloWifi: true,
  soloCargando: false,
  kbpsSubidaMax: 1500,
};

export interface SaludCapas {
  local?: boolean;
  nube?: boolean;
  vecinosMesh?: number;
  colectivaConectada?: boolean;
  sincroniaActiva?: boolean;
}

export interface AccountMeshLink {
  id: string;
  peerOwnerId: string;
  peerDeviceId: string;
  localDeviceId: string;
  direction: 'outgoing' | 'incoming';
  permissions: {
    ia?: boolean;
    archivos?: boolean;
    capacidades?: boolean;
    [k: string]: unknown;
  };
  resolvedAt?: string;
}

export interface UserEntitySummary {
  slug: string;
  name: string;
  kind: 'grupo' | 'pagina' | 'comunidad' | 'entidad';
  role: string;
}

export function leerPreferenciaCapas(): PreferenciaCapas {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return { ...PREFERENCIA_CAPAS_DEFECTO };
    const raw = window.localStorage.getItem(CLAVE_INTELIGENCIA);
    if (!raw) return { ...PREFERENCIA_CAPAS_DEFECTO };
    const c = JSON.parse(raw) as Record<string, unknown>;
    const rawNiv = typeof c.nivelador158 === 'number' ? c.nivelador158 : NIVELADOR_DEFECTO;
    return {
      activo: c.astraura158Activo !== false,
      capas: {
        local: c.capa158Local !== false,
        mesh: c.capa158Mesh !== false,
        nube: c.capa158Nube !== false,
        colectiva: c.capa158Colectiva !== false,
      },
      nivelador: Math.round(Math.max(0, Math.min(100, rawNiv))),
    };
  } catch {
    return { ...PREFERENCIA_CAPAS_DEFECTO };
  }
}

export function guardarPreferenciaCapas(pref: PreferenciaCapas): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    let existing: Record<string, unknown> = {};
    try {
      const prev = window.localStorage.getItem(CLAVE_INTELIGENCIA);
      if (prev) existing = JSON.parse(prev);
    } catch {
      existing = {};
    }
    const merged = {
      ...existing,
      astraura158Activo: pref.activo,
      capa158Local: pref.capas.local,
      capa158Mesh: pref.capas.mesh,
      capa158Nube: pref.capas.nube,
      capa158Colectiva: pref.capas.colectiva,
      nivelador158: pref.nivelador,
    };
    window.localStorage.setItem(CLAVE_INTELIGENCIA, JSON.stringify(merged));
  } catch {
    /* ignore storage quota */
  }
}

export function estadoCapas(pref: PreferenciaCapas, salud: SaludCapas): Record<CapaConciencia, EstadoCapa> {
  const out = {} as Record<CapaConciencia, EstadoCapa>;
  for (const capa of CAPAS) {
    if (!pref.activo || !pref.capas[capa]) {
      out[capa] = 'apagada';
      continue;
    }
    if (capa === 'local') {
      out.local = salud.local === false ? 'sin-senal' : salud.sincroniaActiva ? 'sincronizada' : 'activa';
    } else if (capa === 'mesh') {
      const n = salud.vecinosMesh ?? 0;
      out.mesh = n > 0 ? 'sincronizada' : 'activa';
    } else if (capa === 'nube') {
      out.nube = salud.nube ? (salud.sincroniaActiva ? 'sincronizada' : 'activa') : 'sin-senal';
    } else {
      out.colectiva = salud.colectivaConectada ? 'sincronizada' : salud.nube ? 'activa' : 'sin-senal';
    }
  }
  return out;
}

export function loadNeuronCapabilityOffer(): NeuronCapabilityOffer {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_NEURON_CAPABILITY_OFFER };
    }
    const raw = window.localStorage.getItem(CLAVE_CAPACIDADES_NEURONA);
    if (!raw) return { ...DEFAULT_NEURON_CAPABILITY_OFFER };
    const parsed = JSON.parse(raw) as Partial<NeuronCapabilityOffer>;
    return {
      enabled: parsed.enabled === true,
      correr: parsed.correr === true,
      llevar: parsed.llevar !== false,
      guardar: parsed.guardar === true,
      ambitos: Array.isArray(parsed.ambitos) && parsed.ambitos.length > 0
        ? parsed.ambitos.filter((a): a is AmbitoFicha => a === 'propio' || a === 'cuenta' || a === 'publico')
        : ['propio', 'cuenta'],
      soloWifi: parsed.soloWifi !== false,
      soloCargando: parsed.soloCargando === true,
      kbpsSubidaMax: typeof parsed.kbpsSubidaMax === 'number' && parsed.kbpsSubidaMax >= 128
        ? Math.round(parsed.kbpsSubidaMax)
        : 1500,
    };
  } catch {
    return { ...DEFAULT_NEURON_CAPABILITY_OFFER };
  }
}

export function saveNeuronCapabilityOffer(offer: NeuronCapabilityOffer): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(CLAVE_CAPACIDADES_NEURONA, JSON.stringify(offer));
  } catch {
    /* ignore */
  }
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const t = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, ms);
    Promise.resolve(promise)
      .then((v) => {
        if (!settled) {
          settled = true;
          clearTimeout(t);
          resolve(v);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(t);
          resolve(fallback);
        }
      });
  });
}

export async function fetchAccountMeshLinks(userId?: string | null): Promise<AccountMeshLink[]> {
  if (!userId || (typeof navigator !== 'undefined' && !navigator.onLine)) return [];
  try {
    const res = await withTimeout<any>(
      supabase
        .from('os_mesh_vinculos')
        .select('id, de_owner, de_device, a_owner, a_device, estado, permisos, resuelto_at')
        .eq('estado', 'aceptado')
        .or(`de_owner.eq.${userId},a_owner.eq.${userId}`)
        .limit(40),
      3000,
      { data: null }
    );
    const rows = Array.isArray(res?.data) ? res.data : [];
    return rows.map((r: any) => {
      const outgoing = r.de_owner === userId;
      return {
        id: String(r.id),
        peerOwnerId: String(outgoing ? r.a_owner : r.de_owner),
        peerDeviceId: String(outgoing ? r.a_device : r.de_device),
        localDeviceId: String(outgoing ? r.de_device : r.a_device),
        direction: outgoing ? 'outgoing' : 'incoming',
        permissions: r.permisos && typeof r.permisos === 'object' ? r.permisos : {},
        resolvedAt: r.resuelto_at || undefined,
      };
    });
  } catch {
    return [];
  }
}

export async function fetchUserEntities(userId?: string | null): Promise<UserEntitySummary[]> {
  if (!userId || (typeof navigator !== 'undefined' && !navigator.onLine)) return [];
  try {
    const [memRes, grpRes, pagRes] = await withTimeout<any>(
      Promise.all([
        supabase
          .from('os_memberships')
          .select('group_slug, role')
          .eq('user_id', userId)
          .limit(30),
        supabase
          .from('os_groups')
          .select('slug, name')
          .eq('owner_id', userId)
          .limit(20),
        supabase
          .from('os_pages')
          .select('slug, title, kind')
          .eq('owner_id', userId)
          .limit(20),
      ]),
      3200,
      [{ data: [] }, { data: [] }, { data: [] }]
    );

    const map = new Map<string, UserEntitySummary>();
    const add = (slug: string, name: string, kind: UserEntitySummary['kind'], role: string) => {
      if (!slug) return;
      if (!map.has(slug)) map.set(slug, { slug, name: name || slug, kind, role });
    };

    (Array.isArray(grpRes?.data) ? grpRes.data : []).forEach((g: any) =>
      add(String(g.slug), String(g.name || g.slug), 'grupo', 'owner')
    );
    (Array.isArray(pagRes?.data) ? pagRes.data : []).forEach((p: any) =>
      add(String(p.slug), String(p.title || p.slug), p.kind === 'comunidad' ? 'comunidad' : 'pagina', 'owner')
    );
    (Array.isArray(memRes?.data) ? memRes.data : []).forEach((m: any) => {
      if (String(m.role).toLowerCase() !== 'pending') {
        add(String(m.group_slug), String(m.group_slug), 'grupo', String(m.role || 'member'));
      }
    });

    return Array.from(map.values());
  } catch {
    return [];
  }
}
