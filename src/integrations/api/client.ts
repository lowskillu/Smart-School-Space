/**
 * JWT-aware API client for SmartSchool.
 *
 * - Reads the access token from the React Auth context via a module-level setter
 *   (avoids React hook rules — this is a plain TS module, not a component).
 * - Automatically injects Authorization: Bearer <token> on every request.
 * - On 401 responses: attempts a single token refresh, then retries.
 * - All calls go to /api/* which Vite proxies to Flask in dev mode.
 */

const API_BASE = "/api";
const REFRESH_TOKEN_KEY = "ss_refresh_token";

// Access token kept in closure (in-memory, not localStorage — XSS safe)
let _accessToken: string | null = null;
let _isRefreshing = false;
let _refreshQueue: Array<(token: string | null) => void> = [];

/**
 * Called by AuthContext after login/refresh to inject the current token
 * into the API client without circular imports.
 */
export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refresh}`,
      },
    });
    if (!res.ok) {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      return null;
    }
    const data = await res.json();
    _accessToken = data.access_token;
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
  isMultipart = false
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> ?? {}),
    "Bypass-Tunnel-Reminder": "true",
  };
  
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  if (_accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
  }

  const res = await fetch(url, { ...options, headers });

  // ── Handle 401: attempt token refresh once ──────────────────────────────
  if (res.status === 401 && retry) {
    if (_isRefreshing) {
      // Queue this request until refresh completes
      const newToken = await new Promise<string | null>((resolve) => {
        _refreshQueue.push(resolve);
      });
      return request<T>(path, options, false, isMultipart);
    }

    _isRefreshing = true;
    const newToken = await refreshAccessToken();
    _isRefreshing = false;

    // Resolve queued requests
    _refreshQueue.forEach((resolve) => resolve(newToken));
    _refreshQueue = [];

    if (newToken) {
      return request<T>(path, options, false, isMultipart);
    }

    // Refresh failed — dispatch a logout event for AuthContext to handle
    window.dispatchEvent(new CustomEvent("ss:auth:logout"));
    throw new Error("Session expired. Please log in again.");
  }

  if (res.status === 204) return undefined as unknown as T;

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const errMsg =
      body?.error?.message ||
      body?.error ||
      `API error ${res.status}`;
    throw new Error(errMsg);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  postMultipart: <T>(path: string, body: FormData) =>
    request<T>(path, { method: "POST", body }, true, true),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
