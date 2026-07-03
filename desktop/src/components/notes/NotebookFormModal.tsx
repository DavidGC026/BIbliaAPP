import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { BookCover } from "@/components/notes/BookCover";
import {
  NOTEBOOK_PRESET_COVERS,
  type NotebookCoverId,
  getPresetCover,
  isPresetCover,
} from "@/lib/notebookCovers";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initialName?: string;
  initialCover?: string | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (name: string, coverImage: string) => void;
};

export function NotebookFormModal({
  open,
  mode,
  initialName = "",
  initialCover,
  saving,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState(initialName);
  const [coverId, setCoverId] = useState<NotebookCoverId>(() =>
    isPresetCover(initialCover) ? initialCover : "grad-purple",
  );

  useEffect(() => {
    if (open) {
      setName(initialName);
      setCoverId(isPresetCover(initialCover) ? initialCover : "grad-purple");
    }
  }, [open, initialName, initialCover]);

  if (!open) return null;

  const previewTitle = name.trim() || "Mi libreta";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl">
        <h2 className="text-lg font-bold text-foreground">
          {mode === "create" ? "Nueva libreta" : "Editar libreta"}
        </h2>
        <div className="mt-4 flex justify-center">
          <BookCover title={previewTitle} coverImage={coverId} className="max-w-[120px]" />
        </div>
        <label className="mt-4 block text-sm">
          <span className="text-muted-foreground">Nombre</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
            placeholder="Mi libreta de estudio"
          />
        </label>
        <p className="mt-4 text-xs font-semibold uppercase text-muted-foreground">
          Portada
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {NOTEBOOK_PRESET_COVERS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCoverId(c.id)}
              className={`rounded-lg p-1 ${coverId === c.id ? "ring-2 ring-primary" : ""}`}
              title={c.label}
            >
              <div
                className="h-12 rounded-md"
                style={{
                  background: `linear-gradient(135deg, ${c.colors.join(", ")})`,
                }}
              />
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {getPresetCover(coverId).label}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            onClick={() => onSave(name.trim(), coverId)}
            loading={saving}
            disabled={!name.trim()}
          >
            Guardar
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
