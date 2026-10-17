export interface CompressResult {
  file: File;
  originalBytes: number;
  compressedBytes: number;
  width: number;
  height: number;
  /** false when the original was already smaller than any re-encode */
  compressed: boolean;
}

export interface CompressOptions {
  /** Longest edge in pixels (product photos look sharp at 1600 incl. zoom). */
  maxDimension?: number;
  /** 0–1 encoder quality. */
  quality?: number;
}

const supportsWebP = (() => {
  try {
    return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
})();

/**
 * Resize + re-encode an image in the browser before upload (WebP, JPEG fallback).
 * Orientation from phone EXIF is applied; EXIF metadata (incl. GPS) is stripped.
 */
export async function compressImage(file: File, opts: CompressOptions = {}): Promise<CompressResult> {
  const maxDimension = opts.maxDimension ?? 1600;
  const quality = opts.quality ?? 0.82;

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const type = supportsWebP ? 'image/webp' : 'image/jpeg';
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not compress this image.'))), type, quality)
  );

  // Never make a file bigger: keep the original if it already beats the re-encode
  if (blob.size >= file.size && scale === 1) {
    return { file, originalBytes: file.size, compressedBytes: file.size, width, height, compressed: false };
  }

  const ext = type === 'image/webp' ? 'webp' : 'jpg';
  const name = file.name.replace(/\.[^.]+$/, '') + '.' + ext;
  return {
    file: new File([blob], name, { type, lastModified: Date.now() }),
    originalBytes: file.size,
    compressedBytes: blob.size,
    width,
    height,
    compressed: true,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
