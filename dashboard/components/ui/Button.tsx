"use client";

import { clsx } from "clsx";
import { Loader2 } from "lucide-react";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        {
          // Variants
          "bg-[#6c63ff] text-white hover:bg-[#5a52e0] active:scale-[0.98]":
            variant === "primary",
          "bg-transparent text-[#6b7280] hover:text-[#e8eaf0] hover:bg-[#22263a]":
            variant === "ghost",
          "bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20":
            variant === "danger",
          "border border-[#2a2f45] text-[#e8eaf0] hover:bg-[#22263a]":
            variant === "outline",
          // Sizes
          "text-xs px-3 py-1.5": size === "sm",
          "text-sm px-4 py-2.5": size === "md",
          "text-base px-6 py-3": size === "lg",
        },
        className
      )}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}
