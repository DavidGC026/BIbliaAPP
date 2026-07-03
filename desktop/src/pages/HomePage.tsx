import { useEffect, useState } from "react";
import { VerseOfDayCard } from "@/components/VerseOfDayCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { getChurchSettings } from "@/lib/api";
import type { BibleTarget } from "@/lib/types";

type Props = {
  onOpenBible: (target: BibleTarget) => void;
};

export function HomePage({ onOpenBible }: Props) {
  const { user } = useAuth();
  const [churchName, setChurchName] = useState("BibliaAPP");

  useEffect(() => {
    getChurchSettings()
      .then(({ settings }) =>
        setChurchName(settings.church_name || "BibliaAPP"),
      )
      .catch(() => {});
  }, []);

  const firstName = user?.name?.split(" ")[0] ?? "hermano";

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <section>
        <h1 className="text-3xl font-bold text-foreground">¡Hola, {firstName}!</h1>
        <p className="mt-2 text-muted-foreground">
          Te damos la bienvenida a {churchName}.
        </p>
      </section>

      <VerseOfDayCard onReadInBible={onOpenBible} />

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Accesos rápidos
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => onOpenBible({ bookId: 43, chapter: 3 })}>
              Juan 3
            </Button>
            <Button variant="outline" onClick={() => onOpenBible({ bookId: 19, chapter: 23 })}>
              Salmo 23
            </Button>
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Tu cuenta
          </p>
          <p className="mt-2 font-semibold text-foreground">{user?.name}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </Card>
      </section>
    </div>
  );
}
