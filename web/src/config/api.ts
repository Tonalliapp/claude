const API_BASE = 'https://api.tonalli.app/api/v1';
const REQUEST_TIMEOUT_MS = 30_000;

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function loadTokens() {
  accessToken = localStorage.getItem('tonalli_access_token');
  refreshToken = localStorage.getItem('tonalli_refresh_token');
}

export function saveTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('tonalli_access_token', access);
  localStorage.setItem('tonalli_refresh_token', refresh);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('tonalli_access_token');
  localStorage.removeItem('tonalli_refresh_token');
}

export function getAccessToken() {
  return accessToken;
}

// Mutex: only one refresh request at a time
let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    saveTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = doRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  return fetch(url, { ...options, signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
  });
}

function handleFetchError(err: unknown): never {
  if (err instanceof DOMException && err.name === 'AbortError') {
    throw new ApiError(
      'La solicitud tardó demasiado. Verifica tu conexión e intenta de nuevo.',
      'REQUEST_TIMEOUT',
    );
  }
  throw err;
}

interface FetchOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  formData?: FormData;
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, formData } = options;

  const headers: Record<string, string> = {};
  if (!formData) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const fetchOptions: RequestInit = { method, headers };

  if (formData) {
    fetchOptions.body = formData;
  } else if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_BASE}${path}`, fetchOptions);
  } catch (err) {
    handleFetchError(err);
  }

  if (res.status === 401 && auth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      fetchOptions.headers = headers;
      try {
        res = await fetchWithTimeout(`${API_BASE}${path}`, fetchOptions);
      } catch (err) {
        handleFetchError(err);
      }
    } else {
      throw new ApiError('Sesión expirada. Inicia sesión de nuevo.', 'SESSION_EXPIRED');
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    const message = errorData?.error?.message || `Error ${res.status}`;
    const code = errorData?.error?.code || 'UNKNOWN';
    throw new ApiError(message, code);
  }

  const data = await res.json();
  return data as T;
}

export async function apiFetchBlob(path: string, options: FetchOptions = {}): Promise<Blob> {
  const { method = 'GET', body, auth = false, formData } = options;

  const headers: Record<string, string> = {};
  if (!formData) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const fetchOptions: RequestInit = { method, headers };

  if (formData) {
    fetchOptions.body = formData;
  } else if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_BASE}${path}`, fetchOptions);
  } catch (err) {
    handleFetchError(err);
  }

  if (res.status === 401 && auth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      fetchOptions.headers = headers;
      try {
        res = await fetchWithTimeout(`${API_BASE}${path}`, fetchOptions);
      } catch (err) {
        handleFetchError(err);
      }
    } else {
      throw new ApiError('Sesión expirada. Inicia sesión de nuevo.', 'SESSION_EXPIRED');
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    const message = errorData?.error?.message || `Error ${res.status}`;
    const code = errorData?.error?.code || 'UNKNOWN';
    throw new ApiError(message, code);
  }

  return res.blob();
}

export class ApiError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}
