import type { ReactNode } from "react";

/**
 * Grupo de la cinta: una fila de controles con su etiqueta debajo, al estilo de
 * Word. La etiqueta se oculta en ventanas estrechas para ganar altura.
 */
export function RibbonGroup({
  label,
  children,
  /** Grupo secundario: se oculta antes cuando falta espacio. */
  secondary = false,
}: {
  label: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <div
      className={`ribbon-group ${secondary ? "ribbon-group-secondary" : ""}`}
      role="group"
      aria-label={label}
    >
      <div className="ribbon-group-controls">{children}</div>
      <span className="ribbon-group-label">{label}</span>
    </div>
  );
}
