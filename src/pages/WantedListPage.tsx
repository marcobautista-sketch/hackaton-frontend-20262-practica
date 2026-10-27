import { useEffect, useLayoutEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { EmptyState, ErrorState, errorMessage } from "../components/StateViews";
import { apiFetch } from "../lib/api";
import type { WantedPage, WantedSummary } from "../types/api";
import { StatusBadge, WantedFilters } from "../wanted/WantedFilters";
import { FRUIT_LABELS, useWantedFilters } from "../wanted/useWantedFilters";

type Result = { kind: "ready"; data: WantedPage } | { kind: "error"; message: string };

/** Resultado etiquetado con la request que lo produjo: si la etiqueta no coincide, esta viejo. */
interface Tagged {
  key: string;
  result: Result;
}

/** Posicion del scroll al entrar a un cartel, para dejar el listado igual al volver. */
const SCROLL_KEY = "wanted.scroll";

const berries = new Intl.NumberFormat("es-PE");
const formatBounty = (n: number) => `฿ ${berries.format(Math.round(n))}`;

export default function WantedListPage() {
  const { token } = useAuth();
  const location = useLocation();
  const { filters, apiQuery, setFilters, setPage, clearFilters, hasActiveFilters } =
    useWantedFilters();

  const [attempt, setAttempt] = useState(0);
  const [tagged, setTagged] = useState<Tagged | null>(null);

  // Cada combinacion de filtros + intento es una request distinta.
  const key = `${apiQuery}#${attempt}`;
  // Solo se muestra un resultado si corresponde a lo ULTIMO que pidio el usuario.
  const current = tagged?.key === key ? tagged.result : null;
  const loading = current === null;

  useEffect(() => {
    const controller = new AbortController();

    apiFetch<WantedPage>(`/wanted${apiQuery}`, { token, signal: controller.signal })
      .then((data) => {
        // Pagina fuera de rango (p. ej. ?page=40 o tras un cambio de datos): ir a la ultima valida.
        const lastPage = Math.max(0, data.totalPages - 1);
        if (filters.page > lastPage) {
          setPage(lastPage, { replace: true });
          return;
        }
        setTagged({ key, result: { kind: "ready", data } });
      })
      .catch((error: unknown) => {
        // Cancelada porque el usuario ya pidio otra cosa: no es un error, se ignora.
        if (controller.signal.aborted) return;
        setTagged({ key, result: { kind: "error", message: errorMessage(error) } });
      });

    // Al cambiar los filtros, la request anterior se cancela (sale "canceled" en Network)
    // y su respuesta, aunque llegue tarde, ya no puede pintarse.
    return () => controller.abort();
  }, [apiQuery, attempt, token, key, filters.page, setPage]);

  // Al volver del detalle, recuperar la posicion del scroll una vez pintados los carteles.
  useLayoutEffect(() => {
    if (current?.kind !== "ready") return;
    const saved = readScroll();
    if (saved && saved.search === location.search) {
      window.scrollTo(0, saved.y);
      clearScroll();
    }
  }, [current, location.search]);

  // Para el esqueleto: tantas filas como habia antes, asi la altura no salta al recargar.
  const lastData = tagged?.result.kind === "ready" ? tagged.result.data : null;
  const skeletonRows = Math.min(lastData?.content.length || 8, 20);
  const data = current?.kind === "ready" ? current.data : null;
  const totalPages = data?.totalPages ?? lastData?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Carteles de Se Busca</h1>
        {/* Altura fija: el contador no empuja la lista mientras carga. */}
        <p className="h-5 text-sm text-slate-400" aria-live="polite">
          {loading
            ? "Buscando carteles..."
            : data
              ? `${berries.format(data.totalElements)} carteles encontrados`
              : ""}
        </p>
      </div>

      <WantedFilters
        filters={filters}
        setFilters={setFilters}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Altura minima reservada: carga, error y "sin resultados" ocupan el mismo espacio. */}
      <section className="min-h-[28rem]" aria-busy={loading}>
        {current === null ? (
          <SkeletonList rows={skeletonRows} />
        ) : current.kind === "error" ? (
          <div className="py-10">
            <ErrorState
              title="No pudimos cargar los carteles"
              message={current.message}
              onRetry={() => setAttempt((n) => n + 1)}
            />
          </div>
        ) : current.data.content.length === 0 ? (
          <div className="py-10">
            <EmptyState
              title="Sin resultados"
              description={
                hasActiveFilters
                  ? "Ningun cartel coincide con estos filtros."
                  : "Aun no hay carteles publicados."
              }
              action={
                hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
                  >
                    Limpiar filtros
                  </button>
                )
              }
            />
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {current.data.content.map((w) => (
              <WantedCard
                key={w.id}
                wanted={w}
                onOpen={() => saveScroll(location.search, window.scrollY)}
              />
            ))}
          </ul>
        )}
      </section>

      <Pagination
        page={filters.page}
        totalPages={totalPages}
        disabled={loading}
        onChange={(p) => setPage(p)}
      />
    </div>
  );
}

function WantedCard({ wanted: w, onOpen }: { wanted: WantedSummary; onOpen: () => void }) {
  return (
    <li>
      <Link
        to={`/wanted/${w.id}`}
        state={{ fromList: true }}
        onClick={onOpen}
        className="flex h-full flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-amber-600"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{w.name}</p>
            <p className="text-xs text-slate-400">"{w.epithet}"</p>
          </div>
          <StatusBadge status={w.status} />
        </div>
        <p className="font-mono text-lg text-amber-300">{formatBounty(w.bounty)}</p>
        <p className="text-xs text-slate-400">
          {w.crew.name} · {w.devilFruit ? `${w.devilFruit.name} (${FRUIT_LABELS[w.devilFruit.type]})` : FRUIT_LABELS.NONE}
        </p>
      </Link>
    </li>
  );
}

function SkeletonList({ rows }: { rows: number }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2" role="status" aria-label="Cargando carteles">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="h-[7.5rem] animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60" />
      ))}
    </ul>
  );
}

function Pagination({
  page,
  totalPages,
  disabled,
  onChange,
}: {
  page: number;
  totalPages: number;
  disabled: boolean;
  onChange: (page: number) => void;
}) {
  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Paginacion">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={disabled || page <= 0}
        className={pageButton}
      >
        ← Anterior
      </button>
      <span className="text-sm text-slate-400">
        Pagina {totalPages === 0 ? 0 : page + 1} de {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages - 1}
        className={pageButton}
      >
        Siguiente →
      </button>
    </nav>
  );
}

const pageButton =
  "rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-amber-500 disabled:cursor-not-allowed disabled:opacity-40";

// sessionStorage puede fallar (modo privado, bloqueado): nunca debe romper el listado.
function saveScroll(search: string, y: number) {
  try {
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ search, y }));
  } catch {
    /* sin scroll guardado: se vuelve arriba */
  }
}

function readScroll(): { search: string; y: number } | null {
  try {
    const raw = sessionStorage.getItem(SCROLL_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "search" in parsed &&
      "y" in parsed &&
      typeof parsed.search === "string" &&
      typeof parsed.y === "number"
    ) {
      return { search: parsed.search, y: parsed.y };
    }
    return null;
  } catch {
    return null;
  }
}

function clearScroll() {
  try {
    sessionStorage.removeItem(SCROLL_KEY);
  } catch {
    /* nada que limpiar */
  }
}
