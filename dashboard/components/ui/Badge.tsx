import { clsx } from "clsx";

interface BadgeProps {
  label: string;
  variant?: "success" | "warning" | "danger" | "default" | "purple";
  dot?: boolean;
  className?: string;
}

export default function Badge({
  label,
  variant = "default",
  dot = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
        {
          "bg-[#22c55e]/10 text-[#22c55e]": variant === "success",
          "bg-[#f59e0b]/10 text-[#f59e0b]": variant === "warning",
          "bg-[#ef4444]/10 text-[#ef4444]": variant === "danger",
          "bg-[#6c63ff]/10 text-[#6c63ff]": variant === "purple",
          "bg-[#22263a] text-[#6b7280]": variant === "default",
        },
        className
      )}
    >
      {dot && (
        <span
          className={clsx("w-1.5 h-1.5 rounded-full", {
            "bg-[#22c55e]": variant === "success",
            "bg-[#f59e0b]": variant === "warning",
            "bg-[#ef4444]": variant === "danger",
            "bg-[#6c63ff]": variant === "purple",
            "bg-[#6b7280]": variant === "default",
          })}
        />
      )}
      {label}
    </span>
  );
}
