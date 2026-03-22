import { env } from '../../config/env';
import { mockRouter } from '../mockRouter';

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: {
    code: string;
    message: string;
  };
}

export type RequestFn = <T>(endpoint: string, options?: RequestInit) => Promise<T>;

export function createRequestFn(): RequestFn {
  const baseUrl = env.apiBaseUrl;

  return async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (env.useMock) return mockRouter<T>(endpoint, options?.method);

    const response = await fetch(`${baseUrl}${endpoint}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (response.status === 401) {
      localStorage.removeItem('everyup_user');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const json: ApiResponse<T> = await response.json();

    if (!json.success) {
      throw new Error(json.error?.message || 'API Error');
    }

    return json.data as T;
  };
}
