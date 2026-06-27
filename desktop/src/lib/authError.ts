/**
 * Solo 401/403 invalidan la sesión. Errores de red (offline) no cierran sesión.
 */
export function isAuthError(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  return status === 401 || status === 403;
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  return msg.includes("fetch") || msg.includes("network") || msg.includes("failed");
}
