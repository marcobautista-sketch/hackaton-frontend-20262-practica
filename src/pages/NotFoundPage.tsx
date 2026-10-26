import { Link } from "react-router-dom";

/** Cualquier ruta que no existe cae aqui (ruta "*" en App.tsx). */
export default function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 px-4">
      <div className="text-center">
        <p className="font-mono text-6xl font-bold text-amber-400">404</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-100">Esta isla no esta en el mapa</h1>
        <p className="mt-2 text-sm text-slate-400">
          La ruta que buscas no existe. Revisa el rumbo o vuelve a puerto.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-amber-400"
        >
          Volver al dashboard
        </Link>
      </div>
    </div>
  );
}
