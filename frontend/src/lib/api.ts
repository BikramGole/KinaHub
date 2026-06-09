export const API_BASE = import.meta.env.VITE_API_URL || '/api';

export interface ApiOptions extends RequestInit {
  token?: string | null;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, headers, ...requestOptions } = options;
  const response = await fetch(`${API_BASE}${path}`, {
    ...requestOptions,
    headers: {
      ...(requestOptions.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    let detail = 'Request failed';
    try {
      const data = await response.json();
      if (typeof data.detail === 'string') {
        detail = data.detail;
      } else if (typeof data.error === 'string') {
        detail = data.error;
      } else {
        const errors: string[] = [];
        for (const key in data) {
          if (Array.isArray(data[key])) {
            errors.push(data[key][0]);
          } else if (typeof data[key] === 'string') {
            errors.push(data[key]);
          }
        }
        detail = errors.length > 0 ? errors.join(' ') : JSON.stringify(data);
      }
    } catch {
      detail = response.statusText;
    }
    throw new Error(detail);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
