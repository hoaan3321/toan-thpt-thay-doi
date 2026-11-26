const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

export interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  user?: { id: string; email?: string };
}

const SESSION_KEY = 'toan-thpt-supabase-session';

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

function saveSession(session: AuthSession | null) {
  if (session) {
    const normalized = { ...session, expires_at: session.expires_at ?? (session.expires_in ? Math.floor(Date.now() / 1000) + session.expires_in : undefined) };
    localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
  } else localStorage.removeItem(SESSION_KEY);
}

export async function refreshSession(): Promise<AuthSession | null> {
  const session = getSession();
  if (!session?.refresh_token || !isSupabaseConfigured) return null;
  const res = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: anonKey ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  if (!res.ok) {
    saveSession(null);
    return null;
  }
  const next = (await res.json()) as AuthSession;
  saveSession(next);
  return next;
}

async function ensureFreshSession(): Promise<void> {
  const session = getSession();
  if (!session) return;
  const now = Math.floor(Date.now() / 1000);
  if (!session.expires_at || session.expires_at - now < 120) await refreshSession();
}

function headers(extra: Record<string, string> = {}, useAuth = false): HeadersInit {
  const session = useAuth ? getSession() : null;
  return {
    apikey: anonKey ?? '',
    Authorization: `Bearer ${session?.access_token ?? anonKey ?? ''}`,
    ...extra,
  };
}

async function parseError(res: Response): Promise<string> {
  const text = await res.text();
  return `Supabase ${res.status}: ${text}`;
}

async function fetchWithRetry(input: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return fetch(input, init);
  }
}

async function authedFetch(input: string, init: RequestInit, useAuth: boolean): Promise<Response> {
  if (useAuth) await ensureFreshSession();
  let res = await fetchWithRetry(input, init);
  if (useAuth && res.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      const nextInit: RequestInit = { ...init, headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${refreshed.access_token}` } };
      res = await fetchWithRetry(input, nextInit);
    }
  }
  return res;
}

export async function supabaseGet<T>(path: string, params: URLSearchParams, useAuth = false): Promise<T> {
  if (!isSupabaseConfigured) throw new Error('Chưa cấu hình Supabase');
  let res: Response;
  try {
    res = await authedFetch(`${url}/rest/v1/${path}?${params.toString()}`, { headers: headers({}, useAuth) }, useAuth);
  } catch {
    throw new Error('Mạng đang chập chờn, thầy bấm lại giúp em nhé.');
  }
  if (!res.ok) throw new Error(res.status === 401 ? 'Phiên đăng nhập đã hết hạn, thầy đăng nhập lại nhé.' : await parseError(res));
  return (await res.json()) as T;
}

export async function supabaseCount(path: string, params: URLSearchParams): Promise<number> {
  if (!isSupabaseConfigured) throw new Error('Chưa cấu hình Supabase');
  const p = new URLSearchParams(params);
  p.set('select', 'id');
  const res = await fetch(`${url}/rest/v1/${path}?${p.toString()}`, {
    headers: headers({ Prefer: 'count=exact', Range: '0-0' }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const range = res.headers.get('content-range') ?? '';
  const total = Number(range.split('/')[1]);
  return Number.isFinite(total) ? total : 0;
}

export async function supabaseInsert<T>(path: string, body: unknown, useAuth = false): Promise<T> {
  if (!isSupabaseConfigured) throw new Error('Chưa cấu hình Supabase');
  const res = await authedFetch(`${url}/rest/v1/${path}`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=representation' }, useAuth),
    body: JSON.stringify(body),
  }, useAuth);
  if (!res.ok) throw new Error(res.status === 401 ? 'Phiên đăng nhập đã hết hạn, thầy đăng nhập lại nhé.' : await parseError(res));
  return (await res.json()) as T;
}

export async function supabaseUpdate<T>(path: string, params: URLSearchParams, body: unknown, useAuth = true): Promise<T> {
  if (!isSupabaseConfigured) throw new Error('Chưa cấu hình Supabase');
  const res = await authedFetch(`${url}/rest/v1/${path}?${params.toString()}`, {
    method: 'PATCH',
    headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=representation' }, useAuth),
    body: JSON.stringify(body),
  }, useAuth);
  if (!res.ok) throw new Error(res.status === 401 ? 'Phiên đăng nhập đã hết hạn, thầy đăng nhập lại nhé.' : await parseError(res));
  return (await res.json()) as T;
}

export async function supabaseDelete(path: string, params: URLSearchParams, useAuth = true): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Chưa cấu hình Supabase');
  const res = await authedFetch(`${url}/rest/v1/${path}?${params.toString()}`, {
    method: 'DELETE',
    headers: headers({ Prefer: 'return=minimal' }, useAuth),
  }, useAuth);
  if (!res.ok) throw new Error(res.status === 401 ? 'Phiên đăng nhập đã hết hạn, thầy đăng nhập lại nhé.' : await parseError(res));
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  if (!isSupabaseConfigured) throw new Error('Chưa cấu hình Supabase');
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const session = (await res.json()) as AuthSession;
  saveSession(session);
  return session;
}

export async function signUp(email: string, password: string): Promise<AuthSession | null> {
  if (!isSupabaseConfigured) throw new Error('Chưa cấu hình Supabase');
  const res = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: anonKey ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as AuthSession;
  if (data.access_token) {
    saveSession(data);
    return data;
  }
  return null;
}

export function signOut() {
  saveSession(null);
}

export function eqParams(values: Record<string, string | number | undefined>): URLSearchParams {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(values)) {
    if (v !== undefined && v !== '') p.set(k, `eq.${v}`);
  }
  return p;
}

export function ilike(value: string): string {
  return `ilike.*${value.replace(/[%*,()]/g, ' ')}*`;
}
