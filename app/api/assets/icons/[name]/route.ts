import { readFile } from "fs/promises"
import path from "path"
import { isAppIconName } from "@/lib/app-icons"

export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params

  if (!isAppIconName(name)) {
    return new Response("Icono no encontrado", { status: 404 })
  }

  try {
    const icon = await readFile(path.join(process.cwd(), "assets", "icons", `${name}.svg`), "utf8")
    return new Response(icon, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        // Los SVG se sirven desde el directorio compartido; no conservar una
        // versión vieja mientras se está actualizando el set.
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    })
  } catch {
    return new Response("Icono no encontrado", { status: 404 })
  }
}
