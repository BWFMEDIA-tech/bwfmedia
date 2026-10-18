import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { signLiveStreamThumbnail } from '@/lib/stream-thumbnail.functions';
import { streamThumbnailPath } from '@/lib/stream-thumbnail';

export function StreamThumbnailImage({ src, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const sign = useServerFn(signLiveStreamThumbnail);
  const [resolved, setResolved] = useState<{ source: string; url: string | null } | null>(null);
  const source = typeof src === 'string' ? src : '';
  const privateImage = streamThumbnailPath(source) !== null;
  useEffect(() => {
    if (!privateImage) return;
    let cancelled = false;
    const refresh = () => sign({ data: { url: source } })
      .then((result) => { if (!cancelled) setResolved({ source, url: result.url }); })
      .catch(() => { if (!cancelled) setResolved({ source, url: null }); });
    void refresh();
    const timer = setInterval(refresh, 3_000_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [source, privateImage, sign]);
  const display = privateImage ? (resolved?.source === source ? resolved.url : null) : src;
  return <img {...props} src={display || undefined} />;
}
