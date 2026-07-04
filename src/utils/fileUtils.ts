import type { DrawingRefFile } from '../store/StoreContext';

/**
 * Opens a file in a popup browser window.
 *
 * New approach: If the file has a `fileUrl` (from the backend API),
 * open it directly with window.open — no base64/Blob conversion needed.
 *
 * Legacy fallback: If the file still has a `dataUrl` (in-memory, pre-migration),
 * uses the old blob conversion approach.
 */
export function openFileInPopup(file: DrawingRefFile) {
  // New backend-based files have a direct URL
  const url = file.fileUrl;
  const name = file.fileName || file.name || 'file';
  const mimeType = file.mimeType || file.type || '';

  if (url) {
    const popup = window.open(url, name, 'width=900,height=700,scrollbars=yes,resizable=yes');
    if (!popup) {
      window.open(url, '_blank');
    }
    return;
  }

  // Legacy: base64 dataUrl (pre-migration orders)
  const dataUrl = file.dataUrl;
  if (!dataUrl) return;

  if (mimeType === 'application/pdf') {
    const blob = dataUrlToBlob(dataUrl);
    const blobUrl = URL.createObjectURL(blob);
    const popup = window.open(blobUrl, name, 'width=900,height=700,scrollbars=yes,resizable=yes,toolbar=no,menubar=no');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    if (!popup) window.open(blobUrl, '_blank');
  } else {
    const popup = window.open('', name, 'width=900,height=700,scrollbars=yes,resizable=yes');
    if (popup) {
      popup.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${name}</title>
            <style>
              body { margin: 0; background: #111; display: flex;
                     align-items: center; justify-content: center;
                     min-height: 100vh; }
              img  { max-width: 100%; max-height: 100vh; object-fit: contain; }
            </style>
          </head>
          <body><img src="${dataUrl}" alt="${name}" /></body>
        </html>
      `);
      popup.document.close();
    }
  }
}

/**
 * Convert a base64 data URL string to a Blob object.
 * Used only for legacy pre-migration files that still have dataUrl.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Trigger a file download.
 * Prefers direct URL download; falls back to base64 for legacy files.
 */
export function downloadFile(file: DrawingRefFile) {
  const name = file.fileName || file.name || 'file';

  if (file.fileUrl) {
    const a = document.createElement('a');
    a.href = file.fileUrl;
    a.download = name;
    a.target = '_blank';
    a.click();
    return;
  }

  if (file.dataUrl) {
    const a = document.createElement('a');
    a.href = file.dataUrl;
    a.download = name;
    a.click();
  }
}
