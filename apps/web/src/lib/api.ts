export class ApiError extends Error {
  constructor(
    public status: number,
    public body: { code?: string; message?: string | string[] } | null,
  ) {
    super(Array.isArray(body?.message) ? body.message.join(', ') : (body?.message ?? `HTTP ${status}`));
  }
  get code() {
    return this.body?.code;
  }
}

async function send(path: string, init?: RequestInit) {
  return fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...init,
    headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  });
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await send(path, init);
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const refreshed = await send('/auth/refresh', { method: 'POST' });
    if (refreshed.ok) res = await send(path, init);
  }
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
