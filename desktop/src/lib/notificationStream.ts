import { API_BASE_URL } from "@/lib/config";
import { getApiToken } from "@/lib/api";

/** ponytail: fetch SSE con Bearer; EventSource no permite headers custom */
export function subscribeNotificationStream(onEvent: () => void): () => void {
  let cancelled = false;
  let abort: AbortController | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const connect = async () => {
    if (cancelled) return;
    const token = getApiToken();
    if (!token) {
      retryTimer = setTimeout(connect, 10000);
      return;
    }

    abort = new AbortController();
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/stream`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: abort.signal,
      });
      if (!res.ok || !res.body) throw new Error("SSE failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";
        for (const line of parts) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6)) as { type?: string };
            if (data.type !== "connected") onEvent();
          } catch {
            // ignorar líneas mal formadas
          }
        }
      }
    } catch {
      if (!cancelled) retryTimer = setTimeout(connect, 30000);
    }
  };

  connect();

  return () => {
    cancelled = true;
    abort?.abort();
    if (retryTimer) clearTimeout(retryTimer);
  };
}
