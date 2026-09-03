import { Node } from "@tiptap/core";
import { rawElement } from "../rawElement";

/**
 * Versiculo insertado desde el lector.
 *
 * Es atomico: su interior es HTML ya compuesto (referencia en <strong> mas el
 * texto de los versiculos) que el usuario no edita, solo mueve o borra. Al ser
 * un nodo del esquema no puede quedar "a medias": esa es la diferencia con el
 * contentEditable actual, donde el navegador podia llevarse media estructura.
 */
export const VerseBlock = Node.create({
  name: "verseBlock",
  group: "block",
  atom: true,
  selectable: true,
  // Por encima del blockquote de StarterKit, que si no se lleva el versiculo.
  // Un blockquote sin la clase sigue siendo una cita normal.
  priority: 200,

  addAttributes() {
    return {
      html: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "blockquote.biblia-verse-quote",
        getAttrs: (element) => ({ html: (element as HTMLElement).innerHTML }),
      },
    ];
  },

  renderHTML({ node }) {
    return rawElement(
      "blockquote",
      { class: "biblia-verse-quote" },
      String(node.attrs.html ?? ""),
    );
  },
});
