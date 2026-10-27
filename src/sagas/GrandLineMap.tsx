import type { SagaStage } from "../types/api";

interface Props {
  width: number;
  height: number;
  stages: SagaStage[];
  active: number;
}

// Los colores van en `style` y no como atributo SVG: var() solo es seguro en CSS.
const TEXT = "var(--saga-text)";
const SURFACE = "var(--saga-surface)";
const PRIMARY = "var(--saga-primary)";
const ACCENT = "var(--saga-accent)";
const BG = "var(--saga-bg)";

/**
 * Mapa del Grand Line dibujado en SVG con las coordenadas que manda la API.
 * - La ruta completa va punteada; encima, la ruta RECORRIDA se dibuja hasta la isla activa.
 * - El barco se mueve a la isla de la etapa activa.
 */
export function GrandLineMap({ width, height, stages, active }: Props) {
  // Escala de los elementos segun el tamano del mapa (las coordenadas no son pixeles fijos).
  const unit = width / 1000;
  const points = stages.map((s) => s.island);

  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Largo acumulado de la ruta hasta cada isla: permite "dibujar" justo hasta la activa.
  const cumulative = points.reduce<number[]>((acc, p, i) => {
    if (i === 0) return [0];
    const prev = points[i - 1];
    acc.push(acc[i - 1] + Math.hypot(p.x - prev.x, p.y - prev.y));
    return acc;
  }, []);
  const total = cumulative[cumulative.length - 1] ?? 0;
  const traveled = cumulative[active] ?? 0;

  const here = points[active];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block h-full w-full lg:h-auto"
      role="img"
      aria-label={
        here
          ? `Mapa del Grand Line. El barco esta en ${here.name}, isla ${active + 1} de ${points.length}.`
          : "Mapa del Grand Line"
      }
    >
      <rect width={width} height={height} style={{ fill: SURFACE }} />

      {/* Cuadricula de carta nautica, solo decorativa. */}
      <g style={{ stroke: TEXT }} strokeOpacity={0.08} strokeWidth={unit}>
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`v${i}`} x1={(width / 10) * (i + 1)} y1={0} x2={(width / 10) * (i + 1)} y2={height} />
        ))}
        {Array.from({ length: 4 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={(height / 5) * (i + 1)} x2={width} y2={(height / 5) * (i + 1)} />
        ))}
      </g>

      {/* Ruta completa (lo que falta) */}
      <path
        d={d}
        fill="none"
        style={{ stroke: TEXT }}
        strokeOpacity={0.35}
        strokeWidth={3 * unit}
        strokeDasharray={`${10 * unit} ${8 * unit}`}
        strokeLinecap="round"
      />

      {/* Ruta recorrida: dasharray = largo total; el offset esconde lo que aun no se navega. */}
      <path
        className="saga-route"
        d={d}
        fill="none"
        style={{ stroke: PRIMARY }}
        strokeWidth={5 * unit}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={total}
        strokeDashoffset={total - traveled}
      />

      {points.map((p, i) => {
        const visited = i <= active;
        const current = i === active;
        return (
          <g key={p.id + i}>
            {current && (
              <circle className="saga-pulse" cx={p.x} cy={p.y} r={12 * unit} style={{ fill: ACCENT }} />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={(current ? 12 : 9) * unit}
              style={{ fill: current ? ACCENT : visited ? PRIMARY : BG, stroke: TEXT }}
              strokeOpacity={visited ? 0.9 : 0.5}
              strokeWidth={2 * unit}
            />
            <text
              x={p.x}
              y={p.y + 32 * unit}
              textAnchor="middle"
              fontSize={20 * unit}
              fontWeight={current ? 700 : 400}
              style={{ fill: TEXT }}
              fillOpacity={visited ? 1 : 0.6}
            >
              {p.name}
            </text>
          </g>
        );
      })}

      {/* Barco: se traslada a la isla activa (la transicion la da .saga-ship en CSS). */}
      {here && (
        <g className="saga-ship" style={{ transform: `translate(${here.x}px, ${here.y}px)` }}>
          <g transform={`translate(0 ${-30 * unit}) scale(${unit})`}>
            <path d="M -22 4 L 22 4 L 14 16 L -14 16 Z" style={{ fill: TEXT }} />
            <path d="M 0 4 L 0 -26" strokeWidth={3} style={{ stroke: TEXT }} />
            <path d="M 2 -24 L 20 0 L 2 0 Z" style={{ fill: ACCENT }} />
            <path d="M -2 -20 L -16 0 L -2 0 Z" style={{ fill: PRIMARY }} />
          </g>
        </g>
      )}
    </svg>
  );
}
