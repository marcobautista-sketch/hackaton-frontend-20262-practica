import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { apiFetch } from "../lib/api";
import type { Crew, WantedSort, WantedStatus } from "../types/api";
import { FRUIT_FILTERS, WANTED_SIZES, WANTED_SORTS, WANTED_STATUSES } from "../types/api";
import { FRUIT_LABELS, STATUS_LABELS } from "./useWantedFilters";
import type { FilterPatch, WantedFilters as Filters } from "./useWantedFilters";

const SORT_LABELS: Record<WantedSort, string> = {
  "bounty,desc": "Mayor recompensa",
  "name,asc": "Nombre (A-Z)",
  "updatedAt,desc": "Actualizados recientemente",
};

/** Espera tras la ultima tecla antes de escribir la busqueda en la URL (y pedir a la API). */
const SEARCH_DEBOUNCE_MS = 350;

type CrewsState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; crews: Crew[] };

interface Props {
  filters: Filters;
  setFilters: (patch: FilterPatch, opts?: { replace?: boolean }) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function WantedFilters({ filters, setFilters, onClear, hasActiveFilters }: Props) {
  const { token } = useAuth();

  // --- Busqueda con debounce ---
  // `draft` es solo lo que se esta escribiendo; el filtro real sigue siendo `filters.q` (la URL).
  const [draft, setDraft] = useState(filters.q);
  // Ultimo valor que escribimos nosotros en la URL, para distinguirlo de un cambio externo.
  const committed = useRef(filters.q);

  // Si la URL cambia por fuera (atras/adelante, "limpiar"), el input se alinea con ella.
  useEffect(() => {
    if (filters.q !== committed.current) {
      committed.current = filters.q;
      setDraft(filters.q);
    }
  }, [filters.q]);

  // Cada tecla reinicia el temporizador: solo la ultima, tras 350 ms quieto, llega a la URL.
  useEffect(() => {
    const next = draft.trim();
    if (next === filters.q) return;
    const timer = setTimeout(() => {
      committed.current = next;
      // replace: escribir no debe llenar el historial con "l", "lu", "luf"...
      setFilters({ q: next }, { replace: true });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, filters.q, setFilters]);

  // --- Tripulaciones para el select ---
  const [crews, setCrews] = useState<CrewsState>({ kind: "loading" });
  const [crewsAttempt, setCrewsAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<Crew[]>("/crews", { token, signal: controller.signal })
      .then((list) => setCrews({ kind: "ready", crews: list }))
      .catch(() => {
        if (controller.signal.aborted) return;
        setCrews({ kind: "error" });
      });
    return () => controller.abort();
  }, [token, crewsAttempt]);

  // Un crewId en la URL que no existe en este workspace se descarta en vez de romper la vista.
  useEffect(() => {
    if (crews.kind !== "ready" || !filters.crewId) return;
    if (!crews.crews.some((c) => c.id === filters.crewId)) {
      setFilters({ crewId: null }, { replace: true });
    }
  }, [crews, filters.crewId, setFilters]);

  return (
    <section className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-6">
      <label className="flex flex-col gap-1 text-xs text-slate-400 sm:col-span-2">
        Buscar por nombre o epiteto
        <input
          type="search"
          value={draft}
          maxLength={100}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ej. Sombrero de Paja"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Estado
        <select
          value={filters.status ?? ""}
          onChange={(e) => setFilters({ status: pickOrNull(WANTED_STATUSES, e.target.value) })}
          className={inputClass}
        >
          <option value="">Todos</option>
          {WANTED_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-slate-400">
        <span className="flex items-center justify-between">
          Tripulacion
          {crews.kind === "error" && (
            <button
              type="button"
              onClick={() => {
                setCrews({ kind: "loading" });
                setCrewsAttempt((n) => n + 1);
              }}
              className="text-rose-300 underline hover:text-rose-200"
            >
              Reintentar
            </button>
          )}
        </span>
        <select
          value={crews.kind === "ready" ? (filters.crewId ?? "") : ""}
          disabled={crews.kind !== "ready"}
          onChange={(e) => setFilters({ crewId: e.target.value || null })}
          className={inputClass}
        >
          <option value="">
            {crews.kind === "loading"
              ? "Cargando..."
              : crews.kind === "error"
                ? "No se pudo cargar"
                : "Todas"}
          </option>
          {crews.kind === "ready" &&
            crews.crews.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Fruta del diablo
        <select
          value={filters.fruit ?? ""}
          onChange={(e) => setFilters({ fruit: pickOrNull(FRUIT_FILTERS, e.target.value) })}
          className={inputClass}
        >
          <option value="">Todas</option>
          {FRUIT_FILTERS.map((f) => (
            <option key={f} value={f}>
              {FRUIT_LABELS[f]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-slate-400">
        Ordenar por
        <select
          value={filters.sort}
          onChange={(e) => {
            const sort = pickOrNull(WANTED_SORTS, e.target.value);
            if (sort) setFilters({ sort });
          }}
          className={inputClass}
        >
          {WANTED_SORTS.map((s) => (
            <option key={s} value={s}>
              {SORT_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-end justify-between gap-3 sm:col-span-2 lg:col-span-6">
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Por pagina
          <select
            value={filters.size}
            onChange={(e) => {
              const size = WANTED_SIZES.find((s) => String(s) === e.target.value);
              if (size) setFilters({ size });
            }}
            className={inputClass}
          >
            {WANTED_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={onClear}
          disabled={!hasActiveFilters}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-amber-500 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Limpiar filtros
        </button>
      </div>
    </section>
  );
}

export function StatusBadge({ status }: { status: WantedStatus }) {
  const color =
    status === "AT_LARGE"
      ? "bg-rose-500"
      : status === "CAPTURED"
        ? "bg-emerald-500"
        : "bg-slate-400";
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold text-slate-950 ${color}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

const inputClass =
  "rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500 disabled:opacity-50";

/** Valor del select tipado: "" (Todos) o algo fuera de la lista se vuelve null. */
function pickOrNull<T extends string>(allowed: readonly T[], value: string): T | null {
  return allowed.find((v) => v === value) ?? null;
}
