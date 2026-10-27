import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { EmptyState, ErrorState, Loading, errorMessage } from "../components/StateViews";
import { ApiError, apiFetch } from "../lib/api";
import type { WantedDetail } from "../types/api";
import { StatusBadge } from "../wanted/WantedFilters";
import { FRUIT_LABELS } from "../wanted/useWantedFilters";

type Result =
  | { kind: "ready"; data: WantedDetail }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

const berries = new Intl.NumberFormat("es-PE");
const formatBounty = (n: number) => `฿ ${berries.format(Math.round(n))}`;
const formatDate = (iso: string) => new Date(iso).toLocaleString("es-PE");

/** El listado marca sus enlaces con `fromList`: asi sabemos si "volver" puede usar el historial. */
function cameFromList(state: unknown): boolean {
  return typeof state === "object" && state !== null && "fromList" in state && state.fromList === true;
}

export default function WantedDetailPage() {
  const { id = "" } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [attempt, setAttempt] = useState(0);
  const [tagged, setTagged] = useState<{ key: string; result: Result } | null>(null);

  // Igual que en el listado: solo vale el resultado del id e intento actuales.
  const key = `${id}#${attempt}`;
  const current = tagged?.key === key ? tagged.result : null;

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<WantedDetail>(`/wanted/${encodeURIComponent(id)}`, {
      token,
      signal: controller.signal,
    })
      .then((data) => setTagged({ key, result: { kind: "ready", data } }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        // 404 no es "reintentar": el cartel no existe en este workspace.
        if (error instanceof ApiError && error.status === 404) {
          setTagged({ key, result: { kind: "not-found" } });
          return;
        }
        setTagged({ key, result: { kind: "error", message: errorMessage(error) } });
      });
    return () => controller.abort();
  }, [id, token, key]);

  // Si venimos del listado, volver en el historial devuelve la URL con sus filtros y pagina.
  // Si se abrio el enlace directo, no hay listado detras: ir a /wanted.
  function goBack() {
    if (cameFromList(location.state)) navigate(-1);
    else navigate("/wanted");
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={goBack}
        className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-amber-500 hover:text-amber-300"
      >
        ← Volver a los carteles
      </button>

      {current === null ? (
        <Loading label="Buscando el cartel..." />
      ) : current.kind === "not-found" ? (
        <EmptyState
          title="Cartel no encontrado"
          description="Este cartel no existe o ya no esta disponible para tu tripulacion."
          action={
            <Link to="/wanted" className="text-sm font-semibold text-amber-300 underline">
              Ver todos los carteles
            </Link>
          }
        />
      ) : current.kind === "error" ? (
        <ErrorState
          title="No pudimos cargar el cartel"
          message={current.message}
          onRetry={() => setAttempt((n) => n + 1)}
        />
      ) : (
        <WantedDetailView w={current.data} />
      )}
    </div>
  );
}

function WantedDetailView({ w }: { w: WantedDetail }) {
  // El historial se muestra del mas reciente al mas antiguo.
  const history = [...w.bountyHistory].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <article className="space-y-6">
      <header className="rounded-2xl border border-amber-800 bg-amber-950/20 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400">Se Busca</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">{w.name}</h1>
          <StatusBadge status={w.status} />
        </div>
        <p className="text-slate-300">"{w.epithet}"</p>
        <p className="mt-4 font-mono text-3xl text-amber-300">{formatBounty(w.bounty)}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Tripulacion" value={w.crew.name} />
        <Fact label="Rol" value={w.role} />
        <Fact
          label="Fruta del diablo"
          value={w.devilFruit ? `${w.devilFruit.name} (${FRUIT_LABELS[w.devilFruit.type]})` : FRUIT_LABELS.NONE}
        />
        <Fact label="Nivel de amenaza" value={String(w.threatLevel)} />
        <Fact label="Edad" value={`${w.age} anos`} />
        <Fact label="Altura" value={`${w.heightCm} cm`} />
        <Fact label="Visto por ultima vez en" value={w.lastSeenIsland} />
        <Fact label="Ultimo avistamiento" value={formatDate(w.lastSeen)} />
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-2 font-semibold">Biografia</h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{w.bio}</p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-4 font-semibold">Historial de recompensas</h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400">Sin cambios registrados.</p>
        ) : (
          <ol className="divide-y divide-slate-800">
            {history.map((h, i) => (
              <li key={`${h.at}-${i}`}className="flex justify-between gap-4 py-2 text-sm">
                <span className="text-slate-400">{formatDate(h.at)}</span>
                <span className="font-mono text-amber-300">{formatBounty(h.bounty)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="text-xs text-slate-500">Actualizado: {formatDate(w.updatedAt)}</p>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 font-medium text-slate-100">{value}</p>
    </div>
  );
}
