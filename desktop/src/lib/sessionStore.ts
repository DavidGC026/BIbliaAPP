import { load, type Store } from "@tauri-apps/plugin-store";
import {
  SESSION_TOKEN_KEY,
  SESSION_USER_KEY,
} from "@/lib/config";
import type { User } from "@/lib/types";

let storePromise: Promise<Store> | null = null;

async function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = load("session.json", { autoSave: false, defaults: {} });
  }
  return storePromise;
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function loadSession(): Promise<{
  token: string | null;
  user: User | null;
}> {
  if (isTauri()) {
    const store = await getStore();
    const token = (await store.get<string>(SESSION_TOKEN_KEY)) ?? null;
    const user = (await store.get<User>(SESSION_USER_KEY)) ?? null;
    return { token, user };
  }

  const token = localStorage.getItem(SESSION_TOKEN_KEY);
  const userRaw = localStorage.getItem(SESSION_USER_KEY);
  let user: User | null = null;
  if (userRaw) {
    try {
      user = JSON.parse(userRaw) as User;
    } catch {
      user = null;
    }
  }
  return { token, user };
}

export async function saveSession(token: string, user: User): Promise<void> {
  if (isTauri()) {
    const store = await getStore();
    await store.set(SESSION_TOKEN_KEY, token);
    await store.set(SESSION_USER_KEY, user);
    await store.save();
    return;
  }

  localStorage.setItem(SESSION_TOKEN_KEY, token);
  localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
}

export async function persistUser(user: User | null): Promise<void> {
  if (isTauri()) {
    const store = await getStore();
    if (user) {
      await store.set(SESSION_USER_KEY, user);
    } else {
      await store.delete(SESSION_USER_KEY);
    }
    await store.save();
    return;
  }

  if (user) {
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_USER_KEY);
  }
}

export async function clearSession(): Promise<void> {
  if (isTauri()) {
    const store = await getStore();
    await store.delete(SESSION_TOKEN_KEY);
    await store.delete(SESSION_USER_KEY);
    await store.save();
    return;
  }

  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_USER_KEY);
}
