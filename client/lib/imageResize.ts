// Caps how large an image we ever send to the AI scan/save endpoints. A camera photo or uploaded
// file can be several thousand pixels wide — downscaling before upload cuts both the network
// transfer time and Gemini's own processing time, since it doesn't need that much resolution to
// read printed text off a business card.
// Gemini bills and processes images by tile count, which scales with pixel dimensions — 1024px at
// quality 0.75 is still well beyond the resolution printed card text needs (a business card is
// only ~3.5in wide, so this is ~290 DPI on the long edge), but on a weak mobile connection the
// smaller payload (roughly half the size of the previous 1280px/0.85 settings) is the difference
// between a scan feeling instant and one that visibly waits on the upload, especially with two
// images (front + back) in the same request.
export const MAX_IMAGE_DIMENSION = 1024;
export const IMAGE_QUALITY = 0.75;

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
