import type { RibbonTab } from "../ribbon-types"
import { dictionaryTab, verseTab } from "./block-tabs"
import { homeTab } from "./home-tab"
import { imageTab } from "./image-tab"
import { insertTab } from "./insert-tab"
import { tableTab } from "./table-tab"

/** Registro unico: agregar una pestaña no obliga a modificar la cinta. */
export const ribbonTabs: readonly RibbonTab[] = [
  homeTab,
  insertTab,
  verseTab,
  dictionaryTab,
  tableTab,
  imageTab,
]
