export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startEventReminderScheduler } = await import("@/lib/event-reminder-scheduler")
    startEventReminderScheduler()
  }
}
