/**
 * Puente Spotify Real para Audiomorphic & StarSeed OS:
 * 1. Puente MCP JSON-RPC real (`tools/list`, `tools/call`) contra un servidor MCP de Spotify conectado por HTTP/SSE/Bridge.
 * 2. OAuth 2.0 PKCE + Spotify Web API (`search`, `PUT /me/player/play`, `PUT /me/player/seek`, `GET /me/player`) para sincronización exacta al milisegundo entre usuarios con Spotify Premium.
 * 3. Lector universal de enlaces/URIs Spotify + oEmbed público para añadir canciones al instante a la cola sincronizada.
 */

const KEY_MCP_URL = 'audiomorphic.spotify.mcp.url';
const KEY_CLIENT_ID = 'audiomorphic.spotify.client_id';
const KEY_PKCE_VERIFIER = 'audiomorphic.spotify.pkce_verifier';
const KEY_PKCE_STATE = 'audiomorphic.spotify.pkce_state';
const KEY_TOKEN = 'audiomorphic.spotify.token.v1';

export interface SpotifyTrackSummary {
  uri: string;
  id: string;
  kind: 'track' | 'album' | 'playlist' | 'episode';
  title: string;
  artist: string;
  coverUrl?: string;
  durationMs?: number;
  previewUrl?: string;
  webUrl: string;
}

export interface SpotifyMcpStatus {
  url: string;
  connected: boolean;
  tools: string[];
  rttMs: number | null;
  error?: string;
}

export interface SpotifyTokenSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  clientId: string;
  displayName?: string;
}

export function getStoredSpotifyMcpUrl(): string {
  try {
    return localStorage.getItem(KEY_MCP_URL) || '';
  } catch {
    return '';
  }
}

export function setStoredSpotifyMcpUrl(url: string): void {
  try {
    if (url.trim()) localStorage.setItem(KEY_MCP_URL, url.trim());
    else localStorage.removeItem(KEY_MCP_URL);
  } catch {
    /* ignore */
  }
}

export function getStoredSpotifyClientId(): string {
  try {
    return localStorage.getItem(KEY_CLIENT_ID) || '';
  } catch {
    return '';
  }
}

export function setStoredSpotifyClientId(clientId: string): void {
  try {
    if (clientId.trim()) localStorage.setItem(KEY_CLIENT_ID, clientId.trim());
    else localStorage.removeItem(KEY_CLIENT_ID);
  } catch {
    /* ignore */
  }
}

