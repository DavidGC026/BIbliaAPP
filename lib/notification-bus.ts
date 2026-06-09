import { EventEmitter } from "events"

/**
 * Bus de notificaciones en memoria para SSE.
 *
 * Funciona porque la app corre en un único proceso Node (contenedor biblia2-app).
 * Si algún día hay varias réplicas, este bus deja de bastar (haría falta
 * Redis pub/sub); el polling de SWR en el cliente cubre ese escenario.
 *
 * Se guarda en globalThis para sobrevivir HMR en desarrollo y para que todos
 * los route handlers compartan la misma instancia.
 */
const globalStore = globalThis as unknown as { __notifBus?: EventEmitter }

const bus = globalStore.__notifBus ?? new EventEmitter()
bus.setMaxListeners(0)
globalStore.__notifBus = bus

export interface NotificationEvent {
  type: "comment" | "reply" | "like" | "follow" | "connected"
  postId?: number | null
  commentId?: number | null
  actorName?: string
}

export function emitNotification(userId: number, payload: NotificationEvent) {
  bus.emit(`user:${userId}`, payload)
}

export function subscribeToUser(
  userId: number,
  listener: (payload: NotificationEvent) => void,
): () => void {
  const event = `user:${userId}`
  bus.on(event, listener)
  return () => bus.off(event, listener)
}
