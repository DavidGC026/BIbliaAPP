import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "outline" | "ghost" | "secondary" | "destructive";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
};

export function Button({
  loading,
  variant = "primary",
  size = "md",
  fullWidth,
  className = "",
  children,
  disabled,
  ...props
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-base",
  };

  const variants = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    outline: "border border-border bg-card text-foreground hover:bg-accent",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-accent",
    secondary: "bg-muted text-foreground hover:bg-muted/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  };

  const width = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${base} ${sizeClasses[size]} ${variants[variant]} ${width} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "Cargando…" : children}
    </button>
  );
}
