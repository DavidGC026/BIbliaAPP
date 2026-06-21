import { listPushTokensForUser } from "./push-tokens"

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

export interface PushPayload {
  title: string
  body: string
  data?: Record<string, string | number>
}

/** Envía notificación push a todos los dispositivos registrados del usuario. */
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<void> {
  const tokens = await listPushTokensForUser(userId)
  if (tokens.length === 0) return

  const messages = tokens.map((to) => ({
    to,
    sound: "default" as const,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  }))

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    })
    if (!response.ok) {
      console.error("[expo-push] HTTP", response.status, await response.text())
    }
  } catch (err) {
    console.error("[expo-push] Error:", err)
  }
}

const NOTIFICATION_LABELS: Record<string, string> = {
  comment: "Nuevo comentario",
  reply: "Nueva respuesta",
  like: "Me gusta",
  follow: "Nuevo seguidor",
  friend_request: "Solicitud de amistad",
  friend_accepted: "Amistad aceptada",
  prayer_intercession: "Oración",
  group_event_reminder: "Recordatorio de evento",
}

export function pushTitleForType(type: string): string {
  return NOTIFICATION_LABELS[type] ?? "BibliaAPP"
}
