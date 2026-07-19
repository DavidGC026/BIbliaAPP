import { useState } from "react";

export type ReminderPreferences = {
  streakReminder: boolean;
  devotionalReminder: boolean;
  downloadsReminder: boolean;
};
const KEY = "bibliaapp_reminder_preferences";
export const DEFAULT_REMINDERS: ReminderPreferences = {
  streakReminder: true,
  devotionalReminder: true,
  downloadsReminder: true,
};
export function getReminderPreferences(): ReminderPreferences {
  try {
    return {
      ...DEFAULT_REMINDERS,
      ...JSON.parse(localStorage.getItem(KEY) || "{}"),
    };
  } catch {
    return DEFAULT_REMINDERS;
  }
}

const ROWS: Array<[keyof ReminderPreferences, string, string]> = [
  [
    "streakReminder",
    "Racha de lectura",
    "Avisa a las 20:00 si aún no leíste hoy.",
  ],
  [
    "devotionalReminder",
    "Devocional pendiente",
    "Avisa a las 21:00 si no escribiste hoy.",
  ],
  [
    "downloadsReminder",
    "Descargas incompletas",
    "Avisa si una descarga offline necesita reintento.",
  ],
];

export function ReminderSettings() {
  const [prefs, setPrefs] = useState(getReminderPreferences);
  const [permission, setPermission] = useState(
    typeof Notification === "undefined"
      ? "unavailable"
      : Notification.permission,
  );
  function toggle(key: keyof ReminderPreferences) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("bibliaapp-reminders-changed"));
  }
  return (
    <div className="space-y-1">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-bold text-foreground">Recordatorios</p>
        {permission !== "granted" && permission !== "unavailable" ? (
          <button
            className="text-xs font-semibold text-primary"
            onClick={async () =>
              setPermission(await Notification.requestPermission())
            }
          >
            Permitir avisos
          </button>
        ) : null}
      </div>
      {ROWS.map(([key, label, description]) => (
        <label
          key={key}
          className="flex items-center gap-3 border-t border-border py-3 first:border-0"
        >
          <span className="min-w-0 flex-1">
            <b className="block text-sm text-foreground">{label}</b>
            <span className="block text-xs text-muted-foreground">
              {description}
            </span>
          </span>
          <input
            type="checkbox"
            checked={prefs[key]}
            onChange={() => toggle(key)}
          />
        </label>
      ))}
      <p className="text-[11px] text-muted-foreground">
        En escritorio los avisos se programan mientras BibliaAPP está abierta.
      </p>
    </div>
  );
}
