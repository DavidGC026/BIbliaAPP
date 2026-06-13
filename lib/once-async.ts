const runs = new Map<string, Promise<void>>()

/** Ejecuta `fn` una sola vez por proceso; llamadas concurrentes comparten la misma promesa. */
export function runOnce(key: string, fn: () => Promise<void>): Promise<void> {
  const existing = runs.get(key)
  if (existing) return existing

  const promise = fn().catch((err) => {
    runs.delete(key)
    throw err
  })
  runs.set(key, promise)
  return promise
}
