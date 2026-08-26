import { type NextRequest, NextResponse } from "next/server"

const KOKORO_URLS = [
  process.env.KOKORO_TTS_URL,
  "http://kokoro-tts:8880",
  "http://127.0.0.1:8880",
  "http://localhost:8880",
].filter(Boolean) as string[]

async function getWorkingKokoroUrl(): Promise<string | null> {
  for (const url of KOKORO_URLS) {
    try {
      const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(1000) })
      if (res.ok) return url
    } catch {}
  }
  return null
}

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const text = searchParams.get("text")
    const voice = searchParams.get("voice") || "em_alex"
    const speed = parseFloat(searchParams.get("speed") || "1.0")

    const kokoroBase = await getWorkingKokoroUrl()

    if (searchParams.get("info") === "voices") {
      if (kokoroBase) {
        return NextResponse.json({
          available: true,
          provider: "kokoro",
          voices: [
            { id: "em_alex", name: "Alex (Español - IA Neuronal)", lang: "es-ES", gender: "male" },
            { id: "ef_dora", name: "Dora (Español - IA Neuronal)", lang: "es-ES", gender: "female" },
            { id: "em_santa", name: "Santa (Español - IA Neuronal)", lang: "es-ES", gender: "male" },
          ],
        })
      }
      return NextResponse.json({ available: false, voices: [] })
    }

    if (!kokoroBase) {
      return NextResponse.json({ error: "Servicio Kokoro TTS no disponible" }, { status: 503 })
    }

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Texto requerido" }, { status: 400 })
    }

    const cleanText = text
      .replace(/\[\d+\]/g, "")
      .replace(/\s+/g, " ")
      .trim()

    const res = await fetch(`${kokoroBase}/v1/audio/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "kokoro",
        input: cleanText,
        voice,
        response_format: "mp3",
        speed: Math.min(2.0, Math.max(0.5, speed)),
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `Kokoro error: ${errText}` }, { status: res.status })
    }

    const audioBuffer = await res.arrayBuffer()

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error en servicio TTS" },
      { status: 500 },
    )
  }
}
