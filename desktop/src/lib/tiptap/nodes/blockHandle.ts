import { Node } from "@tiptap/core";

/**
 * Descarta la barra de botones (↑ ↓ Copiar Cortar Eliminar) al leer notas ya
 * guardadas.
 *
 * Esa barra es interfaz, no contenido: hoy se serializa dentro del campo
 * `content` de cada nota y se oculta por CSS. Al entrar al esquema se tira, y
 * al guardar no se emite. Cada cliente la reconstruye al abrir la nota
 * (wrapAllContentBlocks en desktop, normalizeContentBlocks en web y movil).
 */
export const StripBlockHandle = Node.create({
  name: "stripBlockHandle",
  group: "block",

  parseHTML() {
    return [{ tag: "div.biblia-block-handle", ignore: true }];
  },

  renderHTML() {
    return ["div", {}];
  },
});
