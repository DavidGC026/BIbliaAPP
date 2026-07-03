import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage";
import { BiblePage } from "@/pages/BiblePage";
import { FeedPage } from "@/pages/FeedPage";
import { GroupsPage } from "@/pages/GroupsPage";
import { NotesPage } from "@/pages/NotesPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { getChurchSettings } from "@/lib/api";
import { initOffline } from "@/lib/repo";
import type { AppTab } from "@/lib/nav";
import type { BibleTarget } from "@/lib/types";

type OpenGroup = {
  id: number;
  tab?: "prayers" | "events" | "activity";
};

function MainApp() {
  const { user, isLoading } = useAuth();
  const [tab, setTab] = useState<AppTab>("home");
  const [churchName, setChurchName] = useState("BibliaAPP");
  const [bibleTarget, setBibleTarget] = useState<BibleTarget | undefined>();
  const [openGroup, setOpenGroup] = useState<OpenGroup | null>(null);

  useEffect(() => {
    if (!user) return;
    initOffline().catch(() => {});
    getChurchSettings()
      .then(({ settings }) => setChurchName(settings.church_name || "BibliaAPP"))
      .catch(() => {});
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando sesión…</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  function openBible(target: BibleTarget) {
    setBibleTarget(target);
    setTab("bible");
  }

  function navigateToGroup(groupId: number, groupTab?: "prayers" | "events") {
    setOpenGroup({ id: groupId, tab: groupTab });
    setTab("groups");
  }

  return (
    <AppLayout
      tab={tab}
      onTabChange={setTab}
      churchName={churchName}
      onNavigateToFeed={() => setTab("feed")}
      onNavigateToGroups={() => setTab("groups")}
      onNavigateToGroup={navigateToGroup}
    >
      {tab === "home" && <HomePage onOpenBible={openBible} />}
      {tab === "bible" && (
        <BiblePage
          target={bibleTarget}
          onTargetConsumed={() => setBibleTarget(undefined)}
        />
      )}
      {tab === "notes" && <NotesPage />}
      {tab === "feed" && <FeedPage />}
      {tab === "groups" && (
        <GroupsPage
          openGroup={openGroup}
          onOpenGroupConsumed={() => setOpenGroup(null)}
        />
      )}
      {tab === "profile" && <ProfilePage onOpenBible={openBible} />}
    </AppLayout>
  );
}

export default function App() {
  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.classList.toggle("dark", prefersDark.matches);
    };
    apply();
    prefersDark.addEventListener("change", apply);
    return () => prefersDark.removeEventListener("change", apply);
  }, []);

  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
