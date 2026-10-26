import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, setUnauthorizedHandler } from "../lib/api";
import type { LoginResponse, MeResponse, Team, User } from "../types/api";

const TOKEN_KEY = "logpose.token";

/**
 * `checking` = todavia estamos preguntando a /auth/me si el token guardado sirve.
 * Es el estado que evita que parpadee el login al recargar.
 */
export type AuthStatus = "checking" | "authenticated" | "anonymous";

export interface AuthValue {
  status: AuthStatus;
  token: string | null;
  user: User | null;
  team: Team | null;
  login: (email: string, password: string) => Promise<void>;
  register: (teamName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [team, setTeam] = useState<Team | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setTeam(null);
    setStatus("anonymous");
  }, []);

  /** Guarda la sesion que devuelven login y register (ambos traen el mismo cuerpo). */
  const adopt = useCallback((res: LoginResponse) => {
    localStorage.setItem(TOKEN_KEY, res.token);
    setToken(res.token);
    setUser(res.user);
    setTeam(res.team);
    setStatus("authenticated");
  }, []);

  // Si una request autenticada recibe 401, el token murio: salir al login.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Al arrancar: si hay token guardado, validarlo contra /auth/me antes de decidir.
  useEffect(() => {
    let active = true;
    const saved = localStorage.getItem(TOKEN_KEY);

    if (!saved) {
      setStatus("anonymous");
      return;
    }

    apiFetch<MeResponse>("/auth/me", { token: saved })
      .then((me) => {
        if (!active) return;
        setToken(saved);
        setUser(me.user);
        setTeam(me.team);
        setStatus("authenticated");
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem(TOKEN_KEY);
        setStatus("anonymous");
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      adopt(res);
    },
    [adopt]
  );

  // El 201 de /auth/register ya trae token: se entra directo, sin login extra.
  const register = useCallback(
    async (teamName: string, email: string, password: string) => {
      const res = await apiFetch<LoginResponse>("/auth/register", {
        method: "POST",
        body: { teamName, email, password },
      });
      adopt(res);
    },
    [adopt]
  );

  const value = useMemo<AuthValue>(
    () => ({ status, token, user, team, login, register, logout }),
    [status, token, user, team, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
