/**
 * Dynamic Print Orientation Helper
 * Injects a dynamic @page style rule to ensure cross-browser orientation consistency (Landscape vs. Portrait).
 */
export function setPrintOrientation(orientation: 'landscape' | 'portrait', margin = '8mm') {
  if (typeof document === 'undefined') return;
  let styleEl = document.getElementById('dynamic-print-page') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-print-page';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `@page { size: ${orientation}; margin: ${margin}; }`;
}

export function clearPrintOrientation() {
  if (typeof document === 'undefined') return;
  const styleEl = document.getElementById('dynamic-print-page');
  if (styleEl) {
    styleEl.remove();
  }
}
