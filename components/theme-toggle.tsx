'use client'

import { useEffect, useState } from 'react'
import { Check, Moon, MonitorSmartphone, Palette, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { fetcher } from '@/lib/fetcher'
import { cn } from '@/lib/utils'

interface ThemeOption {
  value: string
  label: string
  description: string
  adminOnly?: boolean
  /** Colores de la miniatura: fondo, tarjeta, texto y primario */
  preview: { bg: string; card: string; text: string; primary: string }
}

// Paridad con mobile/constants/Colors.ts y mobile/components/ThemeSwitch.tsx
export const THEME_OPTIONS: ThemeOption[] = [
  {
    value: 'system',
    label: 'Sistema',
    description: 'Sigue el modo claro u oscuro del dispositivo',
    preview: { bg: '#FAF8F5', card: '#292524', text: '#3D3835', primary: '#92700C' },
  },
  {
    value: 'light',
    label: 'Claro',
    description: 'Superficie neutra, limpia y luminosa',
    preview: { bg: '#FAF8F5', card: '#FFFFFF', text: '#3D3835', primary: '#92700C' },
  },
  {
    value: 'dark',
    label: 'Oscuro',
    description: 'Lectura nocturna con acentos dorados',
    preview: { bg: '#1C1917', card: '#292524', text: '#E7E5E4', primary: '#E8B84A' },
  },
  {
    value: 'sepia',
    label: 'Sepia',
    description: 'Papel cálido para sesiones largas de lectura',
    preview: { bg: '#F4ECD8', card: '#FBF4E1', text: '#433422', primary: '#8A5A2B' },
  },
  {
    value: 'sepia-dark',
    label: 'Sepia oscuro',
    description: 'Marrones profundos, texto crema y acentos ámbar',
    preview: { bg: '#1B1510', card: '#2A2119', text: '#F3E7D3', primary: '#D6A15D' },
  },
  {
    value: 'midnight',
    label: 'Medianoche',
    description: 'Azul profundo con acentos azul lavanda',
    preview: { bg: '#0B1020', card: '#141C32', text: '#EAF0FF', primary: '#8AA4FF' },
  },
  {
    value: 'forest',
    label: 'Bosque',
    description: 'Verde sereno con acentos esmeralda',
    preview: { bg: '#081713', card: '#10251F', text: '#ECFDF5', primary: '#4ADEA7' },
  },
  {
    value: 'lavender',
    label: 'Lavanda',
    description: 'Fondo suave, elegante y de bajo contraste',
    preview: { bg: '#F7F4FF', card: '#FFFCFF', text: '#302B45', primary: '#6748AD' },
  },
  {
    value: 'dvg',
    label: 'DVG',
    description: 'Base borgoña, rojo principal y alto contraste',
    adminOnly: true,
    preview: { bg: '#15090A', card: '#251012', text: '#FFF7F7', primary: '#DC2626' },
  },
  {
    value: 'ubg',
    label: 'UBG',
    description: 'Base verde petróleo, verde principal y acentos azules',
    adminOnly: true,
    preview: { bg: '#061417', card: '#0C2428', text: '#F0FDFA', primary: '#10B981' },
  },
]

export const ADMIN_ONLY_THEMES = THEME_OPTIONS.filter(t => t.adminOnly).map(t => t.value)

function ThemeSwatch({ preview }: { preview: ThemeOption['preview'] }) {
  return (
    <span
      className="flex size-7 shrink-0 items-center justify-center rounded-md border border-black/10 dark:border-white/15"
      style={{ backgroundColor: preview.bg }}
      aria-hidden
    >
      <span
        className="flex h-4 w-5 flex-col justify-between rounded-[3px] p-[2px]"
        style={{ backgroundColor: preview.card }}
      >
        <span className="h-[3px] w-3 rounded-full" style={{ backgroundColor: preview.text, opacity: 0.75 }} />
        <span className="h-[3px] w-2 rounded-full" style={{ backgroundColor: preview.primary }} />
      </span>
    </span>
  )
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Misma sesión que app/page.tsx: SWR deduplica la petición por clave
  const { data, isLoading } = useSWR<{ user: { role: string } | null }>(
    '/api/auth/me',
    fetcher,
    { shouldRetryOnError: false },
  )
  const isAdmin = data?.user?.role === 'admin'
  const sessionResolved = !isLoading

  useEffect(() => {
    setMounted(true)
  }, [])

  // Protección equivalente a mobile/app/_layout.tsx: un tema solo-admin
  // persistido por una sesión anterior vuelve a Sistema para no-admins
  useEffect(() => {
    if (!mounted || !sessionResolved) return
    if (!isAdmin && theme && ADMIN_ONLY_THEMES.includes(theme)) {
      setTheme('system')
    }
  }, [mounted, sessionResolved, isAdmin, theme, setTheme])

  const activeValue = mounted ? (theme ?? 'system') : 'system'
  const visibleOptions = THEME_OPTIONS.filter(t => !t.adminOnly || isAdmin)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="h-9 w-9" title="Apariencia" />}
      >
        {!mounted || activeValue === 'system' ? (
          <MonitorSmartphone className="size-4" />
        ) : activeValue === 'light' ? (
          <Sun className="size-4" />
        ) : activeValue === 'dark' ? (
          <Moon className="size-4" />
        ) : (
          <Palette className="size-4" />
        )}
        <span className="sr-only">Cambiar apariencia</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* GroupLabel de Base UI debe vivir dentro de un Menu.Group */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Apariencia</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {visibleOptions.map(option => {
          const selected = activeValue === option.value
          return (
            <DropdownMenuItem
              key={option.value}
              role="menuitemradio"
              aria-checked={selected}
              onClick={() => setTheme(option.value)}
              className={cn('gap-2.5 py-2', selected && 'bg-accent/60')}
            >
              <ThemeSwatch preview={option.preview} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  {option.label}
                  {option.adminOnly && (
                    <span className="rounded bg-primary/10 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-primary">
                      Admin
                    </span>
                  )}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">{option.description}</span>
              </span>
              {selected && <Check className="size-4 shrink-0 text-primary" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
