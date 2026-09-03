import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

const MIN_COLUMNS = 1;
const MAX_COLUMNS = 10;
const MIN_ROWS = 1;
const MAX_ROWS = 20;

export type TableSelection = {
  columns: number;
  rows: number;
  withHeader: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onInsert: (selection: TableSelection) => void;
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

/** Selector presentacional de dimensiones; no conoce el editor ni genera HTML. */
export function TablePickerDialog({ open, onClose, onInsert }: Props) {
  const [columns, setColumns] = useState(3);
  const [rows, setRows] = useState(3);
  const [withHeader, setWithHeader] = useState(true);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  const safeColumns = clamp(columns, MIN_COLUMNS, MAX_COLUMNS);
  const safeRows = clamp(rows, MIN_ROWS, MAX_ROWS);

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="table-picker-title"
        className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="table-picker-title" className="text-lg font-extrabold text-foreground">
              Insertar tabla
            </h2>
            <p className="text-xs text-muted-foreground">
              {safeColumns} {safeColumns === 1 ? "columna" : "columnas"} × {safeRows} {safeRows === 1 ? "fila" : "filas"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Cerrar selector de tabla"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs font-bold text-muted-foreground">
            Columnas
            <input
              type="number"
              min={MIN_COLUMNS}
              max={MAX_COLUMNS}
              value={columns}
              autoFocus
              onChange={(event) => setColumns(clamp(Number(event.target.value), MIN_COLUMNS, MAX_COLUMNS))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="space-y-1 text-xs font-bold text-muted-foreground">
            Filas
            <input
              type="number"
              min={MIN_ROWS}
              max={MAX_ROWS}
              value={rows}
              onChange={(event) => setRows(clamp(Number(event.target.value), MIN_ROWS, MAX_ROWS))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={withHeader}
            onChange={(event) => setWithHeader(event.target.checked)}
            className="size-4 accent-primary"
          />
          Primera fila como encabezado
        </label>

        <div className="max-h-44 overflow-auto rounded-xl border border-dashed border-border bg-background p-3">
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${safeColumns}, minmax(12px, 1fr))` }}
            aria-label="Vista previa de la tabla"
          >
            {Array.from({ length: safeColumns * safeRows }, (_, index) => (
              <span
                key={index}
                className={`min-h-4 rounded-sm ${withHeader && index < safeColumns ? "bg-primary/30" : "bg-accent"}`}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            type="button"
            onClick={() => onInsert({ columns: safeColumns, rows: safeRows, withHeader })}
          >
            Insertar {safeColumns}×{safeRows}
          </Button>
        </div>
      </div>
    </div>
  );
}
