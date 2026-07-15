// Caps how large an image we ever send to the AI scan/save endpoints. A camera photo or uploaded
// file can be several thousand pixels wide — downscaling before upload cuts both the network
// transfer time and Gemini's own processing time, since it doesn't need that much resolution to
// read printed text off a business card.
// Gemini bills and processes images by tile count, which scales with pixel dimensions — 1280px is
// still far more resolution than printed card text needs, but cuts tile count (and latency) versus
// the previous 1600px cap.
export const MAX_IMAGE_DIMENSION = 1280;
export const IMAGE_QUALITY = 0.85;

/** Downscales an arbitrary image Blob/File to fit within MAX_IMAGE_DIMENSION, re-encoded as JPEG. */
export function downscaleImage(blob: Blob, maxDimension = MAX_IMAGE_DIMENSION, quality = IMAGE_QUALITY): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((resized) => (resized ? resolve(resized) : reject(new Error('Failed to downscale image'))), 'image/jpeg', quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}
