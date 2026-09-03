import { Node } from "@tiptap/core"

/** Descarta interfaz antigua que hubiera quedado serializada dentro de la nota. */
export const StripBlockHandle = Node.create({
  name: "stripBlockHandle",
  group: "block",

  parseHTML() {
    return [{ tag: "div.biblia-block-handle", ignore: true }]
  },

  renderHTML() {
    return ["div", {}]
  },
})
