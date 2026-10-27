import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { EmptyState, ErrorState, Loading, errorMessage } from "../components/StateViews";
import { ApiError, apiFetch } from "../lib/api";
import { LockedState } from "../sagas/LockedState";
import { isPlainClick, navigateWithTransition } from "../sagas/motion";
import "../sagas/sagas.css";
import type { SagaSummary } from "../types/api";

type Result =
  | { kind: "ready"; sagas: SagaSummary[] }
  | { kind: "locked" }
  | { kind: "error"; message: string };

const miles = new Intl.NumberFormat("es-PE");

export default function SagasPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(0);
  const [tagged, setTagged] = useState<{ key: number; result: Result } | null>(null);

  // Solo vale el resultado del intento actual (mismo patron que el listado de carteles).
  const current = tagged?.key === attempt ? tagged.result : null;

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<SagaSummary[]>("/sagas", { token, signal: controller.signal })
      .then((sagas) => {
        const sorted = [...sagas].sort((a, b) => a.order - b.order);
        setTagged({ key: attempt, result: { kind: "ready", sagas: sorted } });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        // 423: el equipo aun no tiene Log Pose. No se reintenta: hay que aprobar la inspeccion.
        if (error instanceof ApiError && error.status === 423) {
          setTagged({ key: attempt, result: { kind: "locked" } });
          return;
        }
        setTagged({ key: attempt, result: { kind: "error", message: errorMessage(error) } });
      });
    return () => controller.abort();
  }, [token, attempt]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Poneglyphs</h1>
        <p className="text-sm text-slate-400">
          Las sagas del Grand Line. Elige una para recorrerla etapa por etapa.
        </p>
      </div>

      {current === null ? (
        <Loading label="Descifrando los Poneglyphs..." />
      ) : current.kind === "locked" ? (
        <LockedState />
      ) : current.kind === "error" ? (
        <ErrorState
          title="No pudimos cargar las sagas"
          message={current.message}
          onRetry={() => setAttempt((n) => n + 1)}
        />
      ) : current.sagas.length === 0 ? (
        <EmptyState title="Aun no hay sagas" description="Los Poneglyphs de este mar siguen en silencio." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {current.sagas.map((saga) => {
            const to = `/sagas/${saga.id}`;
            return (
              <li key={saga.id}>
                <Link
                  to={to}
                  onClick={(e) => {
                    if (!isPlainClick(e)) return;
                    e.preventDefault();
                    // La saga viaja en el state: la historia pinta su portada al instante,
                    // y la View Transition anima entre esta tarjeta y esa portada.
                    navigateWithTransition(navigate, to, { state: { preview: saga } });
                  }}
                  className="flex h-full flex-col gap-3 rounded-2xl border p-5 transition hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  style={{
                    backgroundColor: saga.palette.background,
                    color: saga.palette.text,
                    borderColor: saga.palette.surface,
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: saga.palette.primary }}>
                    Saga {saga.order} · {saga.stageCount} etapas
                  </p>
                  <h2
                    className="text-xl font-bold"
                    style={{ viewTransitionName: `saga-title-${saga.id}` }}
                  >
                    {saga.title}
                  </h2>
                  <p className="text-sm opacity-80">{saga.subtitle}</p>
                  <p className="text-sm leading-relaxed opacity-90">{saga.synopsis}</p>
                  <p className="mt-auto text-xs opacity-80">
                    {saga.firstIsland} → {saga.lastIsland} · {miles.format(saga.totalDistanceNm)} millas
                  </p>
                  <span
                    className="h-1.5 rounded-full"
                    style={{ background: `linear-gradient(90deg, ${saga.palette.primary}, ${saga.palette.accent})` }}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
