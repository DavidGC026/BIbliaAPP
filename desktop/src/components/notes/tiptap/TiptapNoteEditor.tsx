import { useEffect, useReducer } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { buildNoteExtensions } from "@/lib/tiptap/extensions";
import { Ribbon } from "./Ribbon";

/** La instancia que expone el editor, para que el anfitrion pueda insertar. */
export type TiptapEditorInstance = Editor;

type Props = {
  /** HTML inicial. Solo se lee al montar: despues manda el editor. */
  initialHtml: string;
  /** Se llama en cada cambio con el HTML ya serializado. */
  onChange: (html: string) => void;
  onPickImage: () => void;
  onPickTable: () => void;
  fontFamily?: string;
  /** Entrega la instancia al montar, y null al desmontar. */
  onReady?: (editor: TiptapEditorInstance | null) => void;
};

/**
 * Editor de notas sobre Tiptap.
 *
 * Solo se ocupa de montar el editor y conectarlo con la cinta. No sabe nada de
 * guardar, de la API ni de la nota: eso es del componente anfitrion, que recibe
 * el HTML por `onChange`.
 */
export function TiptapNoteEditor({
  initialHtml,
  onChange,
  onPickImage,
  onPickTable,
  fontFamily,
  onReady,
}: Props) {
  const editor = useEditor({
    extensions: buildNoteExtensions(),
    content: initialHtml,
    editorProps: {
      attributes: {
        class:
          "note-rich min-h-[55vh] w-full rounded-b-xl bg-card px-4 py-3 text-base text-foreground outline-none",
      },
    },
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
  });

  // La cinta depende de la seleccion, no solo del contenido: sin esto no se
  // enteraria de que el cursor ha entrado en una tabla. Se fuerza el render con
  // un contador; despachar una transaccion aqui provocaria un bucle.
  const [, forceRender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!editor) return;
    editor.on("selectionUpdate", forceRender);
    editor.on("transaction", forceRender);
    return () => {
      editor.off("selectionUpdate", forceRender);
      editor.off("transaction", forceRender);
    };
  }, [editor]);

  useEffect(() => {
    onReady?.(editor ?? null);
    return () => onReady?.(null);
  }, [editor, onReady]);

  if (!editor) return null;

  return (
    <div className="space-y-2" style={fontFamily ? { fontFamily } : undefined}>
      <Ribbon
        editor={editor}
        onPickImage={onPickImage}
        onPickTable={onPickTable}
      />
      <div className="rounded-xl border border-border bg-card">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
