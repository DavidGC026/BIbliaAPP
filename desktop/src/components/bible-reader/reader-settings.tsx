import { Button } from "@/components/ui/Button";
import {
  DEFAULT_READER_PREFERENCES,
  type ReaderPreferences,
  type ReaderTheme,
} from "@/lib/preferences";


export interface ReaderSettingsProps {
  preferences: ReaderPreferences;
  onChange: (next: ReaderPreferences) => void;
  className?: string;
  /** bible_bibles.fuertes: si es falso no se ofrece el interruptor. */
  interlinearAvailable?: boolean;
}

const THEME_OPTIONS: Array<{ key: ReaderTheme; label: string }> = [
  { key: "auto", label: "Auto" },
  { key: "light", label: "Claro" },
  { key: "sepia", label: "Sepia" },
  { key: "night", label: "Noche" },
  { key: "contrast", label: "Contraste" },
];

export function ReaderSettings({
  preferences,
  onChange,
  className = "",
  interlinearAvailable = false,
}: ReaderSettingsProps) {
  const update = (partial: Partial<ReaderPreferences>) => {
    onChange({ ...preferences, ...partial });
  };

  return (
    <div
      className={`flex flex-wrap items-start gap-x-6 gap-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm text-sm text-foreground animate-fade-in ${className}`}
    >
      {/* 1. Tamaño de letra */}
      <div className="flex flex-col gap-1.5 min-w-[130px]">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Tamaño
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              update({ fontSize: Math.max(14, preferences.fontSize - 1) })
            }
            disabled={preferences.fontSize <= 14}
            className="size-8 p-0"
            title="Reducir fuente"
          >
            A−
          </Button>
          <span className="w-10 text-center font-mono text-xs font-semibold tabular-nums">
            {preferences.fontSize}px
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              update({ fontSize: Math.min(28, preferences.fontSize + 1) })
            }
            disabled={preferences.fontSize >= 28}
            className="size-8 p-0"
            title="Aumentar fuente"
          >
            A+
          </Button>
        </div>
      </div>

      {/* 2. Modo de texto: Versículos / Párrafos */}
      <div className="flex flex-col gap-1.5 min-w-[150px]">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Texto
        </span>
        <div className="flex rounded-lg border border-border/80 bg-background/50 p-0.5">
          {(
            [
              { key: "verses", label: "Versículos" },
              { key: "paragraphs", label: "Párrafos" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => update({ layout: item.key })}
              className={`flex-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                preferences.layout === item.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Alineación */}
      <div className="flex flex-col gap-1.5 min-w-[130px]">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Alineación
        </span>
        <div className="flex rounded-lg border border-border/80 bg-background/50 p-0.5">
          {(
            [
              { key: "left", label: "Izquierda" },
              { key: "justify", label: "Justificado" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => update({ align: item.key })}
              className={`flex-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                preferences.align === item.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Espaciado / Densidad */}
      <div className="flex flex-col gap-1.5 min-w-[130px]">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Espaciado
        </span>
        <div className="flex rounded-lg border border-border/80 bg-background/50 p-0.5">
          {(
            [
              { key: "relaxed", label: "Relajado" },
              { key: "compact", label: "Compacto" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => update({ density: item.key })}
              className={`flex-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                preferences.density === item.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Tema del lector */}
      <div className="flex flex-col gap-1.5 min-w-[200px]">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Tema de lectura
        </span>
        <div className="flex flex-wrap gap-1">
          {THEME_OPTIONS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => update({ theme: item.key })}
              className={`rounded-lg border px-2 py-1 text-xs font-semibold transition-colors ${
                preferences.theme === item.key
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 6. Estudio / Comentarios bíblicos */}
      <div className="flex flex-col gap-1.5 min-w-[160px]">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Estudio
        </span>
        <label className="flex items-center gap-2 cursor-pointer py-1">
          <input
            type="checkbox"
            checked={preferences.showCommentaries}
            onChange={(e) => update({ showCommentaries: e.target.checked })}
            className="size-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-xs font-medium text-foreground">
            Comentarios clásicos
          </span>
        </label>
        {interlinearAvailable && (
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 cursor-pointer py-1">
              <input
                type="checkbox"
                checked={preferences.showInterlinear}
                onChange={(e) => update({ showInterlinear: e.target.checked })}
                className="size-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-xs font-medium text-foreground">
                Interlineal
              </span>
            </label>
            {preferences.showInterlinear ? (
              <div
                role="radiogroup"
                aria-label="Lengua del interlineal"
                className="grid grid-cols-3 gap-1"
              >
                {(
                  [
                    { key: "auto", label: "Auto" },
                    { key: "heb", label: "Hebreo" },
                    { key: "grc", label: "Griego" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    role="radio"
                    aria-checked={preferences.interlinearLanguage === option.key}
                    onClick={() => update({ interlinearLanguage: option.key })}
                    className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                      preferences.interlinearLanguage === option.key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* 7. Reset */}
      <div className="flex items-end self-end ml-auto">
        <button
          type="button"
          onClick={() => onChange(DEFAULT_READER_PREFERENCES)}
          className="text-xs font-medium text-primary hover:underline pb-1"
        >
          Restablecer ajustes
        </button>
      </div>
    </div>
  );
}
