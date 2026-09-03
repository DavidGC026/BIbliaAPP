import type { ReactNode } from "react";

/**
 * Controles reutilizables de la cinta.
 *
 * Todos comparten dos reglas que en un editor son obligatorias:
 * - `onMouseDown` con preventDefault, para no perder la seleccion del texto.
 * - Etiqueta accesible siempre, aunque el boton solo muestre un icono.
 */

type ButtonProps = {
  onAction: () => void;
  label: string;
  active?: boolean;
  disabled?: boolean;
  /** Ensancha el boton cuando lleva texto ademas del icono. */
  wide?: boolean;
  children: ReactNode;
};

export function RibbonButton({
  onAction,
  label,
  active = false,
  disabled = false,
  wide = false,
  children,
}: ButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onAction}
      className={`ribbon-btn ${wide ? "ribbon-btn-wide" : ""} ${
        active ? "ribbon-btn-active" : ""
      }`}
    >
      {children}
    </button>
  );
}

type SelectProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  className?: string;
};

export function RibbonSelect<T extends string>({
  value,
  onChange,
  label,
  options,
  className = "",
}: SelectProps<T>) {
  return (
    <select
      value={value}
      title={label}
      aria-label={label}
      onChange={(event) => onChange(event.target.value as T)}
      className={`ribbon-select ${className}`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** Muestra de color, para texto y resaltado. */
export function RibbonSwatch({
  color,
  onAction,
  label,
}: {
  color: string;
  onAction: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onAction}
      className="ribbon-swatch"
      style={{ backgroundColor: color }}
    />
  );
}
