export function streamThumbnailPath(url: string): string | null {
  try {
    const path = decodeURIComponent(new URL(url).pathname.split('/storage/v1/object/public/videos/')[1] ?? '');
    return /^[0-9a-f-]{36}\/stream-thumbnails\/[^/]+\.(png|jpe?g|webp|gif|avif)$/i.test(path) && !path.includes('..') ? path : null;
  } catch { return null; }
}
