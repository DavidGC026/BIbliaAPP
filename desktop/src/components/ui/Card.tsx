import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", children, ...props }: Props) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-5 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
