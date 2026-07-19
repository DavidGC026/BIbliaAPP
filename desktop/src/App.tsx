import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AppLayout } from "@/components/AppLayout";
import { LegalAcceptanceGate } from "@/components/LegalAcceptanceGate";
import { DesktopReminders } from "@/components/DesktopReminders";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage";
import { BiblePage } from "@/pages/BiblePage";
import { FeedPage } from "@/pages/FeedPage";
import { GroupsPage } from "@/pages/GroupsPage";
import { NotesPage } from "@/pages/NotesPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { UniversalSearchPage } from "@/pages/UniversalSearchPage";
import { InsightsPage } from "@/pages/InsightsPage";
import { AdminUsersPage } from "@/pages/AdminUsersPage";
import { LegalPage } from "@/pages/LegalPage";
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
  const [noteTarget, setNoteTarget] = useState<
    { notebookId: number; noteId: number } | undefined
  >();

  useEffect(() => {
    if (!user) return;
    initOffline().catch(() => {});
    getChurchSettings()
      .then(({ settings }) =>
        setChurchName(settings.church_name || "BibliaAPP"),
      )
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
      {tab === "home" && (
        <HomePage
          onOpenBible={openBible}
          onNavigate={setTab}
          onOpenNote={(notebookId, noteId) => {
            setNoteTarget({ notebookId, noteId });
            setTab("notes");
          }}
        />
      )}
      {tab === "bible" && (
        <BiblePage
          target={bibleTarget}
          onTargetConsumed={() => setBibleTarget(undefined)}
        />
      )}
      {tab === "search" && (
        <UniversalSearchPage
          onOpenBible={openBible}
          onOpenNote={(notebookId, noteId) => {
            setNoteTarget({ notebookId, noteId });
            setTab("notes");
          }}
        />
      )}
      {tab === "notes" && (
        <NotesPage
          targetNote={noteTarget}
          onTargetConsumed={() => setNoteTarget(undefined)}
          onOpenBible={openBible}
        />
      )}
      {tab === "feed" && <FeedPage />}
      {tab === "groups" && (
        <GroupsPage
          openGroup={openGroup}
          onOpenGroupConsumed={() => setOpenGroup(null)}
        />
      )}
      {tab === "profile" && (
        <ProfilePage onOpenBible={openBible} onNavigate={setTab} />
      )}
      {tab === "statistics" && <InsightsPage mode="statistics" />}
      {tab === "activity" && <InsightsPage mode="activity" />}
      {tab === "highlights" && <InsightsPage mode="highlights" />}
      {tab === "admin" && <AdminUsersPage />}
      {tab === "legal" && <LegalPage />}
      <LegalAcceptanceGate />
      <DesktopReminders />
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </AuthProvider>
  );
}
