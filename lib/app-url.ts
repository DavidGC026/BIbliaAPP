export function getAppUrl(fallbackOrigin?: string): string {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    fallbackOrigin ||
    "https://biblia2.dvguzman.com"
  ).replace(/\/$/, "")
}
