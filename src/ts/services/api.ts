import type { ApiRecipe, ApiIngredient, ApiStep, LoginResponse, RegisterResponse } from '../../types.ts';
import { getAccessToken, refreshAccessToken, clearAuth } from './auth.ts';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const token = getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && !isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(path, options, true);
    clearAuth();
    window.location.href = '../templates/login.html';
    throw new ApiError(401, null, 'Sessão expirada');
  }

  if (res.status === 204) return undefined as unknown as T;

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body, `Erro ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// Autenticação — sem token (chamadas públicas)
export const authService = {
  login(username: string, password: string): Promise<LoginResponse> {
    return fetch(`${BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new ApiError(res.status, body, `Erro ${res.status}`);
      }
      return res.json() as Promise<LoginResponse>;
    });
  },

  register(username: string, email: string, password: string): Promise<RegisterResponse> {
    return fetch(`${BASE_URL}/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new ApiError(res.status, body, `Erro ${res.status}`);
      }
      return res.json() as Promise<RegisterResponse>;
    });
  },
};

// Receitas
export const recipeService = {
  getAll: (): Promise<ApiRecipe[]> => request<ApiRecipe[]>('/recipes/'),

  getById: (id: number): Promise<ApiRecipe> => request<ApiRecipe>(`/recipes/${id}/`),

  create: (data: { title: string; description?: string }): Promise<ApiRecipe> =>
    request<ApiRecipe>('/recipes/', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: Partial<{ title: string; description: string }>): Promise<ApiRecipe> =>
    request<ApiRecipe>(`/recipes/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: number): Promise<void> =>
    request<void>(`/recipes/${id}/`, { method: 'DELETE' }),

  fork: (id: number, affectionateNote: string): Promise<ApiRecipe> =>
    request<ApiRecipe>(`/recipes/${id}/fork/`, {
      method: 'POST',
      body: JSON.stringify({ affectionate_note: affectionateNote }),
    }),
};

// Ingredientes
export const ingredientService = {
  create: (data: { recipe: number; name: string; quantity: string; is_locked?: boolean }): Promise<ApiIngredient> =>
    request<ApiIngredient>('/ingredients/', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: Partial<{ name: string; quantity: string; is_locked: boolean }>): Promise<ApiIngredient> =>
    request<ApiIngredient>(`/ingredients/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: number): Promise<void> =>
    request<void>(`/ingredients/${id}/`, { method: 'DELETE' }),
};

// Passos
export const stepService = {
  create: (data: { recipe: number; step_number: number; instruction: string; is_locked?: boolean }): Promise<ApiStep> =>
    request<ApiStep>('/steps/', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: Partial<{ step_number: number; instruction: string; is_locked: boolean }>): Promise<ApiStep> =>
    request<ApiStep>(`/steps/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: number): Promise<void> =>
    request<void>(`/steps/${id}/`, { method: 'DELETE' }),
};
