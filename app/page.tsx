import { ConnectionBanner } from "@/components/connection-banner"
import { BibleReader } from "@/components/bible-reader"
import { BookOpen } from "lucide-react"

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <ConnectionBanner />
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BookOpen className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Biblia RVR1960
            </h1>
            <p className="text-xs text-muted-foreground">
              Lectura vinculada con tus notas de Joplin
            </p>
          </div>
        </div>
      </header>
      <BibleReader />
    </main>
  )
}
