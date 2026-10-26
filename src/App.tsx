import { Navigate, Route, Routes } from "react-router-dom";

/**
 * Esqueleto de rutas. Cada issue reemplaza SUS placeholders.
 * Al resolver conflictos, no borrar rutas ajenas.
 */
export default function App() {
  return (
    <Routes>
      {/* Issue 1 - Marco: autenticacion */}
      <Route path="/login" element={<Placeholder name="Login (issue 1)" />} />
      <Route path="/register" element={<Placeholder name="Registro (issue 1)" />} />

      {/* Issue 2 - Fabiana: layout, dashboard y 404 */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Placeholder name="Dashboard (issue 2)" />} />

      {/* Issue 3 - Juan Carlos: carteles */}
      <Route path="/wanted" element={<Placeholder name="Carteles (issue 3)" />} />
      <Route path="/wanted/:id" element={<Placeholder name="Detalle del cartel (issue 3)" />} />

      <Route path="*" element={<Placeholder name="404 (issue 2)" />} />
    </Routes>
  );
}

function Placeholder({ name }: { name: string }) {
  return <div className="p-8 text-slate-300">Pendiente: {name}</div>;
}
