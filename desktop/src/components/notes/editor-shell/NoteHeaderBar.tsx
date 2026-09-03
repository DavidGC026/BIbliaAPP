import { Icon } from "@/components/ui/Icon";
import { DocumentActions, type SaveState } from "./DocumentActions";

type Props = {
  title: string;
  onTitleChange: (title: string) => void;
  saveState: SaveState;
  wordCount: number;
  onBack: () => void;
  onSave: () => void;
  onShare: () => void;
  onExportPdf: () => void;
  onDelete: () => void;
  canDelete: boolean;
  busy?: boolean;
  /** Controles extra a la derecha (vista previa, editor nuevo…). */
  extras?: React.ReactNode;
};

const STATUS_TEXT: Record<SaveState, string> = {
  saved: "Guardado automáticamente",
  pending: "Cambios pendientes",
  saving: "Autoguardando…",
  error: "No se pudo guardar",
};

/**
 * Cabecera compacta de la nota: una sola fila con volver, titulo editable,
 * estado, contador y acciones. Sustituye a las tres filas que habia antes.
 */
export function NoteHeaderBar({
  title,
  onTitleChange,
  saveState,
  wordCount,
  onBack,
  onSave,
  onShare,
  onExportPdf,
  onDelete,
  canDelete,
  busy,
  extras,
}: Props) {
  return (
    <header className="note-header">
      <button
        type="button"
        onClick={onBack}
        title="Volver a la libreta"
        aria-label="Volver a la libreta"
        className="note-icon-btn"
      >
        <Icon name="arrow-left" size={17} />
      </button>

      <input
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="Título de la nota"
        aria-label="Título de la nota"
        className="note-title-input"
      />

      <span className={`note-status note-status-${saveState}`}>
        {STATUS_TEXT[saveState]}
        <span className="note-status-sep">·</span>
        {wordCount} {wordCount === 1 ? "palabra" : "palabras"}
      </span>

      {extras}

      <DocumentActions
        saveState={saveState}
        onSave={onSave}
        onShare={onShare}
        onExportPdf={onExportPdf}
        onDelete={onDelete}
        canDelete={canDelete}
        busy={busy}
      />
    </header>
  );
}