export function getSpotifySession(): SpotifyTokenSession | null {
  try {
    const raw = localStorage.getItem(KEY_TOKEN);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SpotifyTokenSession;
    if (!parsed?.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function disconnectSpotify(): void {
  try {
    localStorage.removeItem(KEY_TOKEN);
  } catch {
    /* ignore */
  }
}

export function parseSpotifyInput(input: string): {
  kind: 'track' | 'album' | 'playlist' | 'episode';
  id: string;
  uri: string;
  webUrl: string;
} | null {
  const s = input.trim();
  const uriMatch = s.match(/^spotify:(track|album|playlist|episode):([a-zA-Z0-9]+)$/i);
  if (uriMatch) {
    const kind = uriMatch[1].toLowerCase() as 'track' | 'album' | 'playlist' | 'episode';
    const id = uriMatch[2];
    return { kind, id, uri: `spotify:${kind}:${id}`, webUrl: `https://open.spotify.com/${kind}/${id}` };
  }
  const urlMatch = s.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode)\/([a-zA-Z0-9]+)/i);
  if (urlMatch) {
    const kind = urlMatch[1].toLowerCase() as 'track' | 'album' | 'playlist' | 'episode';
    const id = urlMatch[2];
    return { kind, id, uri: `spotify:${kind}:${id}`, webUrl: `https://open.spotify.com/${kind}/${id}` };
  }
  return null;
}

export function buildSpotifyEmbedUrl(uriOrUrl: string): string | null {
  const parsed = parseSpotifyInput(uriOrUrl);
  if (!parsed) return null;
  return `https://open.spotify.com/embed/${parsed.kind}/${parsed.id}?utm_source=audiomorphic&theme=0`;
}

export async function fetchSpotifyOEmbed(input: string): Promise<SpotifyTrackSummary | null> {
  const parsed = parseSpotifyInput(input);
  if (!parsed) return null;
  try {
    const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(parsed.webUrl)}`);
    if (!res.ok) {
      return {
        uri: parsed.uri,
        id: parsed.id,
        kind: parsed.kind,
        title: `Spotify ${parsed.kind} (${parsed.id.slice(0, 6)})`,
        artist: 'Spotify',
        webUrl: parsed.webUrl,
      };
    }
    const j = await res.json();
    return {
      uri: parsed.uri,
      id: parsed.id,
      kind: parsed.kind,
      title: String(j.title || `Spotify ${parsed.id}`),
      artist: String(j.author_name || 'Spotify'),
      coverUrl: typeof j.thumbnail_url === 'string' ? j.thumbnail_url : undefined,
      webUrl: parsed.webUrl,
    };
  } catch {
    return {
      uri: parsed.uri,
      id: parsed.id,
      kind: parsed.kind,
      title: `Spotify ${parsed.kind} (${parsed.id.slice(0, 6)})`,
      artist: 'Spotify',
      webUrl: parsed.webUrl,
    };
  }
}

/* ─────────────── Mode 1: Real Spotify MCP JSON-RPC Bridge ─────────────── */

async function jsonRpc(url: string, method: string, params: Record<string, unknown> = {}, timeoutMs = 4500) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params,
      }),
      signal: ctrl.signal,
    });
    const rttMs = Math.round(performance.now() - t0);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data?.error) throw new Error(data.error.message || 'MCP error');
    return { result: data?.result, rttMs };
  } finally {
    clearTimeout(timer);
  }
}

export async function testSpotifyMcpConnection(endpointUrl: string): Promise<SpotifyMcpStatus> {
  const url = endpointUrl.trim();
  if (!url) return { url: '', connected: false, tools: [], rttMs: null, error: 'Ingresa la URL del endpoint MCP HTTP.' };
  try {
    await jsonRpc(url, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'Audiomorphic-StarSeed', version: '1.5.1' },
    }).catch(() => null);

    const { result, rttMs } = await jsonRpc(url, 'tools/list', {});
    const rawTools = Array.isArray(result?.tools) ? result.tools : [];
    const tools = rawTools.map((t: any) => String(t.name || t.id)).filter(Boolean);
    setStoredSpotifyMcpUrl(url);
    return { url, connected: true, tools, rttMs };
  } catch (err: any) {
    return {
      url,
      connected: false,
      tools: [],
      rttMs: null,
      error: err?.message || 'El servidor MCP no respondió.',
    };
  }
}

export async function callSpotifyMcpTool(
  toolName: string,
  args: Record<string, unknown>,
  endpointUrl = getStoredSpotifyMcpUrl()
): Promise<{ ok: boolean; result?: any; error?: string }> {
  if (!endpointUrl) return { ok: false, error: 'Endpoint MCP no configurado.' };
  try {
    const { result } = await jsonRpc(endpointUrl, 'tools/call', { name: toolName, arguments: args });
    return { ok: true, result };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Fallo al llamar herramienta MCP de Spotify.' };
  }
}

/* ─────────────── Mode 2: Spotify OAuth 2.0 PKCE + Web API ─────────────── */

function b64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function startSpotifyPkceAuth(clientIdInput?: string): Promise<{ ok: boolean; error?: string }> {
  const clientId = (clientIdInput || getStoredSpotifyClientId()).trim();
  if (!clientId) {
    return { ok: false, error: 'Configura tu Client ID de aplicación Spotify para conectar OAuth PKCE.' };
  }
  setStoredSpotifyClientId(clientId);
  try {
    const verifierBytes = new Uint8Array(64);
    crypto.getRandomValues(verifierBytes);
    const verifier = b64Url(verifierBytes);
    const challenge = b64Url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    const state = `spotify_${Math.random().toString(36).slice(2, 10)}`;

    localStorage.setItem(KEY_PKCE_VERIFIER, verifier);
    localStorage.setItem(KEY_PKCE_STATE, state);

    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    const scope = [
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'streaming',
      'user-read-email',
      'user-read-private',
    ].join(' ');

    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('code_challenge', challenge);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', scope);

    window.location.assign(authUrl.toString());
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'No se pudo iniciar Spotify PKCE.' };
  }
}

export async function handleSpotifyOAuthCallback(): Promise<SpotifyTokenSession | null> {
  if (typeof window === 'undefined') return null;
  const sp = new URLSearchParams(window.location.search);
  const code = sp.get('code');
  const state = sp.get('state') || '';
  if (!code || !state.startsWith('spotify_')) return null;

  const expectedState = localStorage.getItem(KEY_PKCE_STATE);
  const verifier = localStorage.getItem(KEY_PKCE_VERIFIER);
  const clientId = getStoredSpotifyClientId();
  if (!verifier || !clientId || (expectedState && expectedState !== state)) return null;

  try {
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    });
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const token: SpotifyTokenSession = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
      clientId,
    };
    try {
      const meRes = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token.accessToken}` },
      });
      if (meRes.ok) {
        const me = await meRes.json();
        token.displayName = me.display_name || me.id;
      }
    } catch {
      /* optional profile lookup */
    }

    localStorage.setItem(KEY_TOKEN, JSON.stringify(token));
    localStorage.removeItem(KEY_PKCE_VERIFIER);
    localStorage.removeItem(KEY_PKCE_STATE);

    // Strip OAuth query parameters cleanly from URL
    sp.delete('code');
    sp.delete('state');
    const cleanSearch = sp.toString();
    const cleanUrl = `${window.location.pathname}${cleanSearch ? `?${cleanSearch}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', cleanUrl);
    return token;
  } catch {
    return null;
  }
}

