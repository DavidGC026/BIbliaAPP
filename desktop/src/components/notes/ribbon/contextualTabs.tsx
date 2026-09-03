import { Icon } from "@/components/ui/Icon";
import { RibbonButton } from "./RibbonControls";
import { RibbonGroup } from "./RibbonGroup";
import type { RibbonTabDef } from "./WordRibbon";
import type {
  NoteBlockController,
  NoteBlockSelection,
} from "@/lib/noteEditorBlocks";

/**
 * Pestañas contextuales de la cinta, equivalentes a las de Word.
 *
 * Aquí viven las acciones que antes estaban incrustadas dentro del documento
 * (mover, copiar, cortar, eliminar y las de tabla). El contenido de la nota no
 * muestra ningún control: solo un contorno al seleccionar.
 */

type ImageTools = {
  isBackground: boolean;
  width: number;
  align: "left" | "center" | "right" | "full";
  setMode: (mode: "normal" | "background") => void;
  setWidth: (width: number) => void;
  setAlign: (align: "left" | "center" | "right" | "full") => void;
  move: (direction: "up" | "down") => void;
  remove: () => void;
  deselect: () => void;
};

/** Acciones comunes a todo bloque estructurado. */
function blockActions(controller: NoteBlockController | null) {
  return (
    <>
      <RibbonGroup label="Orden">
        <RibbonButton label="Mover arriba" onAction={() => controller?.move("up")}>
          <Icon name="chevron-up" size={16} />
        </RibbonButton>
        <RibbonButton label="Mover abajo" onAction={() => controller?.move("down")}>
          <Icon name="chevron-down" size={16} />
        </RibbonButton>
      </RibbonGroup>

      <RibbonGroup label="Portapapeles">
        <RibbonButton label="Copiar" wide onAction={() => controller?.copy()}>
          <Icon name="copy" size={15} />
          Copiar
        </RibbonButton>
        <RibbonButton label="Cortar" wide onAction={() => controller?.cut()}>
          Cortar
        </RibbonButton>
      </RibbonGroup>

      <RibbonGroup label="Bloque">
        <RibbonButton label="Eliminar" wide onAction={() => controller?.remove()}>
          <Icon name="delete" size={15} />
          Eliminar
        </RibbonButton>
        <RibbonButton
          label="Quitar selección"
          wide
          onAction={() => controller?.clear()}
        >
          <Icon name="close" size={15} />
          Deseleccionar
        </RibbonButton>
      </RibbonGroup>
    </>
  );
}

/**
 * Devuelve la pestaña contextual que corresponde a la selección actual, o null
 * si no hay nada seleccionado.
 */
export function buildContextualTab(
  selection: NoteBlockSelection,
  controller: NoteBlockController | null,
  image: ImageTools | null,
): RibbonTabDef | null {
  if (image) {
    return {
      id: "formato-imagen",
      label: "Formato de imagen",
      contextual: true,
      render: () => (
        <>
          <RibbonGroup label="Tamaño">
            {[25, 50, 75, 100].map((width) => (
              <RibbonButton
                key={width}
                label={`Ancho ${width} %`}
                wide
                active={image.width === width}
                onAction={() => image.setWidth(width)}
              >
                {width} %
              </RibbonButton>
            ))}
          </RibbonGroup>

          <RibbonGroup label="Posición">
            <RibbonButton
              label="Alinear a la izquierda"
              active={image.align === "left"}
              onAction={() => image.setAlign("left")}
            >
              ⇤
            </RibbonButton>
            <RibbonButton
              label="Centrar"
              active={image.align === "center"}
              onAction={() => image.setAlign("center")}
            >
              ≡
            </RibbonButton>
            <RibbonButton
              label="Alinear a la derecha"
              active={image.align === "right"}
              onAction={() => image.setAlign("right")}
            >
              ⇥
            </RibbonButton>
            <RibbonButton
              label="Ancho completo"
              active={image.align === "full"}
              onAction={() => image.setAlign("full")}
            >
              ⇹
            </RibbonButton>
          </RibbonGroup>

          <RibbonGroup label="Ajuste">
            <RibbonButton
              label={
                image.isBackground
                  ? "Devolver la imagen al flujo del texto"
                  : "Enviar la imagen detrás del texto"
              }
              wide
              active={image.isBackground}
              onAction={() =>
                image.setMode(image.isBackground ? "normal" : "background")
              }
            >
              <Icon name="image" size={15} />
              {image.isBackground ? "Quitar fondo" : "Detrás del texto"}
            </RibbonButton>
          </RibbonGroup>

          <RibbonGroup label="Orden" secondary>
            <RibbonButton label="Mover arriba" onAction={() => image.move("up")}>
              <Icon name="chevron-up" size={16} />
            </RibbonButton>
            <RibbonButton label="Mover abajo" onAction={() => image.move("down")}>
              <Icon name="chevron-down" size={16} />
            </RibbonButton>
          </RibbonGroup>

          <RibbonGroup label="Imagen">
            <RibbonButton label="Eliminar imagen" wide onAction={image.remove}>
              <Icon name="delete" size={15} />
              Eliminar
            </RibbonButton>
            <RibbonButton
              label="Quitar selección"
              wide
              onAction={image.deselect}
            >
              <Icon name="close" size={15} />
              Deseleccionar
            </RibbonButton>
          </RibbonGroup>
        </>
      ),
    };
  }

  if (!selection) return null;

  if (selection.kind === "table") {
    return {
      id: "diseno-tabla",
      label: "Diseño de tabla",
      contextual: true,
      render: () => (
        <>
          <RibbonGroup label="Filas">
            <RibbonButton
              label="Añadir fila"
              wide
              onAction={() => controller?.changeTable("table-row-add")}
            >
              + Fila
            </RibbonButton>
            <RibbonButton
              label="Quitar la última fila"
              wide
              onAction={() => controller?.changeTable("table-row-del")}
            >
              − Fila
            </RibbonButton>
          </RibbonGroup>

          <RibbonGroup label="Columnas">
            <RibbonButton
              label="Añadir columna"
              wide
              onAction={() => controller?.changeTable("table-col-add")}
            >
              + Columna
            </RibbonButton>
            <RibbonButton
              label="Quitar la última columna"
              wide
              onAction={() => controller?.changeTable("table-col-del")}
            >
              − Columna
            </RibbonButton>
          </RibbonGroup>

          {blockActions(controller)}
        </>
      ),
    };
  }

  const label =
    selection.kind === "verse" ? "Formato de versículo" : "Formato de definición";

  return {
    id: `formato-${selection.kind}`,
    label,
    contextual: true,
    render: () => blockActions(controller),
  };
}
