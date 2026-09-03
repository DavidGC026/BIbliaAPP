import { Icon } from "@/components/ui/Icon";
import { RibbonButton, RibbonDivider } from "../RibbonButton";
import type { RibbonTab } from "../ribbonTypes";

const FONT_SIZES = ["14px", "16px", "20px", "28px"];

/** Pestaña siempre visible: formato de texto y de parrafo. */
export const homeTab: RibbonTab = {
  id: "home",
  label: "Inicio",
  icon: "edit",
  contextual: false,
  matches: () => true,

  render: ({ editor, onPickImage, onPickTable }) => (
    <>
      <RibbonButton
        title="Deshacer"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        ↶
      </RibbonButton>
      <RibbonButton
        title="Rehacer"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        ↷
      </RibbonButton>

      <RibbonDivider />

      {([1, 2, 3] as const).map((level) => (
        <RibbonButton
          key={level}
          title={`Título ${level}`}
          active={editor.isActive("heading", { level })}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
        >
          H{level}
        </RibbonButton>
      ))}

      <RibbonDivider />

      <RibbonButton
        title="Negrita"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <span style={{ fontWeight: 900 }}>B</span>
      </RibbonButton>
      <RibbonButton
        title="Cursiva"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <span style={{ fontStyle: "italic" }}>I</span>
      </RibbonButton>
      <RibbonButton
        title="Subrayado"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <span style={{ textDecoration: "underline" }}>U</span>
      </RibbonButton>
      <RibbonButton
        title="Tachado"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <span style={{ textDecoration: "line-through" }}>S</span>
      </RibbonButton>

      <RibbonDivider />

      <RibbonButton
        title="Lista"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •≡
      </RibbonButton>
      <RibbonButton
        title="Lista numerada"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.
      </RibbonButton>
      <RibbonButton
        title="Cita"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Icon name="quote" size={16} />
      </RibbonButton>

      <RibbonDivider />

      {(["left", "center", "right"] as const).map((align) => (
        <RibbonButton
          key={align}
          title={`Alinear a la ${align === "left" ? "izquierda" : align === "center" ? "centro" : "derecha"}`}
          active={editor.isActive({ textAlign: align })}
          onClick={() => editor.chain().focus().setTextAlign(align).run()}
        >
          {align === "left" ? "⇤" : align === "center" ? "≡" : "⇥"}
        </RibbonButton>
      ))}

      <RibbonDivider />

      {FONT_SIZES.map((size) => (
        <RibbonButton
          key={size}
          title={`Tamaño ${size}`}
          onClick={() => editor.chain().focus().setFontSize(size).run()}
        >
          {size.replace("px", "")}
        </RibbonButton>
      ))}

      <RibbonDivider />

      <RibbonButton title="Insertar tabla" onClick={onPickTable}>
        <Icon name="table" size={16} />
      </RibbonButton>
      <RibbonButton title="Insertar imagen" onClick={onPickImage}>
        <Icon name="image" size={16} />
      </RibbonButton>
    </>
  ),
};
