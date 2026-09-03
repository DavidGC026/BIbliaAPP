import type { ReactNode } from "react";

type Props = {
  onClick: () => void;
  title: string;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
};

/**
 * Boton de la cinta.
 *
 * `onMouseDown` con preventDefault es imprescindible: sin el, pulsar el boton
 * mueve el foco fuera del editor y se pierde la seleccion sobre la que hay que
 * aplicar el formato.
 */
export function RibbonButton({
  onClick,
  title,
  active = false,
  disabled = false,
  children,
}: Props) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={[
        "flex h-9 min-w-9 items-center justify-center gap-1 rounded-md px-2 text-sm transition-colors",
        active
          ? "bg-primary/15 font-bold text-primary"
          : "text-foreground hover:bg-accent",
        disabled ? "cursor-not-allowed opacity-40 hover:bg-transparent" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/** Separador vertical entre grupos de botones. */
export function RibbonDivider() {
  return <span className="mx-1 h-6 w-px shrink-0 bg-border" />;
}
