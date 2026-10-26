import type { ReactNode } from "react";
import { ApiError } from "../lib/api";

/**
 * Vistas de estado compartidas por toda la app (dashboard, carteles, etc.).
 * Son genericas: no saben de que pantalla vienen, solo reciben textos y callbacks.
 */

/** Convierte cualquier error en un mensaje legible para el usuario. */
export function errorMessage(error: unknown): string {
  // Error de la API: el servidor ya manda un mensaje pensado para mostrarse.
  if (error instanceof ApiError) return error.message;
  // Sin red, fetch no recibe respuesta y lanza un TypeError, no un ApiError.
  return "No se pudo contactar al servidor. Revisa tu conexion.";
}

export function Loading({ label = "Cargando..." }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

export function ErrorState({
  title = "Algo salio mal",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-rose-900 bg-rose-950/40 px-6 py-10 text-center"
    >
      <h2 className="text-lg font-semibold text-rose-200">{title}</h2>
      <p className="text-sm text-rose-300">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-rose-400"
      >
        Reintentar
      </button>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-700 px-6 py-10 text-center">
      <h2 className="text-lg font-semibold text-slate-200">{title}</h2>
      {description && <p className="text-sm text-slate-400">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
