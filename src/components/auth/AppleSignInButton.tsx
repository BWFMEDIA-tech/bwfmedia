import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Button, type ButtonProps } from "../ui/button";
import { cn } from "../../lib/utils";
import blackLogo from "../../assets/logos/apple-sign-in-black.svg";
import whiteLogo from "../../assets/logos/apple-sign-in-white.svg";

const appleVariants = cva("apple-sign-in-button", {
  variants: {
    variant: {
      white: "apple-sign-in-white",
      black: "apple-sign-in-black",
      outline: "apple-sign-in-outline",
    },
    size: { default: "apple-sign-in-default", compact: "apple-sign-in-compact" },
  },
  defaultVariants: { variant: "white", size: "default" },
});

export interface AppleSignInButtonProps
  extends Omit<ButtonProps, "variant" | "size" | "children">,
    VariantProps<typeof appleVariants> {
  children?: "Continue with Apple" | "Sign in with Apple" | "Sign up with Apple";
}

/** Apple-compliant provider action. Use white on dark surfaces; black or outline on light surfaces. */
export const AppleSignInButton = forwardRef<HTMLButtonElement, AppleSignInButtonProps>(
  ({ variant = "white", size = "default", children = "Continue with Apple", className, type = "button", ...props }, ref) => (
    <Button ref={ref} type={type} variant="secondary" className={cn(appleVariants({ variant, size }), className)} {...props}>
      <img src={variant === "black" ? whiteLogo : blackLogo} alt="" aria-hidden="true" />
      <span>{children}</span>
    </Button>
  ),
);
AppleSignInButton.displayName = "AppleSignInButton";