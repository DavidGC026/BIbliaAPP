import type { RibbonTab } from "../ribbonTypes";
import { homeTab } from "./homeTab";
import { tableTab } from "./tableTab";
import { imageTab } from "./imageTab";

/**
 * Registro de pestañas: el unico punto que conoce el conjunto completo.
 *
 * Anadir una pestaña nueva (por ejemplo "Versiculo" al seleccionar uno) es
 * anadir su modulo a este array. Ni `Ribbon` ni las pestañas existentes
 * cambian.
 *
 * El orden importa: es el orden en que se muestran.
 */
export const ribbonTabs: readonly RibbonTab[] = [homeTab, tableTab, imageTab];
