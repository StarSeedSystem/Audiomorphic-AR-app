import { supabase } from './supabaseClient';
import { OS_FILES_BUCKET } from './starseedBrains';

/**
 * Bibliotecas de Audio StarSeed OS para Transmisiones:
 * - Subida de archivos locales desde cualquier dispositivo (guardando en Biblioteca StarSeed o temporal para descartar).
 * - Selección de archivos privados de la cuenta con autorización explícita por sesión (URL firmada temporal o promoción).
 * - Exploración de bibliotecas públicas en páginas, grupos, comunidades y catálogo público de StarSeed.
 */

export interface AudioLibraryEntry {
  id: string;
  title: string;
  url: string;
  mime: string;
  sizeBytes?: number;
  storagePath?: string;
  osFileId?: string;
  ownerId?: string;
  sourceKind: 'private_account' | 'public_catalog' | 'page' | 'group' | 'community';
  entityName?: string;
  isPublic: boolean;
  tags?: string[];
  createdAt?: string;
}

export interface UploadedSessionAudio {
  ok: boolean;
  title: string;
  url?: string;
  localObjectUrl?: string;
  mime: string;
  sizeBytes: number;
  storagePath?: string;
  osFileId?: string;
  isTemporary: boolean;
  storageMode: 'os_files_cloud' | 'local_device';
  error?: string;
}

const AUDIO_EXT_RE = /\.(mp3|wav|ogg|oga|flac|m4a|aac|webm|opus|aiff)$/i;

export function isAudioFileOrName(mime?: string | null, name?: string | null, url?: string | null): boolean {
  const m = (mime || '').toLowerCase();
  if (m.startsWith('audio/')) return true;
  if (AUDIO_EXT_RE.test(name || '')) return true;
  if (AUDIO_EXT_RE.test((url || '').split('?')[0])) return true;
  return false;
}

function safeFileName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '.mp3';
  const cleanBase = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64) || 'pista';
  const cleanExt = ext.replace(/[^a-zA-Z0-9.]+/g, '').slice(0, 12) || '.mp3';
  return `${cleanBase}${cleanExt}`;
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

/**
 * Sube un archivo de audio del dispositivo para la transmisión actual.
 * - `persistence: 'library'`: se guarda en `os-files` (`${uid}/audiomorphic-audio/...`) y tabla `os_files`.
 * - `persistence: 'temporary'`: se guarda en ruta temporal de sesión y se marca para borrado al finalizar.
 * - Si no hay red o sesión, crea un Blob URL local reproduce-al-instante sin fallar.
 */
export async function uploadSessionAudio(params: {
  file: File;
  persistence: 'library' | 'temporary';
  sessionId: string;
  userId?: string | null;
  makePublic?: boolean;
}): Promise<UploadedSessionAudio> {
  const { file, persistence, sessionId, userId, makePublic = false } = params;
  const title = file.name.replace(/\.[^.]+$/, '') || 'Pista de Audio';
  const mime = file.type || 'audio/mpeg';
  const isTemporary = persistence === 'temporary';
  const localObjectUrl = typeof URL !== 'undefined' ? URL.createObjectURL(file) : undefined;

  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
  if (!userId || !isOnline) {
    return {
      ok: true,
      title,
      url: localObjectUrl,
      localObjectUrl,
      mime,
      sizeBytes: file.size,
      isTemporary,
      storageMode: 'local_device',
    };
  }

  const stamp = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const folder = isTemporary ? `audiomorphic-temp/${sessionId}` : 'audiomorphic-audio';
  const path = `${userId}/${folder}/${stamp}_${safeFileName(file.name)}`;

  try {
    const { error: upErr } = await supabase.storage.from(OS_FILES_BUCKET).upload(path, file, {
      contentType: mime,
      upsert: false,
    });
    if (upErr) {
      return {
        ok: true,
        title,
        url: localObjectUrl,
        localObjectUrl,
        mime,
        sizeBytes: file.size,
        isTemporary,
        storageMode: 'local_device',
        error: `Subida nube omitida (${upErr.message}); usando audio local.`,
      };
    }

    const pub = supabase.storage.from(OS_FILES_BUCKET).getPublicUrl(path);
    const url = pub?.data?.publicUrl || localObjectUrl;

    let osFileId: string | undefined;
    try {
      const { data: row } = await supabase
        .from('os_files')
        .insert({
          owner: userId,
          name: file.name,
          mime,
          size: file.size,
          path,
          url,
          is_public: !isTemporary && makePublic,
          meta: {
            app: 'audiomorphic',
            kind: 'live_audio',
            temporary: isTemporary,
            session_id: isTemporary ? sessionId : undefined,
          },
        })
        .select('id')
        .maybeSingle();
      if (row?.id) osFileId = String(row.id);
    } catch {
      /* metadata insert optional */
    }

    // Also attach permanent library items into personal entity_state library index
    if (!isTemporary) {
      try {
        const { data: existingState } = await withTimeout<any>(
          supabase
            .from('entity_state')
            .select('value')
            .eq('owner_kind', 'user')
            .eq('owner_id', userId)
            .eq('key', 'library')
            .maybeSingle(),
          2500,
          { data: null }
        );
        const doc = existingState?.value && typeof existingState.value === 'object'
          ? existingState.value
          : { folders: [], items: [] };
        const items = Array.isArray(doc.items) ? doc.items : [];
        items.unshift({
          id: osFileId || `am_${stamp}`,
          type: 'file',
          title: file.name,
          url,
          mime,
          folderId: null,
          tags: ['audiomorphic', 'audio'],
          addedAt: new Date().toISOString(),
        });
        await supabase.from('entity_state').upsert(
          {
            owner_kind: 'user',
            owner_id: userId,
            key: 'library',
            value: { ...doc, items: items.slice(0, 200) },
          },
          { onConflict: 'owner_kind,owner_id,key' }
        );
      } catch {
        /* non-blocking entity_state sync */
      }
    }

    return {
      ok: true,
      title,
      url,
      localObjectUrl,
      mime,
      sizeBytes: file.size,
      storagePath: path,
      osFileId,
      isTemporary,
      storageMode: 'os_files_cloud',
    };
  } catch (err: any) {
    return {
      ok: true,
      title,
      url: localObjectUrl,
      localObjectUrl,
      mime,
      sizeBytes: file.size,
      isTemporary,
      storageMode: 'local_device',
      error: err?.message,
    };
  }
}

