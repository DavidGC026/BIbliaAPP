export const fetcher = async (url: string) => {
  const headers: Record<string, string> = {}
  if (typeof window !== "undefined") {
    const sessionId = localStorage.getItem("joplin_session")
    if (sessionId) headers["x-joplin-session"] = sessionId
  }
  const res = await fetch(url, { headers })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error ?? "Error en la solicitud")
  }
  return data
}
