import Link from 'next/link'
import type { ReactNode } from 'react'

export const LEGAL_CONTACT_EMAIL = 'soporte@dvguzman.com'
export const LEGAL_LAST_UPDATED = '15 de julio de 2026'

/**
 * Envoltorio compartido para las páginas legales públicas
 * (/terminos y /privacidad). Solo maquetación y estilos de prosa;
 * el contenido lo aporta cada página.
 */
export function LegalPage({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <header className="mb-10 border-b border-border pb-6">
          <Link href="/" className="text-sm font-semibold text-primary hover:underline">
            ← BibliaAPP
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Última actualización: {LEGAL_LAST_UPDATED}
          </p>
        </header>
        <article className="space-y-8 leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:text-base [&_h3]:font-semibold [&_p]:mt-3 [&_p]:text-[15px] [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6 [&_li]:text-[15px] [&_a]:text-primary [&_a]:underline-offset-2 hover:[&_a]:underline">
          {children}
        </article>
        <footer className="mt-14 border-t border-border pt-6 text-sm text-muted-foreground">
          <p>
            <Link href="/terminos">Términos y condiciones</Link>
            {' · '}
            <Link href="/privacidad">Aviso de privacidad</Link>
            {' · '}
            <Link href="/normas-comunidad">Normas de la comunidad</Link>
            {' · '}
            Contacto:{' '}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
          </p>
        </footer>
      </div>
    </main>
  )
}
