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
import { TextStyle } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";

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
    TextStyle,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Table.configure({
      resizable: true,
      HTMLAttributes: { class: "biblia-note-table" },
    }),
    TableRow,
    TableCell,
    TableHeader,
    ...bibliaNodes,
  ];
}
