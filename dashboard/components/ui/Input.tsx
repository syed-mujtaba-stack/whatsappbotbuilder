"use client";

import { clsx } from "clsx";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[#e8eaf0]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            "w-full rounded-xl bg-[#22263a] border px-4 py-2.5 text-sm text-[#e8eaf0] placeholder:text-[#6b7280] outline-none transition-all duration-150",
            "focus:border-[#6c63ff] focus:ring-2 focus:ring-[#6c63ff]/20",
            error ? "border-[#ef4444]" : "border-[#2a2f45]",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-[#ef4444]">{error}</p>}
        {hint && !error && <p className="text-xs text-[#6b7280]">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
