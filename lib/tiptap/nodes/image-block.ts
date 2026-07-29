import { mergeAttributes, Node } from "@tiptap/core"

/** Imagen atomica con atributos transaccionales para historial y compatibilidad. */
export const ImageBlock = Node.create({
  name: "imageBlock",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: "" },
      alt: { default: "Imagen de la nota" },
      width: { default: "60%" },
      align: { default: "center" },
      background: { default: false },
      left: { default: null },
      top: { default: null },
      float: { default: null },
    }
  },

  parseHTML() {
    return [
      {
        tag: "div.note-image-block",
        getAttrs: (element) => {
          const wrapper = element as HTMLElement
          const image = wrapper.querySelector("img")
          if (!image) return false
          return {
            src: image.getAttribute("src") ?? "",
            alt: image.getAttribute("alt") ?? "Imagen de la nota",
            width: wrapper.style.width || "60%",
            align: wrapper.style.textAlign || "center",
            background: wrapper.classList.contains("is-background"),
            left: wrapper.style.left || null,
            top: wrapper.style.top || null,
            float: wrapper.style.float || null,
          }
        },
      },
      {
        tag: "img",
        getAttrs: (element) => {
          const image = element as HTMLElement
          if (image.closest(".note-image-block")) return false
          return {
            src: image.getAttribute("src") ?? "",
            alt: image.getAttribute("alt") ?? "Imagen de la nota",
          }
        },
      },
    ]
  },

  renderHTML({ node }) {
    const { src, alt, width, align, background, left, top, float } = node.attrs
    const styles = [
      `text-align: ${align}`,
      `width: ${width}`,
      "max-width: 100%",
      "display: block",
    ]
    if (background) {
      styles.push("position: absolute", "z-index: 0")
      if (left) styles.push(`left: ${left}`)
      if (top) styles.push(`top: ${top}`)
    } else if (float) {
      styles.push(`float: ${float}`, "margin: 12px")
    } else {
      styles.push("margin: 12px auto")
    }

    return [
      "div",
      mergeAttributes({
        class: background ? "note-image-block is-background" : "note-image-block",
        style: styles.join("; "),
      }),
      ["img", {
        src: String(src),
        alt: String(alt),
        draggable: "false",
        style: "width: 100%; height: auto; border-radius: 8px",
      }],
    ]
  },
})
