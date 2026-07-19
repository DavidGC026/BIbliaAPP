import { useEffect } from "react";
import * as api from "@/lib/api";
import { getReminderPreferences } from "@/components/ReminderSettings";

export function DesktopReminders() {
  useEffect(() => {
    const timers: number[] = [];
    async function schedule() {
      timers.splice(0).forEach(window.clearTimeout);
      if (
        typeof Notification === "undefined" ||
        Notification.permission !== "granted"
      )
        return;
      const prefs = getReminderPreferences();
      const today = new Date().toISOString().slice(0, 10);
      const scheduleAt = (hour: number, title: string, body: string) => {
        const date = new Date();
        date.setHours(hour, 0, 0, 0);
        if (date.getTime() <= Date.now()) return;
        timers.push(
          window.setTimeout(
            () => new Notification(title, { body, icon: "/logo.png" }),
            date.getTime() - Date.now(),
          ),
        );
      };
      if (
        prefs.streakReminder &&
        !Object.keys(sessionStorage).some((key) =>
          key.startsWith(`bibliaapp_read_${today}`),
        )
      )
        scheduleAt(
          20,
          "¡No pierdas tu racha!",
          "Lee un capítulo hoy para continuar tu hábito.",
        );
      if (prefs.devotionalReminder) {
        const hasToday = await api
          .listDevotionals()
          .then((r) =>
            r.devotionals.some((item) => item.createdAt.slice(0, 10) === today),
          )
          .catch(() => true);
        if (!hasToday)
          scheduleAt(
            21,
            "Tu devocional de hoy",
            "Tómate un momento para escribir y reflexionar.",
          );
      }
      if (
        prefs.downloadsReminder &&
        localStorage.getItem("bibliaapp_download_error") === "1"
      )
        scheduleAt(
          12,
          "Descarga pendiente",
          "Una Biblia offline necesita que vuelvas a intentarlo.",
        );
    }
    schedule();
    window.addEventListener("bibliaapp-reminders-changed", schedule);
    return () => {
      timers.forEach(window.clearTimeout);
      window.removeEventListener("bibliaapp-reminders-changed", schedule);
    };
  }, []);
  return null;
}
