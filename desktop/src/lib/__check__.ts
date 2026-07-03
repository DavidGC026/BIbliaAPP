/**
 * ponytail: self-check auth helpers — run: npx tsx src/lib/__check__.ts
 */
import { isAuthError, isNetworkError } from "./authError";
import { parseFeedContent } from "./media";
import { formatVerseHtml } from "./verseInsert";

function check(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

check(isAuthError({ status: 401 }) === true, "401 is auth error");
check(isAuthError({ status: 500 }) === false, "500 is not auth error");
check(isNetworkError(new TypeError("Failed to fetch")) === true, "fetch fail");

const sample = "bibliaapp://auth/google?token=abc123";
const url = new URL(sample);
check(url.searchParams.get("token") === "abc123", "google callback parse");

const blocks = parseFeedContent("Hola\n\n![foto.png](/api/uploads/x.png)");
check(blocks.length === 2 && blocks[1].type === "image", "feed image parse");

const verseHtml = formatVerseHtml(
  [
    { verse: 1, text: "En el principio" },
    { verse: 2, text: "Y la tierra <vacía>" },
  ],
  "Génesis",
  1,
  "RVR1960",
);
check(verseHtml.includes("Génesis 1:1-2 (RVR1960)"), "verse ref range");
check(verseHtml.includes("&lt;vacía&gt;"), "verse text escaped");
check(verseHtml.includes('class="biblia-verse-quote"'), "verse blockquote class");

console.log("desktop lib __check__: ok");
