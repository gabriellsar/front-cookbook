import type { AuthState, LoginResponse } from '../../types.ts';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/';

const KEYS = {
  access: 'panela_access',
  refresh: 'panela_refresh',
  username: 'panela_username',
  userId: 'panela_user_id',
  role: 'panela_role',
} as const;

export function parseJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function saveAuth(data: LoginResponse, username: string): void {
  const payload = parseJwtPayload(data.access);
  const userId = (payload['user_id'] as number | undefined) ?? 0;
  const role = (payload['role'] as 'GUARDIAN' | 'HEIR' | undefined) ?? null;

  localStorage.setItem(KEYS.access, data.access);
  localStorage.setItem(KEYS.refresh, data.refresh);
  localStorage.setItem(KEYS.username, username);
  localStorage.setItem(KEYS.userId, String(userId));
  localStorage.setItem(KEYS.role, role ?? '');
}

export function clearAuth(): void {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

export function getAccessToken(): string | null {
  return localStorage.getItem(KEYS.access);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(KEYS.refresh);
}

export function isLoggedIn(): boolean {
  return getAccessToken() !== null;
}

export function getCurrentUser(): AuthState | null {
  const access = localStorage.getItem(KEYS.access);
  if (!access) return null;

  const refresh = localStorage.getItem(KEYS.refresh) ?? '';
  const username = localStorage.getItem(KEYS.username) ?? '';
  const userId = parseInt(localStorage.getItem(KEYS.userId) ?? '0', 10);
  const rawRole = localStorage.getItem(KEYS.role);
  const role: AuthState['role'] =
    rawRole === 'GUARDIAN' || rawRole === 'HEIR' ? rawRole : null;

  return { access, refresh, username, userId, role };
}

export async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) {
    clearAuth();
    return false;
  }

  try {
    const res = await fetch(`${BASE_URL}api/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) {
      clearAuth();
      return false;
    }

    const data = (await res.json()) as { access: string };
    localStorage.setItem(KEYS.access, data.access);
    return true;
  } catch {
    clearAuth();
    return false;
  }
}

export function requireAuth(redirectTo = '../templates/login.html'): void {
  if (!isLoggedIn()) {
    window.location.href = redirectTo;
  }
}

export function logout(): void {
  clearAuth();
  window.location.href = '../templates/login.html';
}
