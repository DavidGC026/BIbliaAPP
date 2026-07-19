import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { LEGAL_URLS } from "@/lib/config";
import * as api from "@/lib/api";

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
  const [recovering, setRecovering] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

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

  async function handleRecovery(e: FormEvent) {
    e.preventDefault();
    if (!recoveryEmail.trim()) {
      setError("El correo electrónico es obligatorio.");
      return;
    }
    setRecoveryLoading(true);
    setError(null);
    try {
      await api.forgotPassword(recoveryEmail);
      setRecoverySent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo enviar la solicitud",
      );
    } finally {
      setRecoveryLoading(false);
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
            <button
              type="button"
              className="block w-full text-right text-xs font-semibold text-primary hover:underline"
              onClick={() => {
                setRecoveryEmail(email);
                setRecoverySent(false);
                setError(null);
                setRecovering(true);
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
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
        {recovering ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-md space-y-4">
              <h2 className="text-xl font-bold text-foreground">
                {recoverySent ? "Enlace enviado" : "Recuperar acceso"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {recoverySent
                  ? "Si la dirección está registrada, recibirás un enlace de restablecimiento a la brevedad."
                  : "Ingresa tu correo y te enviaremos instrucciones para restablecer la contraseña."}
              </p>
              {!recoverySent ? (
                <form onSubmit={handleRecovery} className="space-y-3">
                  <input
                    type="email"
                    autoComplete="email"
                    value={recoveryEmail}
                    onChange={(event) => setRecoveryEmail(event.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground"
                    placeholder="Correo electrónico"
                    autoFocus
                  />
                  {error ? (
                    <p className="text-sm text-destructive">{error}</p>
                  ) : null}
                  <Button type="submit" fullWidth loading={recoveryLoading}>
                    Enviar enlace
                  </Button>
                </form>
              ) : null}
              <Button
                variant="ghost"
                fullWidth
                onClick={() => {
                  setRecovering(false);
                  setError(null);
                }}
              >
                Volver a iniciar sesión
              </Button>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
