import { serveMedia } from "@/lib/serve-media"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: Request, { params }: { params: Promise<{ filename: string }> }) {
  return serveMedia(req, await params)
}
