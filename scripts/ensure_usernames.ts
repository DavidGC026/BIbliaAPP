import { ensureUsernames } from "../lib/bible"

async function run() {
  try {
    console.log("Generating usernames for existing users...")
    await ensureUsernames()
    console.log("Usernames generated successfully.")
  } catch (error) {
    console.error("Failed to generate usernames:", error)
  } finally {
    process.exit(0)
  }
}

run()
