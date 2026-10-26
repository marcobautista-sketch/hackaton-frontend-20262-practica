import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { AppLayout } from "./components/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import NotFoundPage from "./pages/NotFoundPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

/**
 * Esqueleto de rutas. Cada issue reemplaza SUS placeholders.
 * Al resolver conflictos, no borrar rutas ajenas.
 */
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Issue 1 - Marco: autenticacion */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Issue 2 - Fabiana: layout, dashboard y 404 */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            </RequireAuth>
          }
        />

        {/* Issue 3 - Juan Carlos: carteles */}
        <Route
          path="/wanted"
          element={
            <RequireAuth>
              <Placeholder name="Carteles (issue 3)" />
            </RequireAuth>
          }
        />
        <Route
          path="/wanted/:id"
          element={
            <RequireAuth>
              <Placeholder name="Detalle del cartel (issue 3)" />
            </RequireAuth>
          }
        />

        {/* Issue 2 - Fabiana: 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}

function Placeholder({ name }: { name: string }) {
  return <div className="p-8 text-slate-300">Pendiente: {name}</div>;
}
