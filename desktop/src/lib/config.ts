export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "https://biblia2.dvguzman.com";

export const DEFAULT_BIBLE_ID = 149;

export const SESSION_TOKEN_KEY = "bibliaapp_session";
export const SESSION_USER_KEY = "bibliaapp_user";

/** Mismo deep link que la app móvil; el backend redirige aquí tras Google OAuth. */
export const GOOGLE_OAUTH_REDIRECT = "bibliaapp://auth/google";
