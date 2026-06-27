import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { API_BASE_URL } from "@/lib/config";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

type OAuthCallbackPayload = {
  token?: string | null;
  error?: string | null;
};

/**
 * OAuth Google vía localhost (127.0.0.1) — funciona en Hyprland/Firefox
 * sin depender del esquema bibliaapp://.
 */
export async function startGoogleSignIn(): Promise<string> {
  if (!isTauri()) {
    throw new Error("Inicio con Google solo está disponible en la app de escritorio.");
  }

  return new Promise<string>((resolve, reject) => {
    let unlisten: UnlistenFn | undefined;
    let settled = false;

    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Tiempo agotado al iniciar sesión con Google."));
    }, 5 * 60 * 1000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      unlisten?.();
    };

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    void (async () => {
      try {
        unlisten = await listen<OAuthCallbackPayload>(
          "google-oauth-callback",
          (event) => {
            const { token, error } = event.payload;
            if (error) {
              finish(() => reject(new Error(error)));
              return;
            }
            if (token) {
              finish(() => resolve(token));
              return;
            }
            finish(() => reject(new Error("Respuesta OAuth inválida.")));
          },
        );

        const port = await invoke<number>("start_google_oauth_listener");
        const authUrl = `${API_BASE_URL}/api/auth/google?desktop=1&port=${port}`;

        // ponytail: opener puede devolver "Load failed" en Linux aunque el navegador sí abra
        try {
          await openUrl(authUrl);
        } catch {
          /* esperar callback en localhost */
        }
      } catch (err) {
        finish(() =>
          reject(err instanceof Error ? err : new Error(String(err))),
        );
      }
    })();
  });
}

/** Deep link legacy (móvil); en desktop ya no se usa para Google. */
export async function setupGoogleAuthListener(_handlers: {
  onToken: (token: string) => void;
  onError: (message: string) => void;
}) {
  return () => {};
}
