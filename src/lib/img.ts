/**
 * Request a right-sized image from the CDN. Unsplash/Cloudinary-style URLs accept
 * width/quality params; anything else (local uploads) is returned unchanged.
 */
export function sized(url: string | undefined, width: number, quality = 72): string {
  if (!url) return '';
  if (url.includes('images.unsplash.com')) {
    try {
      const u = new URL(url);
      u.searchParams.set('w', String(width));
      u.searchParams.set('q', String(quality));
      u.searchParams.set('auto', 'format');
      u.searchParams.set('fit', 'crop');
      return u.toString();
    } catch {
      return url;
    }
  }
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
  }
  return url;
}

/** srcset for 1x/2x screens so retina phones stay sharp without over-downloading. */
export const srcSet = (url: string | undefined, width: number) =>
  url ? `${sized(url, width)} 1x, ${sized(url, width * 2, 60)} 2x` : undefined;
