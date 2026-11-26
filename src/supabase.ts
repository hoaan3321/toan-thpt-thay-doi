const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

function headers(extra: Record<string, string> = {}): HeadersInit {
  return {
    apikey: anonKey ?? '',
    Authorization: `Bearer ${anonKey ?? ''}`,
    ...extra,
  };
}

export async function supabaseGet<T>(path: string, params: URLSearchParams): Promise<T> {
  if (!isSupabaseConfigured) throw new Error('Chưa cấu hình Supabase');
  const res = await fetch(`${url}/rest/v1/${path}?${params.toString()}`, { headers: headers() });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export async function supabaseCount(path: string, params: URLSearchParams): Promise<number> {
  if (!isSupabaseConfigured) throw new Error('Chưa cấu hình Supabase');
  const p = new URLSearchParams(params);
  p.set('select', 'id');
  const res = await fetch(`${url}/rest/v1/${path}?${p.toString()}`, {
    headers: headers({ Prefer: 'count=exact', Range: '0-0' }),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const range = res.headers.get('content-range') ?? '';
  const total = Number(range.split('/')[1]);
  return Number.isFinite(total) ? total : 0;
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
