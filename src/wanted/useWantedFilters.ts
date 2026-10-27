import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { buildQuery } from "../lib/api";
import type { FruitFilter, WantedSort, WantedStatus } from "../types/api";
import { FRUIT_FILTERS, WANTED_SIZES, WANTED_SORTS, WANTED_STATUSES } from "../types/api";

export type WantedSize = (typeof WANTED_SIZES)[number];

/** Todo lo que define el listado. Vive SOLO en la URL; esto es su lectura ya validada. */
export interface WantedFilters {
  page: number;
  size: WantedSize;
  sort: WantedSort;
  status: WantedStatus | null;
  crewId: string | null;
  fruit: FruitFilter | null;
  q: string;
}

export const DEFAULT_SIZE: WantedSize = 20;
export const DEFAULT_SORT: WantedSort = "bounty,desc";
const MAX_Q = 100;

export const STATUS_LABELS: Record<WantedStatus, string> = {
  AT_LARGE: "Profugo",
  CAPTURED: "Capturado",
  MISSING: "Desaparecido",
};

export const FRUIT_LABELS: Record<FruitFilter, string> = {
  PARAMECIA: "Paramecia",
  ZOAN: "Zoan",
  LOGIA: "Logia",
  NONE: "Sin fruta",
};

/** Filtros que se pueden cambiar; `page` va aparte porque tiene sus propias reglas. */
export type FilterPatch = Partial<Omit<WantedFilters, "page">>;

/** Devuelve el valor solo si esta en la lista permitida; si no, null (= usar el default). */
function pick<T extends string | number>(allowed: readonly T[], raw: string | null): T | null {
  if (raw === null) return null;
  return allowed.find((v) => String(v) === raw) ?? null;
}

/**
 * Convierte la URL en filtros validos. Cualquier valor raro (size=999, page=-4, sort=basura)
 * cae al default: la vista nunca se rompe ni manda un 400 por culpa de la URL.
 */
function parse(sp: URLSearchParams): WantedFilters {
  const rawPage = Number(sp.get("page"));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 0;

  return {
    page,
    size: pick(WANTED_SIZES, sp.get("size")) ?? DEFAULT_SIZE,
    sort: pick(WANTED_SORTS, sp.get("sort")) ?? DEFAULT_SORT,
    status: pick(WANTED_STATUSES, sp.get("status")),
    crewId: sp.get("crewId")?.trim() || null,
    fruit: pick(FRUIT_FILTERS, sp.get("fruit")),
    q: (sp.get("q") ?? "").trim().slice(0, MAX_Q),
  };
}

/** Escribe los filtros en la URL omitiendo los defaults, para que el enlace quede limpio. */
function serialize(f: WantedFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.status) sp.set("status", f.status);
  if (f.crewId) sp.set("crewId", f.crewId);
  if (f.fruit) sp.set("fruit", f.fruit);
  if (f.sort !== DEFAULT_SORT) sp.set("sort", f.sort);
  if (f.size !== DEFAULT_SIZE) sp.set("size", String(f.size));
  if (f.page > 0) sp.set("page", String(f.page));
  return sp;
}

/**
 * La URL es la unica fuente de verdad del listado: no hay copia de los filtros en useState.
 * Recargar, compartir el enlace o usar atras/adelante reconstruye exactamente lo mismo.
 */
export function useWantedFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.toString();

  // Se recalcula solo cuando cambia el texto de la URL, no en cada render.
  const filters = useMemo(() => parse(new URLSearchParams(raw)), [raw]);

  /** Query exacta para la API. Es la dependencia del fetch: si no cambia, no se vuelve a pedir. */
  const apiQuery = useMemo(
    () =>
      buildQuery({
        page: filters.page,
        size: filters.size,
        sort: filters.sort,
        status: filters.status,
        crewId: filters.crewId,
        fruit: filters.fruit,
        q: filters.q,
      }),
    [filters]
  );

  /** Cambiar cualquier filtro vuelve a la pagina 0: la pagina anterior puede ya no existir. */
  const setFilters = useCallback(
    (patch: FilterPatch, opts: { replace?: boolean } = {}) => {
      setSearchParams(
        (prev) => serialize({ ...parse(prev), ...patch, page: 0 }),
        { replace: opts.replace }
      );
    },
    [setSearchParams]
  );

  const setPage = useCallback(
    (page: number, opts: { replace?: boolean } = {}) => {
      setSearchParams(
        (prev) => serialize({ ...parse(prev), page: Math.max(0, page) }),
        { replace: opts.replace }
      );
    },
    [setSearchParams]
  );

  // Quita los filtros pero respeta el orden y el tamano de pagina elegidos.
  const clearFilters = useCallback(() => {
    setFilters({ q: "", status: null, crewId: null, fruit: null });
  }, [setFilters]);

  // Hay filtros "de verdad" activos (no cuenta orden, tamano ni pagina).
  const hasActiveFilters = Boolean(filters.q || filters.status || filters.crewId || filters.fruit);

  return { filters, apiQuery, setFilters, setPage, clearFilters, hasActiveFilters };
}
