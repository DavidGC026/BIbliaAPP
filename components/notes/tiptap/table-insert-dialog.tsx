import { Minus, Plus, Table2, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

type Props = {
  open: boolean
  onClose: () => void
  onInsert: (options: { rows: number; cols: number; withHeaderRow: boolean }) => void
}

export function TableInsertDialog({ open, onClose, onInsert }: Props) {
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(3)
  const [withHeaderRow, setWithHeaderRow] = useState(true)
  if (!open) return null

  const stepper = (label: string, value: number, setValue: (next: number) => void, max: number) => (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/20 p-3">
      <span className="text-sm font-bold">{label}</span>
      <div className="flex items-center gap-2">
        <Button type="button" size="icon" variant="outline" className="size-8" onClick={() => setValue(Math.max(1, value - 1))}><Minus className="size-4" /></Button>
        <span className="w-8 text-center font-extrabold">{value}</span>
        <Button type="button" size="icon" variant="outline" className="size-8" onClick={() => setValue(Math.min(max, value + 1))}><Plus className="size-4" /></Button>
      </div>
    </div>
  )

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Insertar tabla">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-extrabold"><Table2 className="size-5 text-primary" /> Nueva tabla</h3>
          <Button type="button" size="icon" variant="ghost" className="size-8" onClick={onClose}><X className="size-4" /></Button>
        </div>
        <div className="space-y-3">
          {stepper("Columnas", cols, setCols, 10)}
          {stepper("Filas", rows, setRows, 20)}
          <button
            type="button"
            aria-pressed={withHeaderRow}
            onClick={() => setWithHeaderRow((value) => !value)}
            className={cnToggle(withHeaderRow)}
          >
            {withHeaderRow ? "Con fila de encabezado" : "Sin fila de encabezado"}
          </button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={() => { onInsert({ rows, cols, withHeaderRow }); onClose() }}>Insertar</Button>
        </div>
      </div>
    </div>
  )
}

function cnToggle(active: boolean) {
  return `w-full rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"}`
}
