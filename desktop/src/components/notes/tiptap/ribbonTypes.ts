import type { Editor } from "@tiptap/react";
import type { ReactNode } from "react";
import type { IconName } from "@/components/ui/Icon";

/**
 * Contrato de una pestaña de la cinta.
 *
 * Cada pestaña se define en su propio modulo y solo sabe de si misma. El
 * registro (`ribbonTabs.ts`) es el unico punto que conoce el conjunto, asi que
 * anadir una pestaña nueva no obliga a tocar la cinta ni las demas.
 */
export type RibbonTab = {
  id: string;
  label: string;
  icon: IconName;
  /**
   * Contextual = solo aparece cuando `matches` es cierto, y ademas se
   * selecciona sola. Es el comportamiento de Word: al entrar en una tabla
   * salta su pestaña.
   */
  contextual: boolean;
  /** Si la seleccion actual hace relevante esta pestaña. */
  matches: (editor: Editor) => boolean;
  render: (context: RibbonContext) => ReactNode;
};

/** Lo que la cinta ofrece a cada pestaña. Nada mas. */
export type RibbonContext = {
  editor: Editor;
  /** Abre el selector de archivos de imagen del editor anfitrion. */
  onPickImage: () => void;
  /** Abre el dialogo de insertar tabla del editor anfitrion. */
  onPickTable: () => void;
};
