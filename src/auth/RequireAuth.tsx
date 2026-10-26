import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

/**
 * Puerta de las rutas privadas.
 *
 * Mientras `status` es "checking" devuelve un loader: si en vez de eso
 * redirigiera al login, al recargar se veria un parpadeo y el criterio
 * "restaurar sesion sin mostrar el login" no pasaria.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "checking") {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
          <p className="text-sm text-slate-400">Consultando el Log Pose...</p>
        </div>
      </div>
    );
  }

  if (status === "anonymous") {
    // Guardamos a donde queria ir para devolverlo ahi despues del login.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
