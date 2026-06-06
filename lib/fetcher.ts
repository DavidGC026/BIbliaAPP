export const fetcher = async (url: string) => {
  const headers: Record<string, string> = {}
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("joplin_token")
    if (token) {
      headers["x-joplin-token"] = token
    }
  }

  const res = await fetch(url, { headers })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error ?? "Error en la solicitud")
  }
  return data
}
