import * as React from "react";
import { useSignedAvatarUrl } from "@/lib/useSignedAvatar";

/**
 * Drop-in replacement for `<img>` that transparently signs private
 * `/storage/v1/object/public/avatars/...` URLs. Non-avatar URLs pass through.
 */
export const SignedImg = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ src, onError, ...props }, ref) => {
  const resolved = useSignedAvatarUrl(typeof src === "string" ? src : undefined);
  const [converted, setConverted] = React.useState<string | null>(null);
  React.useEffect(() => setConverted(null), [resolved]);
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Most browsers (non-Safari) can't display iPhone HEIC photos; convert them on the fly.
    if (!converted && resolved && isHeic(resolved)) {
      convertHeic(resolved)
        .then(setConverted)
        .catch(() => onError?.(e));
      return;
    }
    onError?.(e);
  };
  return (
    <img
      ref={ref}
      src={typeof src === "string" ? (converted ?? resolved) : src}
      onError={handleError}
      {...props}
    />
  );
});

const heicCache = new Map<string, Promise<string>>();
function isHeic(url: string) {
  return /\.hei[cf](\?|$)/i.test(url);
}
function convertHeic(url: string): Promise<string> {
  const key = url.split("?")[0];
  let p = heicCache.get(key);
  if (!p) {
    p = (async () => {
      const blob = await (await fetch(url)).blob();
      const { default: heic2any } = await import("heic2any");
      const out = await heic2any({ blob, toType: "image/jpeg", quality: 0.85 });
      return URL.createObjectURL(Array.isArray(out) ? out[0] : out);
    })();
    p.catch(() => heicCache.delete(key));
    heicCache.set(key, p);
  }
  return p;
}
SignedImg.displayName = "SignedImg";

type SignedBackgroundProps = React.HTMLAttributes<HTMLDivElement> & {
  src?: string | null;
  fallbackBackground?: string;
};

export const SignedBackground = React.forwardRef<HTMLDivElement, SignedBackgroundProps>(
  ({ src, fallbackBackground, style, ...props }, ref) => {
    const resolved = useSignedAvatarUrl(src ?? undefined);
    return (
      <div
        ref={ref}
        style={{
          ...style,
          backgroundImage: resolved ? `url(${resolved})` : fallbackBackground,
        }}
        {...props}
      />
    );
  },
);
SignedBackground.displayName = "SignedBackground";