import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { errorMessage } from "../components/StateViews";
import { ApiError, apiFetch, buildQuery } from "../lib/api";
import type { NewsFeed, NewsItem } from "../types/api";
import type { NewsFilters } from "./useNewsFilters";

const PAGE_SIZE = 20;

type Phase = "loading" | "idle" | "error";

/** Estado del feed, etiquetado con los filtros que lo produjeron. */
interface FeedState {
  key: string;
  items: NewsItem[];
  nextCursor: string | null;
  hasMore: boolean;
  phase: Phase;
  error: string | null;
  /** 423: el equipo todavia no tiene Log Pose. */
  locked: boolean;
}

function initial(key: string): FeedState {
  return { key, items: [], nextCursor: null, hasMore: true, phase: "loading", error: null, locked: false };
}

/** Si el estado es de otros filtros, se descarta: nunca se mezclan resultados. */
function forKey(prev: FeedState, key: string): FeedState {
  return prev.key === key ? prev : initial(key);
}

/**
 * Feed con cursor. Garantias:
 * - una sola carga en vuelo (`inFlight`),
 * - ninguna noticia dos veces (se filtra por `id` al agregar),
 * - al cambiar filtros se cancela lo que este en vuelo y se empieza sin cursor,
 * - un error no borra lo ya cargado.
 */
export function useNewsFeed(filters: NewsFilters) {
  const { token } = useAuth();
  const key = buildQuery({ type: filters.type, priority: filters.priority, status: filters.status });

  const [state, setState] = useState<FeedState>(() => initial(key));
  const inFlight = useRef<AbortController | null>(null);

  // Lo que se pinta siempre corresponde a los filtros actuales.
  const feed = forKey(state, key);

  const load = useCallback(
    (cursor: string | null) => {
      if (inFlight.current) return; // ya hay una carga en camino
      const controller = new AbortController();
      inFlight.current = controller;

      setState((prev) => ({ ...forKey(prev, key), phase: "loading", error: null }));

      const query = buildQuery({
        type: filters.type,
        priority: filters.priority,
        status: filters.status,
        limit: PAGE_SIZE,
        cursor,
      });

      apiFetch<NewsFeed>(`/news/feed${query}`, { token, signal: controller.signal })
        .then((page) => {
          setState((prev) => {
            const base = forKey(prev, key);
            const seen = new Set(base.items.map((n) => n.id));
            const fresh = page.items.filter((n) => !seen.has(n.id));
            return {
              ...base,
              items: [...base.items, ...fresh],
              nextCursor: page.nextCursor,
              hasMore: page.hasMore && page.nextCursor !== null,
              phase: "idle",
            };
          });
        })
        .catch((error: unknown) => {
          // Cancelada porque cambiaron los filtros: no es un error que mostrar.
          if (controller.signal.aborted) return;
          setState((prev) => ({
            ...forKey(prev, key),
            phase: "error",
            error: errorMessage(error),
            locked: error instanceof ApiError && error.status === 423,
          }));
        })
        .finally(() => {
          if (inFlight.current === controller) inFlight.current = null;
        });
    },
    [key, filters.type, filters.priority, filters.status, token]
  );

  // Filtros nuevos (o primera vez): cancelar lo que este en vuelo y pedir la primera carga.
  useEffect(() => {
    load(null);
    return () => {
      inFlight.current?.abort();
      inFlight.current = null;
    };
  }, [load]);

  /** Siguiente carga. No hace nada si ya hay una en vuelo, si hubo error o si es el final. */
  const loadMore = useCallback(() => {
    if (feed.phase !== "idle" || !feed.hasMore) return;
    load(feed.nextCursor);
  }, [feed.phase, feed.hasMore, feed.nextCursor, load]);

  /** Reintento manual tras un error: sigue desde el ultimo cursor bueno, sin borrar nada. */
  const retry = useCallback(() => load(feed.nextCursor), [feed.nextCursor, load]);

  /** Refleja en el feed una noticia actualizada en el detalle (sin volver a pedir el feed). */
  const patchItem = useCallback((updated: NewsItem) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((n) =>
        n.id === updated.id
          ? { ...n, status: updated.status, verifiedAt: updated.verifiedAt, updatedAt: updated.updatedAt }
          : n
      ),
    }));
  }, []);

  return { feed, loadMore, retry, patchItem };
}
