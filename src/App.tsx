import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { AppLayout } from "./components/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import NotFoundPage from "./pages/NotFoundPage";
import LoginPage from "./pages/LoginPage";
import NewsDetailPage from "./pages/NewsDetailPage";
import NewsFeedPage from "./pages/NewsFeedPage";
import RegisterPage from "./pages/RegisterPage";
import WantedDetailPage from "./pages/WantedDetailPage";
import WantedListPage from "./pages/WantedListPage";

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
              <AppLayout>
                <WantedListPage />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/wanted/:id"
          element={
            <RequireAuth>
              <AppLayout>
                <WantedDetailPage />
              </AppLayout>
            </RequireAuth>
          }
        />

        {/* CP4 - News Coo: el detalle es ruta hija para que el feed siga montado debajo */}
        <Route
          path="/news"
          element={
            <RequireAuth>
              <AppLayout>
                <NewsFeedPage />
              </AppLayout>
            </RequireAuth>
          }
        >
          <Route path=":id" element={<NewsDetailPage />} />
        </Route>

        {/* Issue 2 - Fabiana: 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
