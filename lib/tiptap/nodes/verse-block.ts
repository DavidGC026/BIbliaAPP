import { Node } from "@tiptap/core"
import { rawElement } from "../raw-element"

/** Versiculo atomico: se mueve o elimina completo y conserva su HTML canonico. */
export const VerseBlock = Node.create({
  name: "verseBlock",
  group: "block",
  atom: true,
  selectable: true,
  priority: 200,

  addAttributes() {
    return { html: { default: "" } }
  },

  parseHTML() {
    return [{
      tag: "blockquote.biblia-verse-quote",
      getAttrs: (element) => ({ html: (element as HTMLElement).innerHTML }),
    }]
  },

  renderHTML({ node }) {
    return rawElement(
      "blockquote",
      { class: "biblia-verse-quote" },
      String(node.attrs.html ?? ""),
    )
  },
})
