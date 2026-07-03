import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as api from "@/lib/api";
import { isAuthError } from "@/lib/authError";
import { setIsOnline } from "@/lib/network";
import { startGoogleSignIn } from "@/lib/googleAuth";
import { syncAll } from "@/lib/sync";
import {
  clearSession,
  loadSession,
  persistUser,
  saveSession,
} from "@/lib/sessionStore";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isOffline: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const applySession = useCallback(
    async (sessionToken: string, initialUser?: User) => {
      setToken(sessionToken);
      api.setApiTokenGetter(() => sessionToken);

      if (initialUser) {
        setUser(initialUser);
        await saveSession(sessionToken, initialUser);
      } else {
        const { user: nextUser } = await api.getMe();
        if (!nextUser) {
          throw new Error("No se pudo cargar tu perfil.");
        }
        setUser(nextUser);
        await saveSession(sessionToken, nextUser);
      }
      setIsOffline(false);
      setIsOnline(true);
      syncAll().catch(() => {});
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    try {
      const { user: nextUser } = await api.getMe();
      setUser(nextUser);
      await persistUser(nextUser);
      setIsOffline(false);
      setIsOnline(true);
      syncAll().catch(() => {});
      if (!nextUser) {
        setToken(null);
        await clearSession();
      }
    } catch (err) {
      if (isAuthError(err)) {
        setUser(null);
        setToken(null);
        await clearSession();
      } else {
        setIsOffline(true);
      }
    }
  }, []);

  useEffect(() => {
    api.setApiTokenGetter(() => token);
  }, [token]);

  useEffect(() => {
    const onOnline = () => {
      setIsOffline(false);
      setIsOnline(true);
      syncAll().catch(() => {});
      if (token) refreshUser().catch(() => {});
    };
    const onOffline = () => {
      setIsOffline(true);
      setIsOnline(false);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [token, refreshUser]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const { token: stored, user: cachedUser } = await loadSession();
        if (cancelled || !stored) return;

        setToken(stored);
        api.setApiTokenGetter(() => stored);
        if (cachedUser) setUser(cachedUser);

        try {
          const { user: nextUser } = await api.getMe();
          if (cancelled) return;
          if (nextUser) {
            setUser(nextUser);
            await persistUser(nextUser);
            setIsOffline(false);
            setIsOnline(true);
            syncAll().catch(() => {});
          } else {
            setUser(null);
            setToken(null);
            await clearSession();
          }
        } catch (err) {
          if (!cancelled && isAuthError(err)) {
            setUser(null);
            setToken(null);
            await clearSession();
          } else if (!cancelled) {
            setIsOffline(true);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await api.login(email.trim().toLowerCase(), password);
      await applySession(result.token, result.user);
    },
    [applySession],
  );

  const loginWithGoogle = useCallback(async () => {
    const sessionToken = await startGoogleSignIn();
    await applySession(sessionToken);
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Ignorar errores de red al cerrar sesión
    }
    await clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isOffline,
      login,
      loginWithGoogle,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, isOffline, login, loginWithGoogle, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
