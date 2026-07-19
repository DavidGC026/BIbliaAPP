import { cn } from '@/lib/utils'

const links = [
  ['Términos y condiciones', '/terminos'],
  ['Privacidad', '/privacidad'],
  ['Normas de la comunidad', '/normas-comunidad'],
] as const

/** Enlaces legales en pequeño, siempre visibles al pie de la app. */
export function LegalFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-4 text-[11px] text-muted-foreground/80',
        className,
      )}
    >
      {links.map(([label, href], i) => (
        <span key={href} className="flex items-center gap-x-2">
          {i > 0 && <span aria-hidden>·</span>}
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground hover:underline underline-offset-2"
          >
            {label}
          </a>
        </span>
      ))}
    </footer>
  )
}
