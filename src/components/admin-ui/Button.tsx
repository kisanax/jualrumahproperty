import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { Button as ShadcnButton } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

/** Varian kit admin dipetakan ke varian shadcn — API eksternal tidak berubah. */
const SHADCN_VARIANTS = {
  primary: "default",
  secondary: "outline",
  quiet: "ghost",
  danger: "destructive",
} as const;
type ButtonVariant = keyof typeof SHADCN_VARIANTS;

type ShadcnVariantProps = VariantProps<typeof ShadcnButton>;

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <ShadcnButton
      variant={SHADCN_VARIANTS[variant] as NonNullable<ShadcnVariantProps["variant"]>}
      className={className}
      {...props}
    />
  );
}

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  size?: ShadcnVariantProps["size"];
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size,
  className,
  ...linkProps
}: ButtonLinkProps) {
  return (
    <ShadcnButton
      variant={SHADCN_VARIANTS[variant] as NonNullable<ShadcnVariantProps["variant"]>}
      size={size}
      className={className}
      render={<Link href={href} scroll={false} {...linkProps} />}
    >
      {children}
    </ShadcnButton>
  );
}
