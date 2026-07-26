import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/context/AuthContext";
import { NAV_ITEMS, type AppTab } from "@/lib/nav";
import { parseAllowedSections } from "@/lib/nav";
import { COMMUNITY_ENABLED } from "@/lib/config";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";
import { Icon } from "@/components/ui/Icon";
import {
  getSidebarCollapsed,
  saveSidebarCollapsed,
} from "@/lib/editorLayoutPreferences";

type Props = {
  tab: AppTab;
  onTabChange: (tab: AppTab) => void;
  churchName?: string;
  onNavigateToFeed?: () => void;
  onNavigateToGroups?: () => void;
  onNavigateToGroup?: (groupId: number, tab?: "prayers" | "events") => void;
  children: ReactNode;
};

export function AppLayout({
  tab,
  onTabChange,
  churchName,
  onNavigateToFeed,
  onNavigateToGroups,
  onNavigateToGroup,
  children,
}: Props) {
  const { user, isOffline, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(getSidebarCollapsed);
  const allowed = parseAllowedSections(user?.allowedSections);
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!COMMUNITY_ENABLED && (item.id === "feed" || item.id === "groups"))
      return false;
    return user?.role === "admin" || !allowed || allowed.includes(item.section);
  });

  function toggleSidebar() {
    setCollapsed((value) => {
      saveSidebarCollapsed(!value);
      return !value;
    });
  }

  return (
    // h-screen + overflow-hidden: el scroll pasa a ser responsabilidad de cada
    // pagina, para que el editor pueda desplazar solo el cuerpo de la nota.
    <div className="flex h-screen overflow-hidden bg-background">
      <aside
        className={`flex shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 ease-out ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        <div
          className={`flex items-center border-b border-border py-4 ${
            collapsed ? "justify-center px-2" : "gap-3 px-4"
          }`}
        >
          <img
            src="/logo.png"
            alt=""
            className="h-9 w-9 shrink-0 rounded-xl object-cover"
          />
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-foreground">BibliaAPP</p>
              <p className="truncate text-xs text-muted-foreground">
                {churchName ?? "…"}
              </p>
            </div>
          ) : null}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {visibleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              aria-current={tab === item.id ? "page" : undefined}
              className={`flex w-full items-center rounded-lg py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                collapsed ? "justify-center px-2" : "gap-3 px-3"
              } ${
                tab === item.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon name={item.icon} size={18} />
              {!collapsed ? item.label : null}
            </button>
          ))}
        </nav>

        <div
          className={`space-y-2 border-t border-border ${collapsed ? "p-2" : "p-3"}`}
        >
          {isOffline && !collapsed ? (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Sin conexión
            </p>
          ) : null}
          {isOffline && collapsed ? (
            <div
              title="Sin conexión"
              className="flex justify-center rounded-lg bg-amber-500/10 py-2 text-amber-600 dark:text-amber-300"
            >
              <Icon name="offline" size={18} />
            </div>
          ) : null}

          {!collapsed ? <SyncStatusBadge /> : null}

          <NotificationBell
            collapsed={collapsed}
            onNavigateToFeed={onNavigateToFeed}
            onNavigateToGroups={onNavigateToGroups}
            onNavigateToGroup={onNavigateToGroup}
          />

          {collapsed ? (
            <button
              type="button"
              onClick={() => logout()}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="flex w-full justify-center rounded-lg py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon name="logout" size={18} />
            </button>
          ) : (
            <Button variant="ghost" fullWidth onClick={() => logout()}>
              Cerrar sesión
            </Button>
          )}

          <button
            type="button"
            onClick={toggleSidebar}
            title={collapsed ? "Expandir menú" : "Contraer menú"}
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            aria-expanded={!collapsed}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon
              name={collapsed ? "sidebar-expand" : "sidebar-collapse"}
              size={16}
            />
            {!collapsed ? "Contraer" : null}
          </button>
        </div>
      </aside>

      {/* overflow-y-auto para que las paginas largas sigan desplazandose como
          siempre. Una pagina que quiera gestionar su propio scroll (el editor)
          solo tiene que ocupar h-full: asi no sobra alto y este scroll no
          aparece. */}
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
