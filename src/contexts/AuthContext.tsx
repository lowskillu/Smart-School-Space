import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { setAccessToken } from "@/integrations/api/client";


export type UserRole = "admin" | "teacher" | "student" | "counselor" | "curator";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  role_id: string;
  permissions: string[];
  teacher_id: string | null;
  student_id: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const REFRESH_TOKEN_KEY = "ss_refresh_token";

// ─── API helpers (token-aware) ─────────────────────────────────────────────

async function apiFetch(path: string, opts: RequestInit = {}, token?: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(path, { ...opts, headers });
  return res;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessTokenInternal, setAccessTokenInternal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Keep a ref so callbacks always see the latest token without re-subscribing
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = accessTokenInternal;

  // ── Restore session on mount using stored refresh token ─────────────────
  useEffect(() => {
    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refresh) {
      setIsLoading(false);
      return;
    }

    apiFetch("/api/auth/refresh", {
      method: "POST",
      headers: { Authorization: `Bearer ${refresh}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.access_token) {
          setAccessTokenInternal(data.access_token);
          setAccessToken(data.access_token); // Update API client
          setUser(data.user as AuthUser);
          localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
        } else {
          localStorage.removeItem(REFRESH_TOKEN_KEY);
        }
      })
      .catch(() => localStorage.removeItem(REFRESH_TOKEN_KEY))
      .finally(() => setIsLoading(false));

    // Handle logout dispatched by api client interceptor (e.g. refresh failed)
    const handleLogout = () => logout();
    window.addEventListener("ss:auth:logout", handleLogout);
    return () => window.removeEventListener("ss:auth:logout", handleLogout);
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Login failed");

    setAccessTokenInternal(data.access_token);
    setAccessToken(data.access_token); // Update API client
    setUser(data.user as AuthUser);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await apiFetch(
        "/api/auth/logout",
        { method: "POST" },
        tokenRef.current,
      );
    } catch {
      // Best-effort — clear state regardless
    }
    setAccessTokenInternal(null);
    setAccessToken(null); // Update API client
    setUser(null);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        accessToken: accessTokenInternal,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
