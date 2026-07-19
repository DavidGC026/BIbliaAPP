import { useTheme, type ThemeMode } from "@/context/ThemeContext";

const OPTIONS: Array<{
  key: ThemeMode;
  label: string;
  description: string;
  admin?: boolean;
}> = [
  { key: "system", label: "Sistema", description: "Se adapta al equipo" },
  { key: "light", label: "Claro", description: "Limpio y luminoso" },
  { key: "dark", label: "Oscuro", description: "Cómodo por la noche" },
  { key: "sepia", label: "Sepia", description: "Lectura cálida" },
  { key: "sepia-dark", label: "Sepia oscuro", description: "Cálido y tenue" },
  { key: "midnight", label: "Medianoche", description: "Azul profundo" },
  { key: "forest", label: "Bosque", description: "Verde sereno" },
  { key: "lavender", label: "Lavanda", description: "Suave y elegante" },
  {
    key: "dvg",
    label: "DVG",
    description: "Edición administrativa",
    admin: true,
  },
  {
    key: "ubg",
    label: "UBG",
    description: "Edición verde y azul",
    admin: true,
  },
];

export function ThemeSwitch({ isAdmin = false }: { isAdmin?: boolean }) {
  const { mode, setMode } = useTheme();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {OPTIONS.filter((option) => !option.admin || isAdmin).map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => setMode(option.key)}
          aria-pressed={mode === option.key}
          className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
            mode === option.key
              ? "border-primary bg-primary/10"
              : "border-border bg-card hover:bg-accent"
          }`}
        >
          <span
            className={`theme-preview theme-preview-${option.key}`}
            aria-hidden="true"
          >
            <i />
            <b />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 font-bold text-foreground">
              {option.label}
              {option.admin ? (
                <small className="rounded bg-primary px-1 text-[9px] text-primary-foreground">
                  ADMIN
                </small>
              ) : null}
            </span>
            <span className="block text-xs text-muted-foreground">
              {option.description}
            </span>
          </span>
          <span className="text-primary">
            {mode === option.key ? "●" : "○"}
          </span>
        </button>
      ))}
    </div>
  );
}
