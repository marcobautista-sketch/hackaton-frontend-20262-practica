import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { EmptyState, ErrorState, Loading, errorMessage } from "../components/StateViews";
import { ApiError, apiFetch } from "../lib/api";
import { GrandLineMap } from "../sagas/GrandLineMap";
import { LockedState } from "../sagas/LockedState";
import { navigateWithTransition, prefersReducedMotion } from "../sagas/motion";
import "../sagas/sagas.css";
import type { Palette, SagaStory, SagaSummary, StageMetric } from "../types/api";

type Result =
  | { kind: "ready"; story: SagaStory }
  | { kind: "locked" }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

/** Variables CSS que pintan toda la historia con la paleta de la etapa activa. */
type ThemeStyle = CSSProperties & Record<`--saga-${string}`, string>;

function themeOf(p: Palette): ThemeStyle {
  return {
    "--saga-bg": p.background,
    "--saga-surface": p.surface,
    "--saga-primary": p.primary,
    "--saga-accent": p.accent,
    "--saga-text": p.text,
  };
}

/**
 * Linea imaginaria al 60% de la altura de la pantalla: la etapa que la cruza es la activa.
 * (Por debajo del panel fijo del mapa en mobile, en el centro de lectura en desktop.)
 */
const ACTIVE_LINE = "-59% 0px -40% 0px";

const num = new Intl.NumberFormat("es-PE");

/** El resumen manda la saga en el state para pintar la portada sin esperar a la API. */
function readPreview(state: unknown, id: string): SagaSummary | null {
  if (typeof state !== "object" || state === null || !("preview" in state)) return null;
  const p = state.preview;
  if (
    typeof p === "object" &&
    p !== null &&
    "id" in p &&
    p.id === id &&
    "title" in p &&
    typeof p.title === "string" &&
    "palette" in p &&
    typeof p.palette === "object"
  ) {
    return p as SagaSummary;
  }
  return null;
}

export default function SagaStoryPage() {
  const { id = "" } = useParams();
  const { token } = useAuth();
  const location = useLocation();

  const [attempt, setAttempt] = useState(0);
  const [tagged, setTagged] = useState<{ key: string; result: Result } | null>(null);

  // Solo se muestra la historia de la saga e intento actuales.
  const key = `${id}#${attempt}`;
  const current = tagged?.key === key ? tagged.result : null;

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<SagaStory>(`/sagas/${encodeURIComponent(id)}/story`, { token, signal: controller.signal })
      .then((story) => {
        const stages = [...story.stages].sort((a, b) => a.order - b.order);
        setTagged({ key, result: { kind: "ready", story: { ...story, stages } } });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 423) {
          setTagged({ key, result: { kind: "locked" } });
        } else if (error instanceof ApiError && error.status === 404) {
          setTagged({ key, result: { kind: "not-found" } });
        } else {
          setTagged({ key, result: { kind: "error", message: errorMessage(error) } });
        }
      });
    return () => controller.abort();
  }, [id, token, key]);

  if (current === null) {
    const preview = readPreview(location.state, id);
    if (!preview) return <Loading label="Leyendo el Poneglyph..." />;
    return (
      <div className="saga-root overflow-hidden rounded-3xl" style={themeOf(preview.palette)}>
        <SagaHeader saga={preview} />
        <Loading label="Leyendo el Poneglyph..." />
      </div>
    );
  }

  if (current.kind === "locked") return <LockedState />;

  if (current.kind === "not-found") {
    return (
      <EmptyState
        title="Saga no encontrada"
        description="Este Poneglyph no existe en tu mar."
        action={
          <Link to="/sagas" className="text-sm font-semibold text-amber-300 underline">
            Ver todas las sagas
          </Link>
        }
      />
    );
  }

  if (current.kind === "error") {
    return (
      <ErrorState
        title="No pudimos cargar la saga"
        message={current.message}
        onRetry={() => setAttempt((n) => n + 1)}
      />
    );
  }

  // key: al cambiar de saga, la historia arranca de cero (etapa, refs, observer).
  return <Story key={current.story.saga.id} story={current.story} />;
}

