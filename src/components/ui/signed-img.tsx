import * as React from "react";
import { useSignedAvatarUrl } from "@/lib/useSignedAvatar";

/**
 * Drop-in replacement for `<img>` that transparently signs private
 * `/storage/v1/object/public/avatars/...` URLs. Non-avatar URLs pass through.
 */
export const SignedImg = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ src, ...props }, ref) => {
  const resolved = useSignedAvatarUrl(typeof src === "string" ? src : undefined);
  return <img ref={ref} src={typeof src === "string" ? resolved : src} {...props} />;
});
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