import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FavoritesPage } from "@/pages/FavoritesPage";
import { useAuth } from "@/context/AuthContext";
import { APP_VERSION, checkForUpdates, installUpdate } from "@/lib/updater";
import type { BibleTarget } from "@/lib/types";
import type { AppTab } from "@/lib/nav";
import { parseAllowedSections } from "@/lib/nav";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { LEGAL_URLS } from "@/lib/config";
import { ReminderSettings } from "@/components/ReminderSettings";
import { Icon } from "@/components/ui/Icon";

type Props = {
  onOpenBible: (target: BibleTarget) => void;
  onNavigate: (tab: AppTab) => void;
};

export function ProfilePage({ onOpenBible, onNavigate }: Props) {
  const { user, isOffline } = useAuth();
  const allowedSections = parseAllowedSections(user?.allowedSections);
  const allows = (section: string) =>
    user?.role === "admin" ||
    !allowedSections ||
    allowedSections.includes(section);
  const [showFavorites, setShowFavorites] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (showFavorites) {
    return (
      <FavoritesPage
        onOpenBible={(t) => {
          setShowFavorites(false);
          onOpenBible(t);
        }}
        onBack={() => setShowFavorites(false)}
      />
    );
  }

  async function handleCheckUpdate() {
    setCheckingUpdate(true);
    setUpdateMsg(null);
    setUpdateAvailable(false);
    try {
      const result = await checkForUpdates();
      setUpdateMsg(result.message);
      setUpdateAvailable(result.available);
    } finally {
      setCheckingUpdate(false);
    }
  }

  async function handleInstallUpdate() {
    setInstalling(true);
    try {
      const msg = await installUpdate();
      setUpdateMsg(msg);
    } catch (err) {
      setUpdateMsg(err instanceof Error ? err.message : "Error al instalar");
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Perfil</h1>
      </header>

      <Card className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 text-3xl font-bold text-primary">
          {user?.name?.charAt(0).toUpperCase() ?? "?"}
        </div>
        <p className="text-xl font-semibold text-foreground">{user?.name}</p>
        <p className="text-muted-foreground">{user?.email}</p>
        {user?.username ? (
          <p className="mt-1 text-sm font-medium text-primary">
            @{user.username}
          </p>
        ) : null}
        <p className="mt-3 text-sm capitalize text-muted-foreground">
          Rol: {user?.role ?? "reader"}
        </p>
        {user?.streakCount != null && user.streakCount > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Racha de lectura: {user.streakCount} días
          </p>
        ) : null}
      </Card>

      <Card className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Contenido
        </p>
        {allows("favorites") ? (
          <Button
            variant="outline"
            fullWidth
            onClick={() => setShowFavorites(true)}
          >
            <Icon name="heart" size={17} />
            Mis favoritos
          </Button>
        ) : null}
        {allows("highlights") ? (
          <Button
            variant="outline"
            fullWidth
            onClick={() => onNavigate("highlights")}
          >
            <Icon name="highlighter" size={17} />
            Mis subrayados
          </Button>
        ) : null}
        {allows("activity") ? (
          <Button
            variant="outline"
            fullWidth
            onClick={() => onNavigate("activity")}
          >
            <Icon name="activity" size={17} />
            Actividad
          </Button>
        ) : null}
        {allows("statistics") ? (
          <Button
            variant="outline"
            fullWidth
            onClick={() => onNavigate("statistics")}
          >
            <Icon name="chart" size={17} />
            Estadísticas
          </Button>
        ) : null}
      </Card>

      <Card className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Apariencia
        </p>
        <ThemeSwitch isAdmin={user?.role === "admin"} />
      </Card>
      <Card>
        <ReminderSettings />
      </Card>

      {user?.role === "admin" ? (
        <Card className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Administración
          </p>
          <Button fullWidth onClick={() => onNavigate("admin")}>
            Gestión de usuarios
          </Button>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Legal y ayuda
        </p>
        <Button variant="outline" fullWidth onClick={() => onNavigate("legal")}>
          Información legal y licencias
        </Button>
        <a
          className="block text-center text-sm font-semibold text-primary"
          href={LEGAL_URLS.accountDeletion}
        >
          Solicitar eliminación de cuenta
        </a>
      </Card>

      <Card>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Sesión
        </p>
        <p className="mt-2 text-sm text-foreground">
          {isOffline
            ? "Modo offline — tu sesión se conserva en este equipo."
            : "Conectado al servidor."}
        </p>
      </Card>
      <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
        <button className="underline" onClick={() => onNavigate("legal")}>
          Términos
        </button>
        <a
          className="underline"
          href={LEGAL_URLS.privacy}
          target="_blank"
          rel="noreferrer"
        >
          Privacidad
        </a>
        <a
          className="underline"
          href={LEGAL_URLS.communityGuidelines}
          target="_blank"
          rel="noreferrer"
        >
          Normas de la comunidad
        </a>
      </div>

      <Card className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Aplicación
        </p>
        <p className="text-sm text-muted-foreground">Versión {APP_VERSION}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleCheckUpdate}
            loading={checkingUpdate}
          >
            Buscar actualizaciones
          </Button>
          {updateAvailable ? (
            <Button onClick={handleInstallUpdate} loading={installing}>
              Instalar
            </Button>
          ) : null}
        </div>
        {updateMsg ? (
          <p className="text-sm text-muted-foreground">{updateMsg}</p>
        ) : null}
      </Card>
    </div>
  );
}