function SagaHeader({ saga, intro }: { saga: SagaSummary; intro?: string }) {
  const navigate = useNavigate();
  return (
    <header className="space-y-3 px-4 pb-6 pt-8 sm:px-8">
      <button
        type="button"
        onClick={() => navigateWithTransition(navigate, "/sagas")}
        className="rounded-lg border px-3 py-1.5 text-sm transition hover:opacity-80"
        style={{ borderColor: "var(--saga-primary)" }}
      >
        ← Todas las sagas
      </button>
      <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--saga-primary)" }}>
        Saga {saga.order} · {saga.firstIsland} → {saga.lastIsland}
      </p>
      <h1 className="text-3xl font-bold sm:text-4xl" style={{ viewTransitionName: `saga-title-${saga.id}` }}>
        {saga.title}
      </h1>
      <p className="text-lg opacity-80">{saga.subtitle}</p>
      {intro && <p className="max-w-3xl leading-relaxed opacity-90">{intro}</p>}
    </header>
  );
}

function Story({ story }: { story: SagaStory }) {
  const { saga, map, stages } = story;
  const [searchParams, setSearchParams] = useSearchParams();

  // La etapa inicial sale de la URL (?stage=slug). Un slug invalido cae a la primera.
  const [active, setActive] = useState(() =>
    Math.max(0, stages.findIndex((s) => s.slug === searchParams.get("stage")))
  );
  const initial = useRef(active);
  const sections = useRef<(HTMLElement | null)[]>([]);
  const progressBar = useRef<HTMLDivElement>(null);

  // Abrir la URL de una etapa lleva directo a ella.
  useLayoutEffect(() => {
    const el = sections.current[initial.current];
    if (initial.current > 0 && el) el.scrollIntoView({ block: "start" });
    else window.scrollTo(0, 0);
  }, []);

  // Etapas activadas por scroll: la que cruza la linea ACTIVE_LINE pasa a ser la activa.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) continue;
          const index = Number(entry.target.dataset.index);
          if (Number.isInteger(index)) setActive(index);
        }
      },
      { rootMargin: ACTIVE_LINE }
    );
    for (const el of sections.current) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [stages]);

  // La URL siempre dice la etapa activa. replace: hacer scroll no llena el historial.
  const activeSlug = stages[active]?.slug;
  useEffect(() => {
    if (!activeSlug || searchParams.get("stage") === activeSlug) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("stage", activeSlug);
        return next;
      },
      { replace: true }
    );
  }, [activeSlug, searchParams, setSearchParams]);

  // Navegacion por teclado: lleva el scroll Y el foco a la etapa, asi no se pierde contenido.
  const goTo = useCallback(
    (index: number) => {
      const target = Math.min(Math.max(index, 0), stages.length - 1);
      const el = sections.current[target];
      if (!el) return;
      setActive(target);
      el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      el.focus({ preventScroll: true });
    },
    [stages.length]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) {
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(active + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(active - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goTo]);

  // Barra de progreso del scroll: con soporte la mueve CSS (animation-timeline: scroll()).
  // Sin soporte, o con reduced motion (donde CSS la apaga), la actualiza este listener.
  useEffect(() => {
    if (CSS.supports("animation-timeline: scroll()") && !prefersReducedMotion()) return;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progressBar.current?.style.setProperty("--saga-scroll", String(ratio));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (stages.length === 0) {
    return (
      <div className="saga-root overflow-hidden rounded-3xl" style={themeOf(saga.palette)}>
        <SagaHeader saga={saga} intro={saga.intro} />
        <div className="px-4 pb-8 sm:px-8">
          <EmptyState title="Esta saga aun no tiene etapas" />
        </div>
      </div>
    );
  }

  const stage = stages[active];
  const distance = stage.metrics.find((m) => m.key === "distanceNm")?.value ?? 0;
  const progress = ((active + 1) / stages.length) * 100;

  return (
    <div className="saga-root rounded-3xl" style={themeOf(stage.palette)}>
      <div
        ref={progressBar}
        className="saga-scroll-progress fixed inset-x-0 top-0 z-50 h-1"
        style={{ background: "var(--saga-accent)" }}
        aria-hidden="true"
      />

      <SagaHeader saga={saga} intro={saga.intro} />

      <div className="flex flex-col gap-6 px-4 pb-10 sm:px-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-10">
        {/* Panel persistente: mapa, progreso y metricas de la etapa activa. */}
        <aside
          className="sticky top-0 z-10 -mx-4 space-y-3 px-4 py-3 sm:-mx-8 sm:px-8 lg:order-2 lg:top-4 lg:mx-0 lg:self-start lg:rounded-2xl lg:px-4"
          style={{ backgroundColor: "var(--saga-bg)" }}
          aria-label="Mapa y metricas del recorrido"
        >
          <div className="h-[24vh] overflow-hidden rounded-xl lg:h-auto" style={{ backgroundColor: "var(--saga-surface)" }}>
            <GrandLineMap width={map.width} height={map.height} stages={stages} active={active} />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span aria-live="polite" className="font-semibold">
                Etapa {active + 1} de {stages.length}: {stage.island.name}
              </span>
              <span className="opacity-80">
                {num.format(distance)} / {num.format(saga.totalDistanceNm)} millas
              </span>
            </div>
            <div
              className="mt-1 h-2 overflow-hidden rounded-full"
              style={{ backgroundColor: "var(--saga-surface)" }}
              role="progressbar"
              aria-label="Progreso del recorrido"
              aria-valuemin={0}
              aria-valuemax={stages.length}
              aria-valuenow={active + 1}
            >
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${progress}%`, backgroundColor: "var(--saga-primary)" }}
              />
            </div>
          </div>

          <MetricsPanel metrics={stage.metrics} />

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
              style={{ borderColor: "var(--saga-primary)" }}
            >
              ← Anterior
            </button>
            <span className="hidden text-xs opacity-70 sm:inline">Teclas ← → para navegar</span>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              disabled={active === stages.length - 1}
              className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
              style={{ borderColor: "var(--saga-primary)" }}
            >
              Siguiente →
            </button>
          </div>

          <nav aria-label="Etapas de la saga" className="hidden lg:block">
            <ol className="space-y-1 text-sm">
              {stages.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={i === active ? "step" : undefined}
                    className="w-full rounded-lg px-2 py-1 text-left transition hover:opacity-100"
                    style={
                      i === active
                        ? { backgroundColor: "var(--saga-primary)", color: "var(--saga-bg)" }
                        : { opacity: i < active ? 0.9 : 0.6 }
                    }
                  >
                    {s.order}. {s.title}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        {/* Narrativa: cada etapa es una seccion; el scroll decide cual esta activa. */}
        <ol className="lg:order-1">
          {stages.map((s, i) => (
            <li key={s.id}>
              <section
                id={`etapa-${s.slug}`}
                ref={(el) => {
                  sections.current[i] = el;
                }}
                data-index={i}
                data-state={i <= active ? "seen" : "upcoming"}
                tabIndex={-1}
                aria-labelledby={`etapa-${s.slug}-titulo`}
                className="saga-stage flex min-h-[70vh] scroll-mt-[45vh] items-center py-6 outline-none lg:scroll-mt-8"
              >
                <div
                  className="saga-stage-card w-full space-y-4 rounded-2xl border p-6"
                  style={{
                    backgroundColor: "var(--saga-surface)",
                    borderColor: i === active ? "var(--saga-accent)" : "transparent",
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "var(--saga-primary)" }}>
                    Etapa {s.order} de {stages.length} · {s.island.name}
                  </p>
                  <h2 id={`etapa-${s.slug}-titulo`} className="text-2xl font-bold">
                    {s.title}
                  </h2>
                  {s.narrative.map((paragraph, j) => (
                    <p key={j} className="leading-relaxed opacity-90">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function MetricsPanel({ metrics }: { metrics: StageMetric[] }) {
  return (
    <dl className="grid grid-cols-4 gap-2 lg:grid-cols-2">
      {metrics.map((m) => (
        <div key={m.key} className="rounded-lg px-2 py-1.5 lg:p-3" style={{ backgroundColor: "var(--saga-surface)" }}>
          <dt className="truncate text-[10px] uppercase tracking-wide opacity-75 lg:text-xs" title={m.label}>
            {m.label}
          </dt>
          <dd className="text-sm font-bold lg:text-lg" style={{ color: "var(--saga-primary)" }}>
            {num.format(m.value)}
            {m.unit && <span className="ml-1 text-[10px] font-normal opacity-80 lg:text-xs">{m.unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
