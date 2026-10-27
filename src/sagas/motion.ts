import type { MouseEvent } from "react";
import { flushSync } from "react-dom";
import type { NavigateFunction, NavigateOptions, To } from "react-router-dom";

/** El usuario pidio menos movimiento en su sistema operativo. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Navega usando la View Transition API si el navegador la soporta.
 * Si no existe (o el usuario pidio menos movimiento), es una navegacion normal.
 */
export function navigateWithTransition(
  navigate: NavigateFunction,
  to: To,
  options?: NavigateOptions
): void {
  if (!("startViewTransition" in document) || prefersReducedMotion()) {
    navigate(to, options);
    return;
  }
  // flushSync obliga a React a pintar la nueva pagina DENTRO del callback,
  // asi el navegador puede tomar la foto del "despues" y animar entre ambas.
  document.startViewTransition(() => {
    flushSync(() => navigate(to, options));
  });
}

/** Clic normal (sin Ctrl/Cmd/Shift ni boton central): solo esos se interceptan. */
export function isPlainClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}