export async function getValidSpotifyToken(): Promise<string | null> {
  const s = getSpotifySession();
  if (!s) return null;
  if (Date.now() < s.expiresAt - 60_000) return s.accessToken;
  if (!s.refreshToken || !s.clientId) return null;
  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: s.refreshToken,
      client_id: s.clientId,
    });
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const next: SpotifyTokenSession = {
      ...s,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || s.refreshToken,
      expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
    };
    localStorage.setItem(KEY_TOKEN, JSON.stringify(next));
    return next.accessToken;
  } catch {
    return null;
  }
}

export async function searchSpotifyTracks(query: string): Promise<{ ok: boolean; tracks: SpotifyTrackSummary[]; error?: string }> {
  const q = query.trim();
  if (!q) return { ok: true, tracks: [] };

  // Prefer MCP search if connected
  const mcpUrl = getStoredSpotifyMcpUrl();
  if (mcpUrl) {
    const r = await callSpotifyMcpTool('search_tracks', { query: q, limit: 10 }, mcpUrl);
    if (r.ok && Array.isArray(r.result?.tracks)) {
      return { ok: true, tracks: r.result.tracks };
    }
  }

  const token = await getValidSpotifyToken();
  if (!token) {
    return {
      ok: false,
      tracks: [],
      error: 'Conecta Spotify PKCE o un servidor MCP para buscar por texto, o pega cualquier enlace de Spotify.',
    };
  }

  try {
    const res = await fetch(`https://api.spotify.com/v1/search?type=track&limit=10&q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { ok: false, tracks: [], error: `Spotify API HTTP ${res.status}` };
    const j = await res.json();
    const items = Array.isArray(j?.tracks?.items) ? j.tracks.items : [];
    const tracks: SpotifyTrackSummary[] = items.map((t: any) => ({
      uri: t.uri,
      id: t.id,
      kind: 'track',
      title: t.name,
      artist: Array.isArray(t.artists) ? t.artists.map((a: any) => a.name).join(', ') : 'Spotify',
      coverUrl: t.album?.images?.[0]?.url,
      durationMs: t.duration_ms,
      previewUrl: t.preview_url || undefined,
      webUrl: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
    }));
    return { ok: true, tracks };
  } catch (err: any) {
    return { ok: false, tracks: [], error: err?.message || 'Error buscando en Spotify.' };
  }
}

/**
 * Sincroniza la reproducción exacta de Spotify al milisegundo (por MCP o Spotify Web API PKCE).
 */
export async function syncSpotifyPlayback(
  spotifyUri: string,
  positionMs: number,
  isPlaying: boolean
): Promise<{ ok: boolean; via?: 'mcp' | 'web_api'; error?: string }> {
  const safePos = Math.max(0, Math.round(positionMs));

  const mcpUrl = getStoredSpotifyMcpUrl();
  if (mcpUrl) {
    const tool = isPlaying ? 'play_track_at_position' : 'pause_playback';
    const r = await callSpotifyMcpTool(tool, { uri: spotifyUri, position_ms: safePos }, mcpUrl);
    if (r.ok) return { ok: true, via: 'mcp' };
  }

  const token = await getValidSpotifyToken();
  if (!token) return { ok: false, error: 'Sin sesión Spotify PKCE ni MCP activo.' };

  try {
    if (isPlaying) {
      const res = await fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: [spotifyUri],
          position_ms: safePos,
        }),
      });
      if (!res.ok) {
        const msg = res.status === 404 ? 'Abre Spotify en un dispositivo activo.' : `Spotify API HTTP ${res.status}`;
        return { ok: false, error: msg };
      }
      return { ok: true, via: 'web_api' };
    } else {
      await fetch('https://api.spotify.com/v1/me/player/pause', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      return { ok: true, via: 'web_api' };
    }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error sincronizando Spotify.' };
  }
}
