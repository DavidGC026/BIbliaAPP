import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "outline" | "ghost";
  fullWidth?: boolean;
};

export function Button({
  loading,
  variant = "primary",
  fullWidth,
  className = "",
  children,
  disabled,
  ...props
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    outline: "border border-border bg-card text-foreground hover:bg-accent",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-accent",
  };
  const width = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${base} ${variants[variant]} ${width} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Cargando…" : children}
    </button>
  );
}
