/**
 * Preferencias de distribucion del editor de notas.
 *
 * Se guardan en localStorage porque son preferencias de interfaz por maquina:
 * no viajan al servidor ni forman parte de la nota.
 */

const RIBBON_KEY = "biblia_editor_ribbon_collapsed";
const SIDEBAR_KEY = "biblia_sidebar_collapsed";
const RIBBON_TAB_KEY = "biblia_editor_ribbon_tab";

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw === "1";
  } catch {
    return fallback;
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // Sin almacenamiento la app sigue funcionando; solo se pierde la preferencia.
  }
}

/** Cinta contraida. Por defecto desplegada: el usuario nuevo debe ver las herramientas. */
export function getRibbonCollapsed(): boolean {
  return readFlag(RIBBON_KEY, false);
}

export function saveRibbonCollapsed(value: boolean) {
  writeFlag(RIBBON_KEY, value);
}

/** Barra lateral contraida a solo iconos. */
export function getSidebarCollapsed(): boolean {
  return readFlag(SIDEBAR_KEY, false);
}

export function saveSidebarCollapsed(value: boolean) {
  writeFlag(SIDEBAR_KEY, value);
}

/** Ultima pestaña de la cinta usada. */
export function getRibbonTab(fallback: string): string {
  try {
    return localStorage.getItem(RIBBON_TAB_KEY) ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveRibbonTab(value: string) {
  try {
    localStorage.setItem(RIBBON_TAB_KEY, value);
  } catch {
    // idem
  }
}
