import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FavoritesPage } from "@/pages/FavoritesPage";
import { BlockedUsersDialog } from "@/components/BlockedUsersDialog";
import { useAuth } from "@/context/AuthContext";
import { APP_VERSION, checkForUpdates, installUpdate } from "@/lib/updater";
import * as api from "@/lib/api";
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
  const { user, isOffline, logout } = useAuth();
  const allowedSections = parseAllowedSections(user?.allowedSections);
  const allows = (section: string) =>
    user?.role === "admin" ||
    !allowedSections ||
    allowedSections.includes(section);

  const [showFavorites, setShowFavorites] = useState(false);
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    setDeleteError(null);
    try {
      await api.deleteAccount(deletePassword.trim() || undefined);
      setDeleteModalOpen(false);
      await logout();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Error al eliminar la cuenta.",
      );
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <div className="desktop-page space-y-6 p-4 sm:p-6 lg:p-8 w-full pb-24">
      {/* Header */}
      <header className="border-b border-border/40 pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Perfil y Configuración
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Gestiona tu cuenta, preferencias visuales, recordatorios y privacidad.
        </p>
      </header>

      {/* 2-COLUMN WIDESCREEN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: User Card, Personal Content, Status & App info */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">

          {/* User info card */}
          <Card className="text-center shadow-sm border-border/80 p-6 space-y-4">
            <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-primary/15 text-4xl font-bold text-primary ring-4 ring-primary/10">
              {user?.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {user?.username ? (
                <p className="mt-1 text-xs font-semibold text-primary">
                  @{user.username}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="rounded-full bg-muted/60 px-3 py-1 text-xs font-semibold text-foreground">
                Rol: {user?.role === "admin" ? "Administrador" : "Lector"}
              </span>
              {user?.streakCount != null && user.streakCount > 0 ? (
                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                  🔥 Racha: {user.streakCount} días
                </span>
              ) : null}
            </div>

            <div className="pt-2 border-t border-border/50">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => logout()}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Cerrar sesión en este equipo
              </Button>
            </div>
          </Card>

          {/* Personal Content Shortcuts */}
          <Card className="space-y-3 shadow-sm border-border/80 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Contenido personal
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {allows("favorites") ? (
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => setShowFavorites(true)}
                  className="justify-start gap-3 h-10 text-xs sm:text-sm font-medium"
                >
                  <Icon name="heart" size={16} />
                  <span>Mis favoritos</span>
                </Button>
              ) : null}
              {allows("highlights") ? (
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => onNavigate("highlights")}
                  className="justify-start gap-3 h-10 text-xs sm:text-sm font-medium"
                >
                  <Icon name="sparkles" size={16} />
                  <span>Mis subrayados</span>
                </Button>
              ) : null}
              {allows("activity") ? (
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => onNavigate("activity")}
                  className="justify-start gap-3 h-10 text-xs sm:text-sm font-medium"
                >
                  <Icon name="activity" size={16} />
                  <span>Actividad de lectura</span>
                </Button>
              ) : null}
              {allows("statistics") ? (
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => onNavigate("statistics")}
                  className="justify-start gap-3 h-10 text-xs sm:text-sm font-medium"
                >
                  <Icon name="chart" size={16} />
                  <span>Estadísticas de estudio</span>
                </Button>
              ) : null}
            </div>
          </Card>

          {/* Connection Status */}
          <Card className="shadow-sm border-border/80 p-5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Estado de conexión
            </p>
            <div className="flex items-center gap-2">
              <span
                className={`size-2.5 rounded-full ${
                  isOffline ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
                }`}
              />
              <p className="text-sm font-semibold text-foreground">
                {isOffline ? "Modo Offline" : "Conectado al servidor"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isOffline
                ? "Tus cambios se guardan localmente en SQLite y se sincronizarán al recuperar conexión."
                : "Tus libretas, notas y progreso están sincronizados en la nube."}
            </p>
          </Card>

          {/* App Version & Updater */}
          <Card className="space-y-3 shadow-sm border-border/80 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Aplicación
                </p>
                <p className="text-sm font-bold text-foreground">
                  BibliaAPP v{APP_VERSION}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckUpdate}
                loading={checkingUpdate}
                className="text-xs"
              >
                Buscar actualización
              </Button>
            </div>
            {updateAvailable ? (
              <Button
                fullWidth
                size="sm"
                onClick={handleInstallUpdate}
                loading={installing}
              >
                Instalar actualización
              </Button>
            ) : null}
            {updateMsg ? (
              <p className="text-xs text-muted-foreground italic">{updateMsg}</p>
            ) : null}
          </Card>
        </div>

        {/* RIGHT COLUMN: Appearance, Reminders, Safety & Admin */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">

          {/* Appearance & Themes */}
          <Card className="space-y-4 shadow-sm border-border/80 p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Apariencia y paleta
              </p>
              <h3 className="text-lg font-bold text-foreground mt-0.5">
                Temas del sistema y de lectura
              </h3>
            </div>
            <ThemeSwitch isAdmin={user?.role === "admin"} />
          </Card>

          {/* Reminders */}
          <Card className="shadow-sm border-border/80 p-6">
            <ReminderSettings />
          </Card>

          {/* Admin Panel shortcut */}
          {user?.role === "admin" ? (
            <Card className="space-y-3 shadow-sm border-primary/30 bg-primary/[0.03] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    Panel de Administración
                  </p>
                  <h3 className="text-lg font-bold text-foreground mt-0.5">
                    Gestión de usuarios y moderación comunitaria
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Administra cuentas, roles, permisos de secciones y resuelve reportes de moderación.
                  </p>
                </div>
                <Button onClick={() => onNavigate("admin")} className="shrink-0">
                  Abrir panel
                </Button>
              </div>
            </Card>
          ) : null}

          {/* Privacy & Safety */}
          <Card className="space-y-4 shadow-sm border-border/80 p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Privacidad y seguridad
              </p>
              <h3 className="text-lg font-bold text-foreground mt-0.5">
                Control de tu cuenta y comunidad
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => setShowBlockedDialog(true)}
                className="justify-start gap-2.5 h-10 text-xs sm:text-sm font-medium"
              >
                <Icon name="alert" size={16} />
                <span>Usuarios bloqueados</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => onNavigate("legal")}
                className="justify-start gap-2.5 h-10 text-xs sm:text-sm font-medium"
              >
                <Icon name="notes" size={16} />
                <span>Información legal y licencias</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setDeleteModalOpen(true)}
                className="sm:col-span-2 justify-start gap-2.5 h-10 text-xs sm:text-sm text-destructive hover:bg-destructive/10 border-destructive/30"
              >
                <Icon name="close" size={16} />
                <span>Eliminar mi cuenta definitivamente</span>
              </Button>
            </div>
          </Card>

          {/* Legal Footer Links */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground border-t border-border/40 pt-4 px-1">
            <div className="flex flex-wrap gap-4">
              <button
                className="hover:underline hover:text-foreground transition-colors"
                onClick={() => onNavigate("legal")}
              >
                Términos de servicio
              </button>
              <a
                className="hover:underline hover:text-foreground transition-colors"
                href={LEGAL_URLS.privacy}
                target="_blank"
                rel="noreferrer"
              >
                Política de privacidad
              </a>
              <a
                className="hover:underline hover:text-foreground transition-colors"
                href={LEGAL_URLS.communityGuidelines}
                target="_blank"
                rel="noreferrer"
              >
                Normas de la comunidad
              </a>
            </div>
            <span>© 2026 BibliaAPP. Todos los derechos reservados.</span>
          </div>
        </div>
      </div>

      {/* Blocked Users Dialog */}
      <BlockedUsersDialog
        isOpen={showBlockedDialog}
        onClose={() => setShowBlockedDialog(false)}
      />

      {/* Account Deletion Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10">
                <Icon name="alert" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  ¿Eliminar cuenta?
                </h3>
                <p className="text-xs text-muted-foreground">
                  Esta acción es permanente e irreversible.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Al eliminar tu cuenta se borrarán permanentemente tus libretas,
              notas, subrayados, favoritos, publicaciones y mensajes de la
              comunidad.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Confirma con tu contraseña (si aplica):
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Contraseña actual…"
                className="w-full rounded-xl border border-input bg-background p-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-destructive"
              />
            </div>

            {deleteError && (
              <p className="text-xs font-medium text-destructive">
                {deleteError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deletingAccount}
              >
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={handleDeleteAccount}
                loading={deletingAccount}
                className="text-destructive border-destructive/40 hover:bg-destructive/10"
              >
                Eliminar definitivamente
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
