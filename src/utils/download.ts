/**
 * Downloads a file from `url` and saves it as `filename`.
 * Throws if the file is missing. This matters because the nginx SPA fallback
 * returns index.html (HTTP 200) for unknown paths, so we also reject HTML responses.
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error('File not found');
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
