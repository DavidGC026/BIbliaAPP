import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Imagen de la nota.
 *
 * Conserva el envoltorio .note-image-block con su ancho, alineacion y modo
 * fondo, que es el formato que ya entienden web y movil. El estado vive en
 * atributos del nodo, no en el style del DOM, de modo que redimensionar o
 * alinear sea una transaccion del documento y entre en el historial.
 */
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
    };
  },

  parseHTML() {
    return [
      {
        tag: "div.note-image-block",
        getAttrs: (element) => {
          const el = element as HTMLElement;
          const img = el.querySelector("img");
          if (!img) return false;
          return {
            src: img.getAttribute("src") ?? "",
            alt: img.getAttribute("alt") ?? "Imagen de la nota",
            width: el.style.width || "60%",
            align: el.style.textAlign || "center",
            background: el.classList.contains("is-background"),
            left: el.style.left || null,
            top: el.style.top || null,
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { src, alt, width, align, background, left, top } = node.attrs;
    const styles = [
      `text-align: ${align}`,
      `width: ${width}`,
      "max-width: 100%",
      "display: block",
    ];
    if (background) {
      styles.push("position: absolute", "z-index: -1");
      if (left) styles.push(`left: ${left}`);
      if (top) styles.push(`top: ${top}`);
    } else {
      styles.push("margin: 12px auto");
    }
    return [
      "div",
      mergeAttributes({
        class: background
          ? "note-image-block is-background"
          : "note-image-block",
        style: styles.join("; "),
      }),
      [
        "img",
        {
          src: String(src),
          alt: String(alt),
          draggable: "false",
          style: "width: 100%; height: auto; border-radius: 8px",
        },
      ],
    ];
  },
});
