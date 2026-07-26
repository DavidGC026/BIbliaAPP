import { useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  getRibbonCollapsed,
  getRibbonTab,
  saveRibbonCollapsed,
  saveRibbonTab,
} from "@/lib/editorLayoutPreferences";

export type RibbonTabDef = {
  id: string;
  label: string;
  render: () => ReactNode;
  /**
   * Pestaña contextual: solo existe mientras hay algo seleccionado, se activa
   * sola al aparecer y desaparece al deseleccionar. Igual que en Word.
   */
  contextual?: boolean;
};

type Props = {
  tabs: RibbonTabDef[];
  /** Fila que se muestra bajo la cinta (panel de herramientas especiales). */
  belowRibbon?: ReactNode;
};

/**
 * Cinta de herramientas estilo Word.
 *
 * Responsabilidad unica: gestionar pestañas, estado contraido y su
 * persistencia. No sabe que herramientas hay dentro: cada pestaña se
 * renderiza a si misma.
 *
 * Contraida deja solo la fila de pestañas, que sigue siendo clicable: pulsar
 * una la despliega, igual que en Word.
 */
export function WordRibbon({ tabs, belowRibbon }: Props) {
  const [collapsed, setCollapsed] = useState(getRibbonCollapsed);
  const [manualId, setManualId] = useState(() => getRibbonTab(tabs[0]?.id ?? ""));

  const contextualTab = tabs.find((tab) => tab.contextual);
  // La contextual manda mientras exista; al desaparecer se vuelve a la que el
  // usuario tenia elegida a mano.
  const activeTab =
    contextualTab ?? tabs.find((tab) => tab.id === manualId) ?? tabs[0];

  function selectTab(id: string) {
    setManualId(id);
    // Solo se recuerda una pestaña fija: las contextuales son efimeras.
    if (!tabs.find((tab) => tab.id === id)?.contextual) saveRibbonTab(id);
    // Pulsar una pestaña con la cinta contraida la despliega.
    if (collapsed) {
      setCollapsed(false);
      saveRibbonCollapsed(false);
    }
  }

  function toggleCollapsed() {
    setCollapsed((value) => {
      saveRibbonCollapsed(!value);
      return !value;
    });
  }

  return (
    <div className="ribbon">
      <div className="ribbon-tabs" role="tablist" aria-label="Herramientas">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={!collapsed && tab.id === activeTab?.id}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => selectTab(tab.id)}
            className={`ribbon-tab ${
              tab.contextual ? "ribbon-tab-contextual" : ""
            } ${!collapsed && tab.id === activeTab?.id ? "ribbon-tab-active" : ""}`}
          >
            {tab.label}
          </button>
        ))}

        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={toggleCollapsed}
          title={collapsed ? "Mostrar herramientas" : "Contraer cinta"}
          aria-label={collapsed ? "Mostrar herramientas" : "Contraer cinta"}
          aria-expanded={!collapsed}
          className="ribbon-collapse"
        >
          <Icon name={collapsed ? "chevron-down" : "chevron-up"} size={15} />
        </button>
      </div>

      {/* grid-template-rows anima la altura sin necesitar un alto fijo. */}
      <div className={`ribbon-body ${collapsed ? "ribbon-body-collapsed" : ""}`}>
        <div className="ribbon-body-inner">
          <div className="ribbon-groups" role="tabpanel">
            {activeTab?.render()}
          </div>
          {belowRibbon}
        </div>
      </div>
    </div>
  );
}
