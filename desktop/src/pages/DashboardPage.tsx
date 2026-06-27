import { useEffect, useState } from "react";
import { VerseOfDayCard } from "@/components/VerseOfDayCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { getChurchSettings } from "@/lib/api";

type Props = {
  onLogout?: () => void;
};

export function DashboardPage({ onLogout }: Props) {
  const { user, isOffline, logout } = useAuth();
  const [churchName, setChurchName] = useState("BibliaAPP");

  useEffect(() => {
    getChurchSettings()
      .then(({ settings }) =>
        setChurchName(settings.church_name || "BibliaAPP"),
      )
      .catch(() => {});
  }, []);

  const firstName = user?.name?.split(" ")[0] ?? "hermano";

  async function handleLogout() {
    await logout();
    onLogout?.();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">BibliaAPP</h1>
            <p className="text-sm text-muted-foreground">{churchName}</p>
          </div>
          <div className="flex items-center gap-3">
            {isOffline ? (
              <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                Sin conexión — sesión guardada
              </span>
            ) : null}
            <Button variant="ghost" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        <section>
          <h2 className="text-3xl font-bold text-foreground">
            ¡Hola, {firstName}!
          </h2>
          <p className="mt-2 text-muted-foreground">
            Te damos la bienvenida a {churchName}.
          </p>
        </section>

        <VerseOfDayCard />

        <section className="grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Cuenta
            </p>
            <p className="mt-2 font-semibold text-foreground">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </Card>
          <Card>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Rol
            </p>
            <p className="mt-2 font-semibold capitalize text-foreground">
              {user?.role ?? "reader"}
            </p>
          </Card>
          <Card>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Próximamente
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Lector, grupos, feed y notas según el plan.
            </p>
          </Card>
        </section>
      </main>
    </div>
  );
}
