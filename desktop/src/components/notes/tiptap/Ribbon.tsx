import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ribbonTabs } from "./tabs/ribbonTabs";
import type { RibbonContext } from "./ribbonTypes";

/**
 * Cinta de opciones contextual.
 *
 * No sabe que pestañas existen: las lee del registro. Su unica responsabilidad
 * es decidir cual mostrar y dibujar la fila de botones que devuelva.
 *
 * Regla, igual que en Word: si una pestaña contextual coincide con la seleccion
 * se activa sola; al dejar de coincidir se vuelve a la que el usuario tenia
 * elegida a mano.
 */
export function Ribbon(context: RibbonContext) {
  const { editor } = context;
  const [manualTab, setManualTab] = useState<string>("home");

  const visibleTabs = useMemo(
    () => ribbonTabs.filter((tab) => !tab.contextual || tab.matches(editor)),
    // La cinta se redibuja en cada transaccion del editor (ver TiptapNoteEditor),
    // asi que recalcular aqui basta para seguir la seleccion.
    [editor, editor.state.selection],
  );

  const contextualMatch = visibleTabs.find((tab) => tab.contextual);
  const activeId = contextualMatch?.id ?? manualTab;
  const activeTab =
    visibleTabs.find((tab) => tab.id === activeId) ?? visibleTabs[0];

  // Si la pestaña elegida a mano deja de existir, volver a Inicio.
  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === manualTab)) setManualTab("home");
  }, [visibleTabs, manualTab]);

  if (!activeTab) return null;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div
        className="flex items-center gap-1 border-b border-border px-2 pt-1"
        role="tablist"
      >
        {visibleTabs.map((tab) => {
          const selected = tab.id === activeTab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setManualTab(tab.id)}
              className={[
                "flex items-center gap-1.5 rounded-t-md px-3 py-1.5 text-sm transition-colors",
                selected
                  ? "border-b-2 border-primary font-bold text-primary"
                  : "text-muted-foreground hover:text-foreground",
                tab.contextual && selected ? "bg-primary/10" : "",
              ].join(" ")}
            >
              <Icon name={tab.icon} size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-0.5 p-2" role="tabpanel">
        {activeTab.render(context)}
      </div>
    </div>
  );
}
