import { processGroupEventReminders } from "./group-events"

const INTERVAL_MS = 5 * 60 * 1000
const globalStore = globalThis as unknown as { __eventReminderSchedulerStarted?: boolean }

export function startEventReminderScheduler(): void {
  if (globalStore.__eventReminderSchedulerStarted) return
  globalStore.__eventReminderSchedulerStarted = true

  const tick = () => {
    processGroupEventReminders().catch((err) => {
      console.error("[event-reminders] Error:", err)
    })
  }

  tick()
  setInterval(tick, INTERVAL_MS)
}
