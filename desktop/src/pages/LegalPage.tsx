import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import * as api from "@/lib/api";
import { APP_VARIANT, LEGAL_URLS } from "@/lib/config";
import type { BibleVersion } from "@/lib/types";

const LINKS = [
  ["Términos y condiciones", LEGAL_URLS.terms],
  ["Aviso de privacidad", LEGAL_URLS.privacy],
  ["Normas de la comunidad", LEGAL_URLS.communityGuidelines],
  ["Soporte", LEGAL_URLS.support],
  ["Solicitar eliminación de cuenta", LEGAL_URLS.accountDeletion],
] as const;

export function LegalPage() {
  const [bibles, setBibles] = useState<BibleVersion[]>([]);
  useEffect(() => {
    api
      .listBibles()
      .then((result) => setBibles(result.bibles))
      .catch(() => {});
  }, []);
  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">
          Información legal y licencias
        </h1>
        <p className="text-sm text-muted-foreground">
          BibliaAPP es una aplicación cristiana sin fines de lucro para lectura,
          estudio y reflexión.
        </p>
      </header>
      <Card className="space-y-3">
        <h2 className="font-bold text-foreground">Políticas y ayuda</h2>
        {LINKS.map(([label, url]) => (
          <a
            key={label}
            href={url}
            target={url.startsWith("mailto:") ? undefined : "_blank"}
            rel="noreferrer"
            className="flex min-h-10 items-center justify-between border-b border-border py-2 font-semibold text-primary last:border-0"
          >
            <span>{label}</span>
            <span>↗</span>
          </a>
        ))}
        <p className="text-xs text-muted-foreground">
          Variante: {APP_VARIANT} · Última revisión legal: 15 de julio de 2026
        </p>
      </Card>
      <h2 className="text-xl font-bold text-foreground">
        Traducciones disponibles
      </h2>
      {bibles.length ? (
        bibles.map((bible) => (
          <Card key={bible.bibleId} className="space-y-2">
            <h3 className="font-bold text-foreground">
              {bible.name} ({bible.abbr})
            </h3>
            {bible.copyright ? (
              <p className="text-sm text-muted-foreground">{bible.copyright}</p>
            ) : null}
            {bible.attribution ? (
              <p className="text-sm text-muted-foreground">
                {bible.attribution}
              </p>
            ) : null}
            {bible.license ? (
              <p className="text-xs font-semibold text-muted-foreground">
                Licencia: {bible.license}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                ["Lectura", bible.canRead],
                ["Offline", bible.canDownload],
                ["Copiar", bible.canCopy],
                ["Compartir", bible.canShare],
                ["Imágenes", bible.canCreateImages],
              ].map(([label, allowed]) => (
                <span
                  key={String(label)}
                  className={`rounded-full px-2 py-1 ${allowed === false ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
                >
                  {allowed === false ? "No" : "Sí"} · {String(label)}
                </span>
              ))}
            </div>
            {bible.sourceUrl ? (
              <a
                href={bible.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-primary"
              >
                Fuente y licencia ↗
              </a>
            ) : null}
          </Card>
        ))
      ) : (
        <Card>
          <p className="text-muted-foreground">
            Las licencias se mostrarán al conectar con el servidor.
          </p>
        </Card>
      )}
    </div>
  );
}
