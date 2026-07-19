import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import * as api from "@/lib/api";
import { LEGAL_URLS } from "@/lib/config";

const DOCS = [
  ["terms", "Términos y condiciones", LEGAL_URLS.terms],
  ["privacy", "Aviso de privacidad", LEGAL_URLS.privacy],
  ["community", "Normas de la comunidad", LEGAL_URLS.communityGuidelines],
] as const;

export function LegalAcceptanceGate() {
  const { user, refreshUser, logout } = useAuth();
  const [read, setRead] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!user || user.legalAcceptedAt !== null) return null;
  const complete = DOCS.every(([key]) => read.has(key));
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-6 backdrop-blur">
      <div className="w-full max-w-xl space-y-5 rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Antes de continuar
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Lee y acepta los documentos que regulan el uso de BibliaAPP.
          </p>
        </div>
        <div className="space-y-2">
          {DOCS.map(([key, label, url]) => (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noreferrer"
              onClick={() => setRead((current) => new Set(current).add(key))}
              className={`flex items-center gap-3 rounded-xl border p-4 ${read.has(key) ? "border-primary bg-primary/10" : "border-border"}`}
            >
              <span className="text-primary">{read.has(key) ? "✓" : "○"}</span>
              <span className="flex-1 font-semibold text-foreground">
                {label}
              </span>
              <span className="text-muted-foreground">↗</span>
            </a>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Al pulsar «Acepto» confirmas que has leído y aceptas los tres
          documentos.
        </p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Button
            fullWidth
            disabled={!complete}
            loading={saving}
            onClick={async () => {
              setSaving(true);
              setError(null);
              try {
                await api.acceptLegalTerms();
                await refreshUser();
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "No se pudo registrar la aceptación",
                );
              } finally {
                setSaving(false);
              }
            }}
          >
            Acepto
          </Button>
          <Button variant="ghost" onClick={() => logout()}>
            No acepto
          </Button>
        </div>
      </div>
    </div>
  );
}
