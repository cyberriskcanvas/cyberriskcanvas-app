/**
 * Browsers only expose parts of the Web Crypto and Clipboard APIs in a secure
 * context (https, or localhost). Self-hosted instances served over plain http
 * therefore crash on `crypto.randomUUID()` — which every "add node / add entry"
 * path uses — and on `navigator.clipboard`. These fallbacks keep those paths
 * working; running over https remains the recommended setup.
 */

/** Installs a getRandomValues-based `randomUUID` if the platform lacks one. */
export function polyfillRandomUUID(target: Crypto): void {
  if (typeof target.randomUUID === 'function') return;

  Object.assign(target, {
    randomUUID: () => {
      const bytes = target.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10x
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    },
  });
}

/** Copies text to the clipboard, falling back to execCommand without https. */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy path
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  textarea.remove();
  return ok;
}

if (typeof window !== 'undefined') {
  polyfillRandomUUID(window.crypto);
}
