import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";

export type ThemeMode =
  | "system"
  | "light"
  | "dark"
  | "sepia"
  | "sepia-dark"
  | "midnight"
  | "forest"
  | "lavender"
  | "dvg"
  | "ubg";

const STORAGE_KEY = "bibliaapp_theme_mode";
const VALID: ThemeMode[] = [
  "system",
  "light",
  "dark",
  "sepia",
  "sepia-dark",
  "midnight",
  "forest",
  "lavender",
  "dvg",
  "ubg",
];

type ThemeValue = { mode: ThemeMode; setMode: (mode: ThemeMode) => void };
const ThemeContext = createContext<ThemeValue>({
  mode: "system",
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    return stored && VALID.includes(stored) ? stored : "system";
  });

  useEffect(() => {
    if ((mode === "dvg" || mode === "ubg") && user?.role !== "admin") {
      setModeState("system");
    }
  }, [mode, user?.role]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved =
        mode === "system" ? (media.matches ? "dark" : "light") : mode;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.classList.toggle(
        "dark",
        ["dark", "sepia-dark", "midnight", "forest", "dvg", "ubg"].includes(
          resolved,
        ),
      );
      document.documentElement.style.colorScheme =
        resolved === "light" || resolved === "sepia" || resolved === "lavender"
          ? "light"
          : "dark";
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      setMode(next: ThemeMode) {
        if ((next === "dvg" || next === "ubg") && user?.role !== "admin")
          return;
        localStorage.setItem(STORAGE_KEY, next);
        setModeState(next);
      },
    }),
    [mode, user?.role],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
