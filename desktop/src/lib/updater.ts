/** Comprueba actualizaciones (Tauri plugin-updater o manifest JSON). */
export async function checkForUpdates(): Promise<{
  available: boolean;
  version?: string;
  message: string;
}> {
  if (isTauri()) {
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (update) {
        return {
          available: true,
          version: update.version,
          message: `Disponible v${update.version}`,
        };
      }
      return { available: false, message: "Ya tienes la última versión." };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // ponytail: sin servidor de releases configurado → mensaje claro
      if (
        msg.includes("404") ||
        msg.includes("fetch") ||
        msg.includes("network")
      ) {
        return {
          available: false,
          message: "Servidor de actualizaciones no configurado aún.",
        };
      }
      return { available: false, message: msg };
    }
  }
  return {
    available: false,
    message: "Las actualizaciones automáticas solo están en la app instalada.",
  };
}

export async function installUpdate(): Promise<string> {
  if (!isTauri()) return "Solo disponible en la app de escritorio.";
  const { check } = await import("@tauri-apps/plugin-updater");
  const update = await check();
  if (!update) return "No hay actualización pendiente.";
  await update.downloadAndInstall();
  return "Actualización instalada. Reinicia BibliaAPP.";
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export const APP_VERSION = import.meta.env.PACKAGE_VERSION ?? "0.3.2";
