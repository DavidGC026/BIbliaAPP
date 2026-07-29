import { Node } from "@tiptap/core"
import { rawElement } from "../raw-element"

/** Entrada Strong atomica, compatible con el HTML de mobile y desktop. */
export const DictionaryBlock = Node.create({
  name: "dictionaryBlock",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      html: { default: "" },
      strong: { default: null },
    }
  },

  parseHTML() {
    return [{
      tag: "aside.biblia-dict-entry",
      getAttrs: (element) => ({
        html: (element as HTMLElement).innerHTML,
        strong: (element as HTMLElement).getAttribute("data-strong"),
      }),
    }]
  },

  renderHTML({ node }) {
    const attrs: Record<string, string> = { class: "biblia-dict-entry" }
    if (node.attrs.strong) attrs["data-strong"] = String(node.attrs.strong)
    return rawElement("aside", attrs, String(node.attrs.html ?? ""))
  },
})
