let online = typeof navigator !== "undefined" ? navigator.onLine : true;

export function getIsOnline() {
  return online;
}

export function setIsOnline(value: boolean) {
  online = value;
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => setIsOnline(true));
  window.addEventListener("offline", () => setIsOnline(false));
}
