const REPLACEMENTS: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape a value for use in HTML text or a quoted attribute. */
export function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (char) => REPLACEMENTS[char]);
}
