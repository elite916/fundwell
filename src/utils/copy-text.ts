/**
 * Copies text. Where the clipboard is off (denied, or an in-app browser) it falls back to the old way, which only needs
 * the press itself. Returns whether it worked.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyBySelection(text);
  }
}

function copyBySelection(text: string): boolean {
  const selection = document.getSelection();
  if (!selection) return false;

  const span = document.createElement('span');
  span.textContent = text;
  span.style.cssText =
    'position:fixed;top:0;clip-path:inset(50%);white-space:pre;user-select:text;-webkit-user-select:text';
  document.body.append(span);

  const range = document.createRange();
  range.selectNodeContents(span);
  selection.removeAllRanges();
  selection.addRange(range);

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    selection.removeAllRanges();
    span.remove();
  }
}

/** Selects an element's text, so it can be copied by hand. */
export function selectText(element: Element | null) {
  if (element) document.getSelection()?.selectAllChildren(element);
}
