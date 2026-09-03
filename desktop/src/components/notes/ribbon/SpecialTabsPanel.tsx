import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";

/**
 * Panel horizontal de herramientas especiales (Fondos, Versiculos, Diccionario,
 * Imagen).
 *
 * Muestra dos tarjetas a la vez y se desplaza con flechas. En pantallas anchas
 * caben mas, pero la experiencia base son dos, como se pidio.
 */

export type SpecialOption = {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  onSelect: () => void;
  disabled?: boolean;
  /** Marca la opcion como activa (por ejemplo el modo Fondos encendido). */
  active?: boolean;
};

export type SpecialTab = {
  id: string;
  label: string;
  icon: IconName;
  /** Tinte del acento, en variables CSS ya definidas. */
  tone: "sky" | "primary" | "violet";
  options: SpecialOption[];
};

type Props = {
  tabs: SpecialTab[];
  activeTabId: string | null;
  onActiveTabChange: (id: string | null) => void;
};

/** Cuantas tarjetas caben segun el ancho disponible. Base: 2. */
function useVisibleCount(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [count, setCount] = useState(2);
  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      setCount(width >= 900 ? 4 : width >= 640 ? 3 : 2);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [containerRef]);
  return count;
}

export function SpecialTabsPanel({
  tabs,
  activeTabId,
  onActiveTabChange,
}: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const visibleCount = useVisibleCount(trackRef);
  const [offset, setOffset] = useState(0);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
  const options = activeTab?.options ?? [];
  const maxOffset = Math.max(0, options.length - visibleCount);

  // Al cambiar de pestaña se vuelve al principio del carrusel.
  useEffect(() => {
    setOffset(0);
  }, [activeTabId]);

  // Si cambia el ancho y el desplazamiento se sale de rango, recolocar.
  useEffect(() => {
    setOffset((value) => Math.min(value, maxOffset));
  }, [maxOffset]);

  return (
    <div className="special-panel">
      <div className="special-tabs" role="tablist" aria-label="Herramientas especiales">
        {tabs.map((tab) => {
          const selected = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              title={tab.label}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onActiveTabChange(selected ? null : tab.id)}
              className={`special-tab special-tab-${tab.tone} ${
                selected ? "special-tab-active" : ""
              }`}
            >
              <Icon name={tab.icon} size={15} />
              {tab.label}
            </button>
          );
        })}

        {activeTab ? (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onActiveTabChange(null)}
            title="Cerrar panel"
            aria-label="Cerrar panel"
            className="special-close"
          >
            <Icon name="close" size={14} />
          </button>
        ) : null}
      </div>

      {activeTab ? (
        <div className="special-carousel">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setOffset((value) => Math.max(0, value - 1))}
            disabled={offset === 0}
            title="Anterior"
            aria-label="Opciones anteriores"
            className="special-arrow"
          >
            <Icon name="chevron-left" size={16} />
          </button>

          <div className="special-viewport" ref={trackRef}>
            <div
              className="special-track"
              style={{
                transform: `translateX(-${offset * (100 / visibleCount)}%)`,
              }}
            >
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={option.disabled}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={option.onSelect}
                  style={{ flexBasis: `${100 / visibleCount}%` }}
                  className={`special-card ${option.active ? "special-card-active" : ""}`}
                >
                  <span className="special-card-icon">
                    <Icon name={option.icon} size={16} />
                  </span>
                  <span className="special-card-text">
                    <span className="special-card-title">{option.title}</span>
                    <span className="special-card-desc">{option.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setOffset((value) => Math.min(maxOffset, value + 1))}
            disabled={offset >= maxOffset}
            title="Siguiente"
            aria-label="Más opciones"
            className="special-arrow"
          >
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
