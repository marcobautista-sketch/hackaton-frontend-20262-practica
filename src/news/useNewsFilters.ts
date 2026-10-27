import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { NewsPriority, NewsStatus, NewsType } from "../types/api";
import { NEWS_PRIORITIES, NEWS_STATUSES, NEWS_TYPES } from "../types/api";

/** Filtros del feed. Viven SOLO en la URL; esto es su lectura ya validada. */
export interface NewsFilters {
  type: NewsType | null;
  priority: NewsPriority | null;
  status: NewsStatus | null;
}

export const TYPE_LABELS: Record<NewsType, string> = {
  BOUNTY_UPDATE: "Recompensas",
  BATTLE: "Batallas",
  MARINE_OPERATION: "Operaciones de la Marina",
  WORLD_GOVERNMENT: "Gobierno Mundial",
  DISCOVERY: "Descubrimientos",
};

export const PRIORITY_LABELS: Record<NewsPriority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Critica",
};

export const NEWS_STATUS_LABELS: Record<NewsStatus, string> = {
  RUMOR: "Rumor",
  CONFIRMED: "Confirmada",
  DEBUNKED: "Desmentida",
};

/** Solo acepta valores de la lista; cualquier otra cosa en la URL se ignora (= sin filtro). */
function pick<T extends string>(allowed: readonly T[], raw: string | null): T | null {
  return allowed.find((v) => v === raw) ?? null;
}

function parse(sp: URLSearchParams): NewsFilters {
  return {
    type: pick(NEWS_TYPES, sp.get("type")),
    priority: pick(NEWS_PRIORITIES, sp.get("priority")),
    status: pick(NEWS_STATUSES, sp.get("status")),
  };
}

function serialize(f: NewsFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.type) sp.set("type", f.type);
  if (f.priority) sp.set("priority", f.priority);
  if (f.status) sp.set("status", f.status);
  return sp;
}

/**
 * La URL es la unica fuente de verdad de los filtros del feed.
 * Recargar o compartir el enlace reconstruye exactamente los mismos filtros.
 */
export function useNewsFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.toString();

  // Mismo texto de URL = mismo objeto: el feed no se vuelve a pedir si no cambian los filtros.
  const filters = useMemo(() => parse(new URLSearchParams(raw)), [raw]);

  const setFilters = useCallback(
    (patch: Partial<NewsFilters>) => {
      setSearchParams((prev) => serialize({ ...parse(prev), ...patch }));
    },
    [setSearchParams]
  );

  const clearFilters = useCallback(() => {
    setFilters({ type: null, priority: null, status: null });
  }, [setFilters]);

  const hasActiveFilters = Boolean(filters.type || filters.priority || filters.status);

  return { filters, setFilters, clearFilters, hasActiveFilters };
}
