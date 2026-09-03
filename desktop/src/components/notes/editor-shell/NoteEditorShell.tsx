import type { ReactNode } from "react";

/**
 * Andamiaje del editor a pantalla completa.
 *
 * Solo define la rejilla vertical: cabecera y cinta con su alto natural, y el
 * cuerpo ocupando todo lo que sobra con su propio scroll. No conoce el
 * contenido de ninguna de las tres zonas.
 */
export function NoteEditorShell({
  header,
  ribbon,
  children,
}: {
  header: ReactNode;
  ribbon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="note-shell">
      {header}
      {ribbon}
      {/* min-h-0 es imprescindible: sin el, un hijo flex no se encoge por
          debajo de su contenido y el scroll se escapa a la pagina. */}
      <div className="note-body">{children}</div>
    </div>
  );
}
