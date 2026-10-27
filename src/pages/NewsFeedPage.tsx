import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { EmptyState, ErrorState, Loading } from "../components/StateViews";
import { useNewsFeed } from "../news/useNewsFeed";
import {
  NEWS_STATUS_LABELS,
  PRIORITY_LABELS,
  TYPE_LABELS,
  useNewsFilters,
} from "../news/useNewsFilters";
import type { NewsItem, NewsPriority, NewsStatus } from "../types/api";
import { NEWS_PRIORITIES, NEWS_STATUSES, NEWS_TYPES } from "../types/api";

/** Lo que el detalle (ruta hija) recibe del feed via <Outlet context>. */
export interface NewsOutletContext {
  patchItem: (updated: NewsItem) => void;
}

export default function NewsFeedPage() {
  const location = useLocation();
  const { filters, setFilters, clearFilters, hasActiveFilters } = useNewsFilters();
  const { feed, loadMore, retry, patchItem } = useNewsFeed(filters);

  // El centinela al final de la lista: cuando entra en pantalla, toca la siguiente carga.
  const sentinel = useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setAtEnd(entry.isIntersecting), {
      rootMargin: "300px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Se vuelve a evaluar cada vez que termina una carga: si el centinela sigue visible
  // (lista corta), pide la siguiente. loadMore ignora la llamada si ya hay una en vuelo.
  useEffect(() => {
    if (atEnd) loadMore();
  }, [atEnd, loadMore]);

  const firstLoad = feed.items.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">News Coo</h1>
        <p className="text-sm text-slate-400">Noticias del mundo, de la mas reciente a la mas antigua.</p>
      </div>

      <section className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect
          label="Tipo"
          value={filters.type ?? ""}
          options={NEWS_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
          onChange={(v) => setFilters({ type: NEWS_TYPES.find((t) => t === v) ?? null })}
        />
        <FilterSelect
          label="Prioridad"
          value={filters.priority ?? ""}
          options={NEWS_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
          onChange={(v) => setFilters({ priority: NEWS_PRIORITIES.find((p) => p === v) ?? null })}
        />
        <FilterSelect
          label="Estado"
          value={filters.status ?? ""}
          options={NEWS_STATUSES.map((s) => ({ value: s, label: NEWS_STATUS_LABELS[s] }))}
          onChange={(v) => setFilters({ status: NEWS_STATUSES.find((s) => s === v) ?? null })}
        />
        <div className="flex items-end">
          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className="w-full rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-amber-500 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Limpiar filtros
          </button>
        </div>
      </section>

      {firstLoad && feed.phase === "loading" ? (
        <Loading label="Esperando a los News Coo..." />
      ) : firstLoad && feed.phase === "error" ? (
        <ErrorState
          title={feed.locked ? "El Grand Line esta bloqueado" : "No pudimos cargar las noticias"}
          message={
            feed.locked
              ? "Las noticias se desbloquean al aprobar la inspeccion de Reverse Mountain."
              : (feed.error ?? "")
          }
          onRetry={retry}
        />
      ) : firstLoad && !feed.hasMore ? (
        <EmptyState
          title="Sin noticias"
          description={
            hasActiveFilters ? "Ninguna noticia coincide con estos filtros." : "Aun no hay noticias."
          }
        />
      ) : (
        <ul className="space-y-3">
          {feed.items.map((n) => (
            <NewsCard key={n.id} news={n} search={location.search} />
          ))}
        </ul>
      )}

      {/* Siempre presente: el observer lo vigila desde el primer render. */}
      <div ref={sentinel} aria-hidden="true" />

      {!firstLoad && (
        <div className="py-4 text-center text-sm" aria-live="polite">
          {feed.phase === "loading" ? (
            <p className="text-slate-400">Cargando mas noticias...</p>
          ) : feed.phase === "error" ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-rose-300">{feed.error}</p>
              <button
                type="button"
                onClick={retry}
                className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-rose-400"
              >
                Reintentar
              </button>
            </div>
          ) : !feed.hasMore ? (
            <p className="text-slate-500">No hay mas noticias. Llegaste al final.</p>
          ) : null}
        </div>
      )}

      {/* El detalle se abre encima: el feed sigue montado y conserva posicion y noticias. */}
      <Outlet context={{ patchItem } satisfies NewsOutletContext} />
    </div>
  );
}

function NewsCard({ news: n, search }: { news: NewsItem; search: string }) {
  return (
    <li>
      <Link
        to={`/news/${n.id}${search}`}
        className="block rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-amber-600"
      >
        <div className="flex flex-wrap items-center gap-2">
          <NewsStatusBadge status={n.status} />
          <PriorityBadge priority={n.priority} />
          <span className="text-xs text-slate-400">{TYPE_LABELS[n.type]}</span>
        </div>
        <p className="mt-2 font-semibold">{n.title}</p>
        <p className="mt-1 text-sm text-slate-400">{n.summary}</p>
        <p className="mt-2 text-xs text-slate-500">
          {n.source} · {n.island} · {new Date(n.publishedAt).toLocaleString("es-PE")}
        </p>
      </Link>
    </li>
  );
}

export function NewsStatusBadge({ status }: { status: NewsStatus }) {
  const color =
    status === "CONFIRMED" ? "bg-emerald-500" : status === "DEBUNKED" ? "bg-rose-500" : "bg-slate-400";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold text-slate-950 ${color}`}>
      {NEWS_STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: NewsPriority }) {
  const color =
    priority === "CRITICAL"
      ? "border-rose-500 text-rose-300"
      : priority === "HIGH"
        ? "border-amber-500 text-amber-300"
        : "border-slate-600 text-slate-400";
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-400">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
      >
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
