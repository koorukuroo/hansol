"use client";

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: "default" | "elevated" | "outlined" | "ghost";
  padding?: "sm" | "md" | "lg";
  /** @deprecated No longer used. Hover is automatic when onClick is provided. */
  hover?: boolean;
}

const variantStyles: Record<string, string> = {
  default:
    "bg-surface rounded-[--radius-lg] shadow-[--shadow-sm] border border-border-light",
  elevated:
    "bg-surface rounded-[--radius-lg] shadow-[--shadow-md] border border-border-light",
  outlined:
    "bg-surface rounded-[--radius-lg] border border-border",
  ghost: "bg-transparent",
};

const hoverStyles: Record<string, string> = {
  default:
    "hover:shadow-[--shadow-md] hover:-translate-y-px transition-all duration-200",
  elevated:
    "hover:shadow-[--shadow-lg] hover:-translate-y-px transition-all duration-200",
  outlined:
    "hover:border-border transition-all duration-200",
  ghost:
    "hover:bg-surface-secondary transition-all duration-200",
};

const paddingStyles: Record<string, string> = {
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export default function Card({
  children,
  className = "",
  onClick,
  variant = "default",
  padding = "lg",
  hover: _hover,
}: CardProps) {
  return (
    <div
      className={`${variantStyles[variant]} ${paddingStyles[padding]} ${
        onClick ? `cursor-pointer ${hoverStyles[variant]}` : ""
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
