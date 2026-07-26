/**
 * Raiz de composicion del editor de notas.
 *
 * Es el unico punto que conoce la lista completa de extensiones. Anadir un
 * bloque nuevo es anadir su modulo a este array: ni el editor ni los nodos ya
 * existentes se tocan (abierto a extension, cerrado a modificacion).
 *
 * El editor depende de este array, no de cada nodo concreto, de modo que la
 * vista no sabe que existe un "versiculo" ni un "diccionario".
 */

import type { Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle, FontSize, FontFamily, Color } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { Placeholder, TrailingNode } from "@tiptap/extensions";

import { VerseBlock } from "./nodes/verseBlock";
import { DictBlock } from "./nodes/dictBlock";
import { ImageBlock } from "./nodes/imageBlock";
import { StripBlockHandle } from "./nodes/blockHandle";

/** Extensiones propias de BibliaAPP, sin las genericas de texto. */
export const bibliaNodes: Extensions = [
  VerseBlock,
  DictBlock,
  ImageBlock,
  StripBlockHandle,
];

/** Conjunto completo que usa el editor de notas. */
export function buildNoteExtensions(): Extensions {
  return [
    StarterKit.configure({ underline: false }),
    Underline,
    // TextStyle es el soporte de <span style>; FontSize, FontFamily y Color se
    // apoyan en el y aportan sus comandos.
    TextStyle,
    FontSize,
    FontFamily,
    Color,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Table.configure({
      resizable: true,
      HTMLAttributes: { class: "biblia-note-table" },
    }),
    TableRow,
    TableCell,
    TableHeader,
    Placeholder.configure({ placeholder: "Escribe tu nota…" }),
    // Garantiza un parrafo al final: sin el, una nota que termina en tabla o
    // imagen deja al usuario sin sitio donde escribir.
    TrailingNode,
    ...bibliaNodes,
  ];
}
