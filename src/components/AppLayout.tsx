import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/wanted", label: "Se Busca" },
  { to: "/news", label: "Noticias" },
];

/**
 * Marco de las paginas privadas: barra superior con la tripulacion y navegacion.
 * Recibe la pagina como `children`, asi cada ruta decide si lo usa.
 */
export function AppLayout({ children }: { children: ReactNode }) {
  const { team, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400">
              Log Pose Console
            </p>
            <p className="font-semibold">
              {team?.name}{" "}
              <span className="ml-1 rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-amber-300">
                {team?.code}
              </span>
            </p>
          </div>

          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  [
                    "rounded-lg px-3 py-2 text-sm font-medium transition",
                    isActive
                      ? "bg-amber-500 text-slate-950"
                      : "text-slate-300 hover:bg-slate-800",
                  ].join(" ")
                }
              >
                {link.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="ml-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-rose-500 hover:text-rose-300"
            >
              Cerrar sesion
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
