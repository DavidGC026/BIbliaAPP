export interface FetcherError extends Error {
  status?: number
}

export const fetcher = async (url: string) => {
  const headers: Record<string, string> = {}
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("biblia_token")
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
  }
  const res = await fetch(url, { headers })
  const data = await res.json()
  if (!res.ok) {
    const error: FetcherError = new Error(data?.error ?? "Error en la solicitud")
    error.status = res.status
    throw error
  }
  return data
}
