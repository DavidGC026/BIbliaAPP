export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { prepareUploadStorage } = await import("@/lib/upload-storage")
    await prepareUploadStorage()
    if (process.env.DISABLE_EVENT_REMINDERS === "1") return
    const { startEventReminderScheduler } = await import("@/lib/event-reminder-scheduler")
    startEventReminderScheduler()
  }
}
