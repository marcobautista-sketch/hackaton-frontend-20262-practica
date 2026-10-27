import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { EmptyState, ErrorState, Loading, errorMessage } from "../components/StateViews";
import { apiFetch } from "../lib/api";
import type {
  DashboardSummary,
  FruitFilter,
  LogPose,
  WantedStatus,
} from "../types/api";
import { FRUIT_FILTERS, WANTED_STATUSES } from "../types/api";

interface DashboardData {
  summary: DashboardSummary;
  logPose: LogPose;
}

/** Un solo estado para la carga: nunca hay datos y error a la vez. */
type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: DashboardData };

const STATUS_LABELS: Record<WantedStatus, string> = {
  AT_LARGE: "Profugos",
  CAPTURED: "Capturados",
  MISSING: "Desaparecidos",
};

const FRUIT_LABELS: Record<FruitFilter, string> = {
  PARAMECIA: "Paramecia",
  ZOAN: "Zoan",
  LOGIA: "Logia",
  NONE: "Sin fruta",
};

const berries = new Intl.NumberFormat("es-PE");
const formatBounty = (n: number) => `฿ ${berries.format(Math.round(n))}`;

export default function DashboardPage() {
  const { token } = useAuth();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  // Cambiar este numero vuelve a disparar el efecto: es el "reintentar".
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      apiFetch<DashboardSummary>("/dashboard/summary", { token, signal: controller.signal }),
      apiFetch<LogPose>("/log-pose", { token, signal: controller.signal }),
    ])
      .then(([summary, logPose]) => {
        setState({ kind: "ready", data: { summary, logPose } });
      })
      .catch((error: unknown) => {
        // Abortado a proposito (desmontaje o nuevo intento): no es un error real.
        if (controller.signal.aborted) return;
        setState({ kind: "error", message: errorMessage(error) });
      });

    // Si llega un nuevo intento, la request anterior se cancela y no pisa al nuevo.
    return () => controller.abort();
  }, [token, attempt]);

  if (state.kind === "loading") return <Loading label="Cargando el tablero de la Guild..." />;

  if (state.kind === "error") {
    return (
      <ErrorState
        title="No pudimos cargar el dashboard"
        message={state.message}
        onRetry={() => {
          setState({ kind: "loading" });
          setAttempt((n) => n + 1);
        }}
      />
    );
  }

  const { summary, logPose } = state.data;
  const { wanted } = summary;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard de {summary.team.name}</h1>
        <p className="text-sm text-slate-400">
          Actualizado: {new Date(summary.generatedAt).toLocaleString("es-PE")}
        </p>
      </div>

      <LogPoseCard logPose={logPose} />

      {wanted.total === 0 ? (
        <EmptyState
          title="Aun no hay carteles de Se Busca"
          description="Cuando la Guild publique carteles para tu tripulacion, sus cifras apareceran aqui."
        />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Carteles" value={berries.format(wanted.total)} />
            <StatCard label="Recompensa total" value={formatBounty(wanted.totalBounty)} />
            <StatCard label="Recompensa promedio" value={formatBounty(wanted.averageBounty)} />
            <StatCard label="Tripulaciones" value={berries.format(summary.crews.total)} />
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <Breakdown
              title="Por estado"
              total={wanted.total}
              rows={WANTED_STATUSES.map((s) => ({
                label: STATUS_LABELS[s],
                value: wanted.byStatus[s] ?? 0,
              }))}
            />
            <Breakdown
              title="Por fruta del diablo"
              total={wanted.total}
              rows={FRUIT_FILTERS.map((f) => ({
                label: FRUIT_LABELS[f],
                value: wanted.byFruit[f] ?? 0,
              }))}
            />
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="mb-4 font-semibold">Mayores recompensas</h2>
            {summary.topBounties.length === 0 ? (
              <p className="text-sm text-slate-400">Sin recompensas destacadas.</p>
            ) : (
              <ol className="divide-y divide-slate-800">
                {summary.topBounties.map((w, i) => (
                  <li key={w.id}>
                    <Link
                      to={`/wanted/${w.id}`}
                      className="flex items-center justify-between gap-4 py-3 transition hover:text-amber-300"
                    >
                      <span className="flex items-center gap-3">
                        <span className="w-6 text-right font-mono text-sm text-slate-500">
                          {i + 1}
                        </span>
                        <span>
                          <span className="font-medium">{w.name}</span>
                          <span className="block text-xs text-slate-400">
                            "{w.epithet}" · {w.crew.name}
                          </span>
                        </span>
                      </span>
                      <span className="font-mono text-amber-300">{formatBounty(w.bounty)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function LogPoseCard({ logPose }: { logPose: LogPose }) {
  const locked = logPose.status === "LOCKED";
  return (
    <section
      className={[
        "rounded-2xl border p-5",
        locked ? "border-amber-800 bg-amber-950/30" : "border-emerald-800 bg-emerald-950/30",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-semibold">Log Pose</h2>
        <span
          className={[
            "rounded-full px-3 py-0.5 text-xs font-bold",
            locked ? "bg-amber-500 text-slate-950" : "bg-emerald-500 text-slate-950",
          ].join(" ")}
        >
          {logPose.status}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-300">{logPose.message}</p>
      {locked ? (
        <p className="mt-2 text-sm font-medium text-amber-300">
          El Grand Line esta bloqueado: aprueben la inspeccion de Reverse Mountain para zarpar.
        </p>
      ) : (
        logPose.unlockedAt && (
          <p className="mt-2 text-sm text-emerald-300">
            Grand Line desbloqueado el {new Date(logPose.unlockedAt).toLocaleString("es-PE")}.
          </p>
        )
      )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-100">{value}</p>
    </div>
  );
}

function Breakdown({
  title,
  total,
  rows,
}: {
  title: string;
  total: number;
  rows: { label: string; value: number }[];
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <ul className="space-y-3">
        {rows.map((row) => {
          const pct = total > 0 ? (row.value / total) * 100 : 0;
          return (
            <li key={row.label}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-300">{row.label}</span>
                <span className="font-mono text-slate-400">{row.value}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800">
                <div className="h-2 rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
