/** Convierte valor de input datetime-local (hora local del navegador) a ISO UTC para el servidor. */
export function localDatetimeToISO(value: string): string {
  if (!value) return value
  const date = new Date(value)
  if (isNaN(date.getTime())) return value
  return date.toISOString()
}
