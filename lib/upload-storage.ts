import { mkdir, readdir, rename, readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { runOnce } from "./once-async"

export function uploadDirectory(): string {
  const directory = resolve(process.env.UPLOADS_DIR || join(process.cwd(), "data", "uploads"))
  const publicDirectory = resolve(process.cwd(), "public")
  if (directory === publicDirectory || directory.startsWith(`${publicDirectory}/`)) {
    throw new Error("UPLOADS_DIR debe estar fuera de public")
  }
  return directory
}

export function safeUploadFilename(filename: string): boolean {
  return /^[a-zA-Z0-9_-][a-zA-Z0-9._-]{0,249}\.(?:png|jpe?g|webp|gif|pdf)$/i.test(filename) && !filename.includes("..")
}

/** Antes de aceptar tráfico, retira los archivos antiguos del servicio estático. */
export async function prepareUploadStorage(): Promise<void> {
  return runOnce("private-upload-storage", async () => {
    const destination = uploadDirectory()
    await mkdir(destination, { recursive: true, mode: 0o700 })
    const legacy = join(process.cwd(), "public", "uploads")
    const entries = await readdir(legacy, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return []
      throw error
    })
    for (const entry of entries) {
      if (!entry.isFile()) continue
      // No sobrescribir datos si una migración previa dejó un nombre duplicado.
      const target = join(destination, entry.name)
      try {
        await readFile(target)
        throw new Error("Nombre duplicado al migrar uploads; requiere revisión")
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      }
      await rename(join(legacy, entry.name), target)
    }
  })
}

export async function saveUpload(filename: string, buffer: Buffer): Promise<void> {
  if (!safeUploadFilename(filename)) throw new Error("Nombre de archivo inválido")
  await prepareUploadStorage()
  await writeFile(join(uploadDirectory(), filename), buffer, { mode: 0o600, flag: "wx" })
}

export async function readUpload(filename: string): Promise<Buffer> {
  if (!safeUploadFilename(filename)) throw new Error("Nombre de archivo inválido")
  await prepareUploadStorage()
  return readFile(join(uploadDirectory(), filename))
}
