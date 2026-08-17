import { clsx } from "clsx";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export default function Card({
  children,
  hover = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={clsx(
        "bg-[#1a1d27] border border-[#2a2f45] rounded-2xl p-5",
        hover &&
          "hover:border-[#6c63ff]/40 hover:bg-[#1e2133] transition-all duration-200 cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
