import { useCallback, useState } from "react"

type Result = {
  uploading: boolean
  upload: (file: File) => Promise<string | null>
}

/** Aisla el detalle HTTP de subida para que el editor solo reciba una URL. */
export function useNoteImageUpload(): Result {
  const [uploading, setUploading] = useState(false)

  const upload = useCallback(async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("purpose", "other")
      const token = localStorage.getItem("biblia_token")
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "No se pudo subir la imagen")
      if (data.filename) return `${window.location.origin}/uploads/${encodeURIComponent(data.filename)}`
      if (data.url) return `${window.location.origin}${data.url}`
      throw new Error("La subida no devolvió una URL válida")
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "No se pudo insertar la imagen")
      return null
    } finally {
      setUploading(false)
    }
  }, [])

  return { uploading, upload }
}
