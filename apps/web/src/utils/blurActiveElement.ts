/** Blur the focused element so MUI Modals can safely aria-hide #root. */
export function blurActiveElement(): void {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body) {
    active.blur();
  }
}
