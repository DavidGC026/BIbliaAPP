import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { LEGAL_URLS } from "@/lib/config";

type Props = {
  onSuccess?: () => void;
};

export function LoginPage({ onSuccess }: Props) {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = loading || googleLoading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Correo y contraseña son obligatorios.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(email, password);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    try {
      setGoogleLoading(true);
      setError(null);
      await loginWithGoogle();
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al iniciar sesión con Google",
      );
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <img
            src="/logo.png"
            alt="BibliaAPP"
            className="mx-auto mb-4 h-20 w-20 rounded-2xl object-cover shadow-md"
          />
          <h1 className="text-2xl font-bold text-foreground">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Usa la misma cuenta que en la web de tu congregación.
          </p>
        </div>

        <Card className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              autoComplete="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
            />

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="submit" fullWidth loading={loading} disabled={busy}>
              Entrar
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-bold uppercase text-muted-foreground">
              o
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-60"
          >
            <span className="text-lg font-extrabold text-[#4285F4]">G</span>
            {googleLoading ? "Conectando…" : "Continuar con Google"}
          </button>
        </Card>
        <p className="px-4 text-center text-xs leading-relaxed text-muted-foreground">
          Al iniciar sesión aceptas los{" "}
          <a
            className="font-semibold text-primary underline"
            href={LEGAL_URLS.terms}
            target="_blank"
            rel="noreferrer"
          >
            términos y condiciones
          </a>{" "}
          y el{" "}
          <a
            className="font-semibold text-primary underline"
            href={LEGAL_URLS.privacy}
            target="_blank"
            rel="noreferrer"
          >
            aviso de privacidad
          </a>
          .
        </p>
      </div>
    </div>
  );
}
