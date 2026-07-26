import { RibbonButton, RibbonDivider } from "../RibbonButton";
import type { RibbonTab } from "../ribbonTypes";

/**
 * Pestaña contextual de tabla: aparece sola al poner el cursor dentro de una,
 * y desaparece al salir. Es el comportamiento que se pidio "tipo Word".
 *
 * Con execCommand esto habia que deducirlo recorriendo el DOM en cada cambio de
 * seleccion; aqui `editor.isActive("table")` lo responde el propio esquema.
 */
export const tableTab: RibbonTab = {
  id: "table",
  label: "Tabla",
  icon: "table",
  contextual: true,
  matches: (editor) => editor.isActive("table"),

  render: ({ editor }) => (
    <>
      <RibbonButton
        title="Insertar fila encima"
        onClick={() => editor.chain().focus().addRowBefore().run()}
      >
        + Fila ↑
      </RibbonButton>
      <RibbonButton
        title="Insertar fila debajo"
        onClick={() => editor.chain().focus().addRowAfter().run()}
      >
        + Fila ↓
      </RibbonButton>
      <RibbonButton
        title="Eliminar fila"
        disabled={!editor.can().deleteRow()}
        onClick={() => editor.chain().focus().deleteRow().run()}
      >
        − Fila
      </RibbonButton>

      <RibbonDivider />

      <RibbonButton
        title="Insertar columna a la izquierda"
        onClick={() => editor.chain().focus().addColumnBefore().run()}
      >
        + Col ←
      </RibbonButton>
      <RibbonButton
        title="Insertar columna a la derecha"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
      >
        + Col →
      </RibbonButton>
      <RibbonButton
        title="Eliminar columna"
        disabled={!editor.can().deleteColumn()}
        onClick={() => editor.chain().focus().deleteColumn().run()}
      >
        − Col
      </RibbonButton>

      <RibbonDivider />

      <RibbonButton
        title="Combinar celdas seleccionadas"
        disabled={!editor.can().mergeCells()}
        onClick={() => editor.chain().focus().mergeCells().run()}
      >
        Combinar
      </RibbonButton>
      <RibbonButton
        title="Dividir celda"
        disabled={!editor.can().splitCell()}
        onClick={() => editor.chain().focus().splitCell().run()}
      >
        Dividir
      </RibbonButton>
      <RibbonButton
        title="Alternar fila de encabezado"
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
      >
        Encabezado
      </RibbonButton>

      <RibbonDivider />

      <RibbonButton
        title="Eliminar la tabla"
        onClick={() => editor.chain().focus().deleteTable().run()}
      >
        Borrar tabla
      </RibbonButton>
    </>
  ),
};
