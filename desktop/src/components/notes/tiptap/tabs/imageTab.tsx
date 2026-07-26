import { RibbonButton, RibbonDivider } from "../RibbonButton";
import type { RibbonTab } from "../ribbonTypes";

const WIDTHS = ["25%", "50%", "75%", "100%"];

/**
 * Pestaña contextual de imagen: aparece al seleccionar una.
 *
 * Cada ajuste es un `updateAttributes` sobre el nodo, es decir una transaccion
 * del documento: entra en el historial y deshacer lo revierte. Hoy, al tocarse
 * el style del DOM a mano, deshacer no lo alcanza.
 */
export const imageTab: RibbonTab = {
  id: "image",
  label: "Imagen",
  icon: "image",
  contextual: true,
  matches: (editor) => editor.isActive("imageBlock"),

  render: ({ editor }) => {
    const attrs = editor.getAttributes("imageBlock");
    const update = (patch: Record<string, unknown>) =>
      editor.chain().focus().updateAttributes("imageBlock", patch).run();

    return (
      <>
        {WIDTHS.map((width) => (
          <RibbonButton
            key={width}
            title={`Ancho ${width}`}
            active={attrs.width === width}
            onClick={() => update({ width })}
          >
            {width}
          </RibbonButton>
        ))}

        <RibbonDivider />

        {(["left", "center", "right"] as const).map((align) => (
          <RibbonButton
            key={align}
            title={`Alinear a la ${align === "left" ? "izquierda" : align === "center" ? "centro" : "derecha"}`}
            active={attrs.align === align}
            onClick={() => update({ align })}
          >
            {align === "left" ? "⇤" : align === "center" ? "≡" : "⇥"}
          </RibbonButton>
        ))}

        <RibbonDivider />

        <RibbonButton
          title="Usar como fondo, detras del texto"
          active={Boolean(attrs.background)}
          onClick={() => update({ background: !attrs.background })}
        >
          Fondo
        </RibbonButton>

        <RibbonDivider />

        <RibbonButton
          title="Eliminar la imagen"
          onClick={() => editor.chain().focus().deleteSelection().run()}
        >
          Borrar
        </RibbonButton>
      </>
    );
  },
};
