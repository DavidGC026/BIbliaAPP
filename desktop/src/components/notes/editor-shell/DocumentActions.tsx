import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export type SaveState = "saved" | "pending" | "saving" | "error";

type Props = {
  saveState: SaveState;
  onSave: () => void;
  onShare: () => void;
  onExportPdf: () => void;
  onDelete: () => void;
  /** Nota nueva sin guardar: no tiene sentido borrarla ni compartirla. */
  canDelete: boolean;
  busy?: boolean;
};

const SAVE_LABEL: Record<SaveState, string> = {
  saved: "Guardado",
  pending: "Guardar",
  saving: "Guardando…",
  error: "Error al guardar",
};

/**
 * Acciones del documento en la cabecera: Guardar como accion principal, el
 * resto en un menu de tres puntos. Eliminar pide confirmacion explicita.
 */
export function DocumentActions({
  saveState,
  onSave,
  onShare,
  onExportPdf,
  onDelete,
  canDelete,
  busy = false,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        setConfirmingDelete(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setConfirmingDelete(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <div ref={containerRef} className="relative flex items-center gap-1.5">
      <button
        type="button"
        onClick={onSave}
        disabled={busy}
        title="Guardar (Ctrl+S)"
        aria-label="Guardar"
        className={`note-save-btn note-save-${saveState}`}
      >
        <Icon
          name={
            saveState === "saved"
              ? "check"
              : saveState === "error"
                ? "alert"
                : saveState === "saving"
                  ? "sync"
                  : "upload"
          }
          size={15}
        />
        <span className="hidden sm:inline">{SAVE_LABEL[saveState]}</span>
      </button>

      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        title="Más acciones"
        aria-label="Más acciones"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="note-icon-btn"
      >
        <Icon name="more" size={17} />
      </button>

      {menuOpen ? (
        <div role="menu" className="note-actions-menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              onShare();
            }}
            className="note-menu-item"
          >
            <Icon name="share" size={15} />
            Compartir
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              onExportPdf();
            }}
            className="note-menu-item"
          >
            <Icon name="download" size={15} />
            Exportar PDF
          </button>

          {canDelete ? (
            <>
              <div className="note-menu-divider" />
              {confirmingDelete ? (
                <div className="note-menu-confirm">
                  <p>¿Eliminar esta nota? No se puede deshacer.</p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setConfirmingDelete(false);
                        onDelete();
                      }}
                      className="note-menu-danger-confirm"
                    >
                      Sí, eliminar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      className="note-menu-cancel"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => setConfirmingDelete(true)}
                  className="note-menu-item note-menu-danger"
                >
                  <Icon name="delete" size={15} />
                  Eliminar nota
                </button>
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
