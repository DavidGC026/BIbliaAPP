"use client"

import { useEffect } from "react"

/** Margen para no confundir el teclado con la barra dinámica del navegador. */
const KEYBOARD_THRESHOLD = 120

/** El teclado de iOS entra animado: un segundo repaso recoge la altura final. */
const SETTLE_DELAY = 320

/**
 * Publica el viewport **visible** como variables CSS mientras se edita una nota
 * en móvil, y marca `body` con `note-immersive` / `keyboard-open`.
 *
 * `app/globals.css` ancla el editor a esas variables porque iOS no encoge el
 * viewport de layout (ni `100dvh`) al abrir el teclado: solo desplaza el
 * viewport visible dentro de él. Sin `--app-visual-offset` el editor queda
 * anclado al layout y la cinta inferior sube con el desplazamiento, dejando un
 * hueco entre ella y el teclado.
 */
export function useImmersiveViewport(active: boolean) {
  useEffect(() => {
    if (!active) return

    const root = document.documentElement
    const viewport = window.visualViewport
    // Altura de referencia sin teclado: la mayor observada junto al viewport de
    // layout —que en iOS no encoge—, para acertar aunque el editor se monte con
    // el teclado ya abierto.
    let baseline = 0

    const sync = () => {
      const height = Math.round(viewport?.height ?? window.innerHeight)
      const offset = Math.round(viewport?.offsetTop ?? 0)
      root.style.setProperty("--app-visual-height", `${height}px`)
      root.style.setProperty("--app-visual-offset", `${offset}px`)
      baseline = Math.max(baseline, height, root.clientHeight)
      document.body.classList.toggle("keyboard-open", height < baseline - KEYBOARD_THRESHOLD)
    }

    let settle = 0
    const syncSettled = () => {
      sync()
      window.clearTimeout(settle)
      settle = window.setTimeout(sync, SETTLE_DELAY)
    }

    document.body.classList.add("note-immersive")
    sync()
    viewport?.addEventListener("resize", syncSettled)
    // iOS emite `scroll` del viewport visible al desplazarlo por el teclado.
    viewport?.addEventListener("scroll", sync)
    window.addEventListener("orientationchange", syncSettled)
    window.addEventListener("focusin", syncSettled)

    return () => {
      window.clearTimeout(settle)
      document.body.classList.remove("note-immersive")
      document.body.classList.remove("keyboard-open")
      root.style.removeProperty("--app-visual-height")
      root.style.removeProperty("--app-visual-offset")
      viewport?.removeEventListener("resize", syncSettled)
      viewport?.removeEventListener("scroll", sync)
      window.removeEventListener("orientationchange", syncSettled)
      window.removeEventListener("focusin", syncSettled)
    }
  }, [active])
}
