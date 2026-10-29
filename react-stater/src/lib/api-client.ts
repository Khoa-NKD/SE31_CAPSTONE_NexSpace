import type { ApiResponse } from '@/types/api';

export class ApiError extends Error {
  public status: number;
  public statusText: string;
  public data: unknown;
  public validationErrors?: Record<string, string>;

  constructor(status: number, statusText: string, data: unknown) {
    const errorPayload = data as { message?: string; validationErrors?: Record<string, string> } | null;
    const msg = errorPayload?.message || `HTTP ${status} ${statusText}`;
    super(msg);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
    this.validationErrors = errorPayload?.validationErrors;
  }
}

export type QueryParamValue = string | number | boolean | undefined | null | Array<string | number | boolean>;

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, QueryParamValue>;
  signal?: AbortSignal;
  unwrapEnvelope?: boolean; // Default true: unwraps { success, data } envelope
}

type AuthHeaderProvider = () => string | null | Promise<string | null>;
let authHeaderProvider: AuthHeaderProvider | null = null;

/**
 * Configure dynamic authentication header integration point.
 * Insulates the HTTP client from specific storage mechanisms (cookies, tokens, etc.).
 */
export function setAuthHeaderProvider(provider: AuthHeaderProvider | null): void {
  authHeaderProvider = provider;
}

/**
 * Resolves the appropriate API base URL with SSR safety for TanStack Start.
 */
export function getApiBaseUrl(): string {
  // Client-side browser execution
  if (typeof window !== 'undefined') {
    return import.meta.env.VITE_API_BASE_URL || '/api/v1';
  }
  // Server-side rendering (SSR) execution inside Node.js / Nitro
  return (
    process.env.INTERNAL_API_URL ||
    process.env.VITE_API_BASE_URL ||
    'http://localhost:4000/api/v1'
  );
}

/**
 * Serializes query parameters into a URL-encoded string.
 */
export function buildQueryString(params?: Record<string, QueryParamValue>): string {
  if (!params) return '';

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      value.forEach((v) => searchParams.append(key, String(v)));
    } else {
      searchParams.append(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

/**
 * Core HTTP Request Execution.
 */
export async function request<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers: customHeaders, unwrapEnvelope = true, signal, ...restOptions } = options;

  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const queryString = buildQueryString(params);
  const fullUrl = `${baseUrl}${cleanEndpoint}${queryString}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(customHeaders as Record<string, string>)
  };

  // Add JSON Content-Type when sending a body
  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Inject authentication header if a provider is configured
  if (authHeaderProvider) {
    try {
      const authHeader = await authHeaderProvider();
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }
    } catch {
      // Ignore auth provider errors during public requests
    }
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    signal,
    ...restOptions
  };

  if (body !== undefined) {
    fetchOptions.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const response = await fetch(fullUrl, fetchOptions);

  // Handle 204 No Content
  if (response.status === 204) {
    return null as unknown as T;
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let responseData: unknown = null;
  if (isJson) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  } else {
    responseData = await response.text();
  }

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText, responseData);
  }

  // Envelope Unwrapping:
  // If the payload matches { success: true, data: T }, return data.
  // Otherwise, return responseData directly (e.g. PageResponse or raw array/DTO).
  if (unwrapEnvelope && responseData && typeof responseData === 'object' && 'data' in responseData) {
    const envelope = responseData as ApiResponse<T>;
    return envelope.data;
  }

  return responseData as T;
}

/**
 * Convenient typed API client object.
 */
export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions): Promise<T> =>
    request<T>(endpoint, 'GET', undefined, options),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(endpoint, 'POST', body, options),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(endpoint, 'PUT', body, options),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request<T>(endpoint, 'PATCH', body, options),

  delete: <T>(endpoint: string, options?: RequestOptions): Promise<T> =>
    request<T>(endpoint, 'DELETE', undefined, options)
};

export default apiClient;
