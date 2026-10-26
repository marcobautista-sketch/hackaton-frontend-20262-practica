import type { ApiErrorBody } from "../types/api";

const BASE = import.meta.env.VITE_API_BASE_URL;

/** Error tipado de la API. `code` es estable: decidir con el, no con el `message`. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly traceId: string;
  readonly details: { field: string; message: string }[];

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = body.status;
    this.code = body.code;
    this.traceId = body.traceId;
    this.details = body.details ?? [];
  }

  /** Mensaje del servidor para un campo concreto del formulario, si lo hay. */
  fieldError(field: string): string | undefined {
    return this.details.find((d) => d.field === field)?.message;
  }
}

/** Se dispara cuando el token deja de servir, para que la app vuelva al login. */
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(fn: UnauthorizedHandler | null): void {
  onUnauthorized = fn;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

/**
 * Unica puerta de salida hacia la API.
 * Lanza ApiError con el codigo del servidor; nunca devuelve `any`.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token, signal } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let parsed: ApiErrorBody;
    try {
      parsed = (await res.json()) as ApiErrorBody;
    } catch {
      parsed = {
        status: res.status,
        code: "NETWORK_ERROR",
        message: "No se pudo contactar al servidor.",
        traceId: "",
      };
    }
    // 401 = el token murio: avisar a la app.
    if (res.status === 401 && onUnauthorized) onUnauthorized();
    throw new ApiError(parsed);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Query string que omite los valores vacios (vacio = filtro no aplicado). */
export function buildQuery(
  params: Record<string, string | number | undefined | null>
): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
