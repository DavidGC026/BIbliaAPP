import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/context/AuthContext";
import { NAV_ITEMS, type AppTab } from "@/lib/nav";
import { parseAllowedSections } from "@/lib/nav";
import { COMMUNITY_ENABLED } from "@/lib/config";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";
import { Icon } from "@/components/ui/Icon";

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
  const allowed = parseAllowedSections(user?.allowedSections);
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!COMMUNITY_ENABLED && (item.id === "feed" || item.id === "groups"))
      return false;
    return user?.role === "admin" || !allowed || allowed.includes(item.section);
  });

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
        <div className="border-b border-border px-4 py-5">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt=""
              className="h-10 w-10 rounded-xl object-cover"
            />
            <div className="min-w-0">
              <p className="truncate font-bold text-foreground">BibliaAPP</p>
              <p className="truncate text-xs text-muted-foreground">
                {churchName ?? "…"}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {visibleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                tab === item.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="space-y-2 border-t border-border p-3">
          {isOffline ? (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Sin conexión
            </p>
          ) : null}
          <SyncStatusBadge />
          <NotificationBell
            onNavigateToFeed={onNavigateToFeed}
            onNavigateToGroups={onNavigateToGroups}
            onNavigateToGroup={onNavigateToGroup}
          />
          <Button variant="ghost" fullWidth onClick={() => logout()}>
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">{children}</main>
    </div>
  );
}
