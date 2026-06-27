import { API_BASE_URL } from "@/lib/config";
import type { ApiError, ChurchSettings, User, VerseOfDay } from "@/lib/types";

type TokenGetter = () => string | null;

let getToken: TokenGetter = () => null;

export function setApiTokenGetter(getter: TokenGetter) {
  getToken = getter;
}

export function getApiToken(): string | null {
  return getToken();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = data as ApiError;
    const error = new Error(err.error ?? `Error ${response.status}`) as Error & {
      status?: number;
      code?: string;
    };
    error.status = response.status;
    error.code = err.code;
    throw error;
  }

  return data as T;
}

export async function login(email: string, password: string) {
  return request<{ success: boolean; user: User; token: string }>(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
  );
}

export async function logout() {
  return request<{ success: boolean }>("/api/auth/logout", { method: "POST" });
}

export async function getMe() {
  return request<{ user: User | null }>("/api/auth/me");
}

export async function getVerseOfDay(idBible?: number) {
  const query = idBible ? `?idBible=${idBible}` : "";
  return request<VerseOfDay>(`/api/verse-of-the-day${query}`);
}

export async function getChurchSettings() {
  return request<{ settings: ChurchSettings }>("/api/church-settings");
}

export async function healthCheck() {
  return request<{ ok?: boolean; status?: string }>("/api/health");
}
