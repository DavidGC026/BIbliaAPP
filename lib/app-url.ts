export function getAppUrl(_untrustedOrigin?: string): string {
  const url = new URL(
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://biblia2.dvguzman.com"
  )
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("APP_URL inválida")
  return url.origin
}
