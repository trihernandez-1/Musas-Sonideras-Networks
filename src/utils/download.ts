export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadText(text: string, fileName: string, mimeType: string): void {
  downloadBlob(new Blob([text], { type: mimeType }), fileName);
}

/** Strips HTML tags from rich-text fields for plain-text exports (CSV, etc). */
export function stripHtml(html: string): string {
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}