export async function cleanupTemporaryAudio(
  records: Array<{ osFileId?: string; storagePath?: string }>
): Promise<void> {
  if (!records.length || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
  const paths = records.map((r) => r.storagePath).filter((p): p is string => Boolean(p));
  const ids = records.map((r) => r.osFileId).filter((id): id is string => Boolean(id));
  if (paths.length > 0) {
    try {
      await supabase.storage.from(OS_FILES_BUCKET).remove(paths);
    } catch {
      /* best effort */
    }
  }
  if (ids.length > 0) {
    try {
      await supabase.from('os_files').delete().in('id', ids);
    } catch {
      /* best effort */
    }
  }
}

export async function fetchPrivateAudioLibrary(userId?: string | null): Promise<AudioLibraryEntry[]> {
  if (!userId || (typeof navigator !== 'undefined' && !navigator.onLine)) return [];
  try {
    const res = await withTimeout<any>(
      supabase
        .from('os_files')
        .select('id, owner, name, mime, size, path, url, is_public, meta, created_at')
        .eq('owner', userId)
        .order('created_at', { ascending: false })
        .limit(80),
      3500,
      { data: null }
    );
    const rows = Array.isArray(res?.data) ? res.data : [];
    return rows
      .filter((r: any) => !r?.meta?.temporary && isAudioFileOrName(r.mime, r.name, r.url))
      .map((r: any) => ({
        id: String(r.id),
        osFileId: String(r.id),
        title: String(r.name || 'Audio').replace(/\.[^.]+$/, ''),
        url: String(r.url || ''),
        mime: String(r.mime || 'audio/mpeg'),
        sizeBytes: typeof r.size === 'number' ? r.size : undefined,
        storagePath: r.path ? String(r.path) : undefined,
        ownerId: String(r.owner),
        sourceKind: 'private_account',
        entityName: 'Mi Biblioteca Privada',
        isPublic: Boolean(r.is_public),
        createdAt: r.created_at,
      }));
  } catch {
    return [];
  }
}

/**
 * Concede acceso controlado a un archivo privado del usuario para reproducirlo en una transmisión:
 * - `session_signed_url`: genera URL temporal firmada (2 horas) sin volver público el archivo en el perfil.
 * - `make_public`: marca `is_public = true` en `os_files` para compartirlo permanentemente.
 */
export async function authorizePrivateFileForSession(
  entry: AudioLibraryEntry,
  mode: 'session_signed_url' | 'make_public'
): Promise<{ ok: boolean; url: string; permissionNote: string; error?: string }> {
  if (entry.isPublic && entry.url) {
    return { ok: true, url: entry.url, permissionNote: 'Archivo ya público en tu perfil.' };
  }
  if (!entry.storagePath) {
    return { ok: Boolean(entry.url), url: entry.url, permissionNote: 'Acceso directo por enlace.' };
  }
  try {
    if (mode === 'make_public' && entry.osFileId) {
      await supabase.from('os_files').update({ is_public: true }).eq('id', entry.osFileId);
      const { data } = supabase.storage.from(OS_FILES_BUCKET).getPublicUrl(entry.storagePath);
      return {
        ok: true,
        url: data?.publicUrl || entry.url,
        permissionNote: 'Archivo compartido como público en StarSeed OS.',
      };
    }

    const { data, error } = await supabase.storage
      .from(OS_FILES_BUCKET)
      .createSignedUrl(entry.storagePath, 7200);
    if (!error && data?.signedUrl) {
      return {
        ok: true,
        url: data.signedUrl,
        permissionNote: 'Permiso temporal de sesión concedido (URL firmada 2h; tu archivo sigue privado).',
      };
    }

    const pub = supabase.storage.from(OS_FILES_BUCKET).getPublicUrl(entry.storagePath);
    return {
      ok: Boolean(pub?.data?.publicUrl || entry.url),
      url: pub?.data?.publicUrl || entry.url,
      permissionNote: 'Enlace autorizado para esta sesión.',
    };
  } catch (err: any) {
    return {
      ok: Boolean(entry.url),
      url: entry.url,
      permissionNote: 'Fallback local',
      error: err?.message,
    };
  }
}

export async function fetchPublicAudioLibraries(): Promise<AudioLibraryEntry[]> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return [];
  const results: AudioLibraryEntry[] = [];
  const seen = new Set<string>();

  try {
    const [catalogRes, pubFilesRes, entityLibsRes] = await withTimeout<any>(
      Promise.all([
        supabase
          .from('library_public_items')
          .select('id, owner, category, folder, name, kind, payload, tags, created_at')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('os_files')
          .select('id, owner, name, mime, size, path, url, group_slug, meta, created_at')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('entity_state')
          .select('owner_kind, owner_id, value, updated_at')
          .in('owner_kind', ['page', 'group', 'community', 'event'])
          .eq('key', 'library')
          .limit(35),
      ]),
      3800,
      [{ data: [] }, { data: [] }, { data: [] }]
    );

    for (const item of Array.isArray(catalogRes?.data) ? catalogRes.data : []) {
      const url = String(item?.payload?.url || item?.payload?.audioUrl || '');
      const mime = String(item?.payload?.mime || 'audio/mpeg');
      if (url && isAudioFileOrName(mime, item.name, url) && !seen.has(url)) {
        seen.add(url);
        results.push({
          id: `cat_${item.id}`,
          title: String(item.name || 'Pista Pública'),
          url,
          mime,
          ownerId: item.owner,
          sourceKind: 'public_catalog',
          entityName: item.folder ? `Catálogo · ${item.folder}` : 'Catálogo Público StarSeed',
          isPublic: true,
          tags: Array.isArray(item.tags) ? item.tags : [],
          createdAt: item.created_at,
        });
      }
    }

    for (const f of Array.isArray(pubFilesRes?.data) ? pubFilesRes.data : []) {
      if (f?.url && isAudioFileOrName(f.mime, f.name, f.url) && !seen.has(f.url)) {
        seen.add(f.url);
        results.push({
          id: `pub_${f.id}`,
          osFileId: String(f.id),
          storagePath: f.path,
          title: String(f.name || 'Audio Público').replace(/\.[^.]+$/, ''),
          url: String(f.url),
          mime: String(f.mime || 'audio/mpeg'),
          sizeBytes: typeof f.size === 'number' ? f.size : undefined,
          ownerId: f.owner,
          sourceKind: f.group_slug ? 'group' : 'public_catalog',
          entityName: f.group_slug ? `Grupo · @${f.group_slug}` : 'Red StarSeed Pública',
          isPublic: true,
          createdAt: f.created_at,
        });
      }
    }

    for (const st of Array.isArray(entityLibsRes?.data) ? entityLibsRes.data : []) {
      const items = Array.isArray(st?.value?.items) ? st.value.items : [];
      const kindMap: Record<string, AudioLibraryEntry['sourceKind']> = {
        page: 'page',
        group: 'group',
        community: 'community',
        event: 'community',
      };
      const sourceKind = kindMap[String(st.owner_kind)] || 'community';
      const prefixLabel =
        sourceKind === 'page' ? 'Página' : sourceKind === 'group' ? 'Grupo' : 'Comunidad';
      for (const it of items) {
        if (it?.url && isAudioFileOrName(it.mime, it.title, it.url) && !seen.has(it.url)) {
          seen.add(it.url);
          results.push({
            id: `ent_${st.owner_id}_${it.id || Math.random()}`,
            title: String(it.title || 'Audio Comunitario').replace(/\.[^.]+$/, ''),
            url: String(it.url),
            mime: String(it.mime || 'audio/mpeg'),
            sourceKind,
            entityName: `${prefixLabel} · ${st.owner_id}`,
            isPublic: true,
            tags: Array.isArray(it.tags) ? it.tags : [],
            createdAt: it.addedAt || st.updated_at,
          });
        }
      }
    }
  } catch {
    /* non-blocking */
  }

  return results;
}
