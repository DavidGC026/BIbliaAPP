/**
 * ponytail: self-check auth helpers — run: npx tsx src/lib/__check__.ts
 */
import { isAuthError, isNetworkError } from "./authError";

function check(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

check(isAuthError({ status: 401 }) === true, "401 is auth error");
check(isAuthError({ status: 500 }) === false, "500 is not auth error");
check(isNetworkError(new TypeError("Failed to fetch")) === true, "fetch fail");

const sample = "bibliaapp://auth/google?token=abc123";
const url = new URL(sample);
check(url.searchParams.get("token") === "abc123", "google callback parse");

console.log("desktop lib __check__: ok");
