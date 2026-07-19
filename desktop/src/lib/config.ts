const ENV =
  (import.meta as ImportMeta & { env?: ImportMetaEnv }).env ??
  ({} as ImportMetaEnv);

export const API_BASE_URL = ENV.VITE_API_URL ?? "https://biblia2.dvguzman.com";

export const DEFAULT_BIBLE_ID = 149;
export const APP_VARIANT = ENV.VITE_APP_VARIANT ?? "internal";
export const COMMUNITY_ENABLED =
  ENV.VITE_COMMUNITY_ENABLED !== "false" || APP_VARIANT === "internal";

export const LEGAL_URLS = {
  terms: ENV.VITE_TERMS_URL ?? `${API_BASE_URL}/terminos`,
  privacy: ENV.VITE_PRIVACY_URL ?? `${API_BASE_URL}/privacidad`,
  communityGuidelines:
    ENV.VITE_COMMUNITY_GUIDELINES_URL ?? `${API_BASE_URL}/normas-comunidad`,
  support: ENV.VITE_SUPPORT_URL ?? "mailto:soporte@dvguzman.com",
  accountDeletion:
    ENV.VITE_ACCOUNT_DELETION_URL ??
    "mailto:soporte@dvguzman.com?subject=Eliminación%20de%20cuenta",
};

export const SESSION_TOKEN_KEY = "bibliaapp_session";
export const SESSION_USER_KEY = "bibliaapp_user";

/** Mismo deep link que la app móvil; el backend redirige aquí tras Google OAuth. */
export const GOOGLE_OAUTH_REDIRECT = "bibliaapp://auth/google";
