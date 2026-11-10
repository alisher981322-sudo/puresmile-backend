/**
 * PureDent Universal API Configuration
 * Supports unified full-stack (Railway, Localhost) and decoupled frontend/backend (Vercel + Railway).
 */

const RAW_API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '';
export const API_BASE = RAW_API_BASE ? RAW_API_BASE.replace(/\/+$/, '') : '';

/**
 * Returns fully qualified API URL.
 * Example: apiUrl('/api/services') =>
 * - If VITE_API_URL='https://api.yourclinic.com' -> 'https://api.yourclinic.com/api/services'
 * - If VITE_API_URL is unset -> '/api/services' (relative, same-origin)
 */
export function apiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!API_BASE) {
    return cleanEndpoint;
  }
  return `${API_BASE}${cleanEndpoint}`;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

/**
 * Robust fetch wrapper that gracefully checks content-type and handles errors
 */
export async function apiFetch<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const url = apiUrl(endpoint);

  const res = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const textPreview = (await res.text()).slice(0, 150);
    throw new Error(
      `API endpoint returned non-JSON response (${res.status} ${res.statusText}). Body begins with: ${textPreview}`
    );
  }

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || json?.message || `HTTP error ${res.status}`);
  }

  return json;
}
