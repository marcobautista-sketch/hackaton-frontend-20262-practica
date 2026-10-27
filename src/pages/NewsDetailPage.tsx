import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { EmptyState, ErrorState, Loading, errorMessage } from "../components/StateViews";
import { ApiError, apiFetch } from "../lib/api";
import { NEWS_STATUS_LABELS, TYPE_LABELS } from "../news/useNewsFilters";
import type { NewsDetail, NewsVerdict } from "../types/api";
import { NewsStatusBadge, PriorityBadge, type NewsOutletContext } from "./NewsFeedPage";

type Result =
  | { kind: "loading" }
  | { kind: "ready"; data: NewsDetail }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

type Verify =
  | { phase: "idle" }
  | { phase: "pending"; target: NewsVerdict }
  | { phase: "done"; status: NewsVerdict }
  | { phase: "error"; target: NewsVerdict; message: string; conflict: boolean };

/** Ruta hija de /news: se pinta encima del feed, que sigue montado debajo. */
export default function NewsDetailPage() {
  const { id = "" } = useParams();
  // key={id}: otra noticia = estado nuevo (sin arrastrar la verificacion de la anterior).
  return <NewsDetailPanel key={id} id={id} />;
}

function NewsDetailPanel({ id }: { id: string }) {
  const { token } = useAuth();
  const { patchItem } = useOutletContext<NewsOutletContext>();
  const navigate = useNavigate();
  const location = useLocation();
  const dialog = useRef<HTMLDivElement>(null);

  const [result, setResult] = useState<Result>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [verify, setVerify] = useState<Verify>({ phase: "idle" });

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<NewsDetail>(`/news/${encodeURIComponent(id)}`, { token, signal: controller.signal })
      .then((data) => setResult({ kind: "ready", data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 404) {
          setResult({ kind: "not-found" });
          return;
        }
        setResult({ kind: "error", message: errorMessage(error) });
      });
    return () => controller.abort();
  }, [id, token, attempt]);

  // Cerrar vuelve a /news con los mismos filtros: el feed no se vuelve a pedir.
  function close() {
    navigate({ pathname: "/news", search: location.search });
  }

  useEffect(() => {
    dialog.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") navigate({ pathname: "/news", search: location.search });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, location.search]);

  function reload() {
    setResult({ kind: "loading" });
    setVerify({ phase: "idle" });
    setAttempt((n) => n + 1);
  }

  async function submit(target: NewsVerdict) {
    if (verify.phase === "pending") return;
    setVerify({ phase: "pending", target });
    try {
      const updated = await apiFetch<NewsDetail>(`/news/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: { status: target },
        token,
      });
      setResult({ kind: "ready", data: updated });
      patchItem(updated);
      setVerify({ phase: "done", status: target });
    } catch (error) {
      // La noticia que se ve no cambia: se conserva el estado anterior.
      setVerify({
        phase: "error",
        target,
        message: errorMessage(error),
        conflict: error instanceof ApiError && error.status === 409,
      });
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-slate-950/70" onClick={close}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de la noticia"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-800 bg-slate-950 p-6 outline-none"
      >
        <button
          type="button"
          onClick={close}
          className="mb-6 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-amber-500 hover:text-amber-300"
        >
          ← Volver al feed
        </button>

        {result.kind === "loading" ? (
          <Loading label="Abriendo la noticia..." />
        ) : result.kind === "not-found" ? (
          <EmptyState
            title="Noticia no encontrada"
            description="Esta noticia no existe en el workspace de tu tripulacion."
          />
        ) : result.kind === "error" ? (
          <ErrorState title="No pudimos abrir la noticia" message={result.message} onRetry={reload} />
        ) : (
          <article className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <NewsStatusBadge status={result.data.status} />
              <PriorityBadge priority={result.data.priority} />
              <span className="text-xs text-slate-400">{TYPE_LABELS[result.data.type]}</span>
            </div>
            <h1 className="text-2xl font-bold">{result.data.title}</h1>
            <p className="text-xs text-slate-500">
              {result.data.source} · {result.data.island} ·{" "}
              {new Date(result.data.publishedAt).toLocaleString("es-PE")}
            </p>

            <div className="space-y-3 text-sm leading-relaxed text-slate-300">
              {result.data.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {result.data.relatedWanted && (
              <p className="text-sm">
                Cartel relacionado:{" "}
                <Link
                  to={`/wanted/${result.data.relatedWanted.id}`}
                  className="font-medium text-amber-300 underline"
                >
                  {result.data.relatedWanted.name}
                </Link>
              </p>
            )}

            <VerifyBox
              status={result.data.status}
              verifiedAt={result.data.verifiedAt}
              verify={verify}
              onSubmit={submit}
              onReload={reload}
            />
          </article>
        )}
      </div>
    </div>
  );
}

function VerifyBox({
  status,
  verifiedAt,
  verify,
  onSubmit,
  onReload,
}: {
  status: NewsDetail["status"];
  verifiedAt: string | null;
  verify: Verify;
  onSubmit: (target: NewsVerdict) => void;
  onReload: () => void;
}) {
  const pending = verify.phase === "pending";

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="font-semibold">Verificacion</h2>

      {verify.phase === "done" && (
        <p role="status" className="mt-2 rounded-lg bg-emerald-950/60 px-3 py-2 text-sm text-emerald-300">
          Listo: la noticia quedo como {NEWS_STATUS_LABELS[verify.status]}.
        </p>
      )}

      {status === "RUMOR" ? (
        <>
          <p className="mt-1 text-sm text-slate-400">Este rumor aun no se verifica. Que dicen tus fuentes?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => onSubmit("CONFIRMED")}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending && verify.target === "CONFIRMED" ? "Confirmando..." : "Confirmar"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => onSubmit("DEBUNKED")}
              className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending && verify.target === "DEBUNKED" ? "Desmintiendo..." : "Desmentir"}
            </button>
          </div>

          {verify.phase === "error" && (
            <div role="alert" className="mt-3 rounded-lg border border-rose-800 bg-rose-950/50 px-3 py-2 text-sm text-rose-300">
              <p>{verify.message}</p>
              {verify.conflict ? (
                <button type="button" onClick={onReload} className="mt-2 font-semibold underline">
                  Ver el estado actual
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSubmit(verify.target)}
                  className="mt-2 font-semibold underline"
                >
                  Reintentar
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="mt-1 text-sm text-slate-400">
          Verificada como {NEWS_STATUS_LABELS[status]}
          {verifiedAt ? ` el ${new Date(verifiedAt).toLocaleString("es-PE")}` : ""}.
        </p>
      )}
    </section>
  );
}
