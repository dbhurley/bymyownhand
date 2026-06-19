// Defensive clipboard write shared by the copy-link and copy-embed buttons on
// /success/<hash> and /verify/<hash>. `navigator.clipboard` is undefined in
// insecure (non-HTTPS, non-localhost) contexts, and even where it exists
// `writeText()` can reject — the document isn't focused, permission is denied,
// the browser is older. The call sites used to `await navigator.clipboard
// .writeText(...)` unguarded, so any of those produced an uncaught promise
// rejection and left the button's "Copied" affirmation stuck off with no
// feedback. Returning whether the copy succeeded lets callers flash the
// confirmation only when the text actually reached the clipboard. Same
// treat-the-environment-as-untrusted principle as the sessionStorage /
// localStorage trust-boundary guards.
export async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
