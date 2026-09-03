import { useTheme, type ThemeMode } from "@/context/ThemeContext";

// Colores de miniatura por tema (paridad con mobile/constants/Colors.ts y
// components/theme-toggle.tsx del sitio web). Se pasan como estilo en línea
// porque .theme-preview lee variables CSS del tema *activo*: sin esto, todas
// las miniaturas mostraban el mismo tema en vez de una vista previa propia.
const PREVIEW: Record<ThemeMode, { bg: string; card: string; primary: string }> = {
  system: { bg: "#FAF8F5", card: "#292524", primary: "#92700C" },
  light: { bg: "#FAF8F5", card: "#FFFFFF", primary: "#92700C" },
  dark: { bg: "#1C1917", card: "#292524", primary: "#E8B84A" },
  sepia: { bg: "#F4ECD8", card: "#FBF4E1", primary: "#8A5A2B" },
  "sepia-dark": { bg: "#1B1510", card: "#2A2119", primary: "#D6A15D" },
  midnight: { bg: "#0B1020", card: "#141C32", primary: "#8AA4FF" },
  forest: { bg: "#081713", card: "#10251F", primary: "#4ADEA7" },
  lavender: { bg: "#F7F4FF", card: "#FFFCFF", primary: "#6748AD" },
  dvg: { bg: "#18090A", card: "#2A1012", primary: "#DC2626" },
  ubg: { bg: "#061417", card: "#0C2428", primary: "#10B981" },
};

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
    description: "Base borgoña, rojo y bordes dorados",
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
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
            className="theme-preview"
            style={{
              background: PREVIEW[option.key].bg,
              borderColor: "rgba(0,0,0,0.12)",
            }}
            aria-hidden="true"
          >
            <i style={{ background: PREVIEW[option.key].card }} />
            <b style={{ background: PREVIEW[option.key].primary }} />
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
