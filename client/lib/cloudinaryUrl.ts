// Cloudinary photos (avatars, business-card scans, content attachments) are stored at their
// original captured resolution, but list views only ever display them as small thumbnails.
// Without a delivery transform, a thumbnail img tag still downloads the full-size original —
// Cloudinary can resize/re-encode on the fly by inserting a transform segment right after
// `/upload/` in the URL, so the browser only fetches bytes it actually needs.
export function cloudinaryThumb(url: string | undefined, size: number): string | undefined {
  if (!url) return url;
  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const px = Math.round(size * 2); // 2x for retina screens
  const transform = `c_fill,g_auto,w_${px},h_${px},q_auto,f_auto`;
  const insertAt = idx + marker.length;
  return `${url.slice(0, insertAt)}${transform}/${url.slice(insertAt)}`;
}

// For full-size "view image" modals: keep the original crop/dimensions (no downscale needed,
// uploads are already capped client-side, see imageResize.ts) but still let Cloudinary pick a
// smaller/better format (e.g. WebP/AVIF) and its own smart quality — free savings, no visible
// quality loss.
export function cloudinaryOptimized(url: string | undefined): string | undefined {
  if (!url) return url;
  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const insertAt = idx + marker.length;
  return `${url.slice(0, insertAt)}q_auto,f_auto/${url.slice(insertAt)}`;
}
