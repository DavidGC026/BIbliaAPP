/** Crea un nodo DOM con HTML interno ya compuesto para nodos atomicos. */
export function rawElement(
  tag: string,
  attrs: Record<string, string>,
  html: string,
): HTMLElement {
  const element = document.createElement(tag)
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value))
  element.innerHTML = html
  return element
}
