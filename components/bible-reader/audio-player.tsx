"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Gauge,
  SkipForward,
  SkipBack,
  Headphones,
  Sparkles,
  X,
} from "lucide-react"

export interface AudioPlayerProps {
  verses: Array<{ verse: number; text: string }>
  chapterLabel: string
  onActiveVerseChange?: (verseNumber: number | null) => void
  onClose?: () => void
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2]

interface KokoroVoice {
  id: string
  name: string
  lang: string
  gender: string
}

export function BibleAudioPlayer({
  verses,
  chapterLabel,
  onActiveVerseChange,
  onClose,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0)
  const [rate, setRate] = useState(1)
  const [isMuted, setIsMuted] = useState(false)

  // Engine selection: "kokoro" (Neural AI) or "browser" (Web Speech API)
  const [engine, setEngine] = useState<"kokoro" | "browser">("kokoro")
  const [kokoroVoices, setKokoroVoices] = useState<KokoroVoice[]>([])
  const [selectedKokoroVoice, setSelectedKokoroVoice] = useState("em_alex")
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedBrowserVoice, setSelectedBrowserVoice] = useState<SpeechSynthesisVoice | null>(null)

  const isSpeakingRef = useRef(false)
  const verseIndexRef = useRef(0)
  verseIndexRef.current = currentVerseIndex

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const nextAudioPrefetchRef = useRef<HTMLAudioElement | null>(null)

  // 1. Check Kokoro availability
  useEffect(() => {
    fetch("/api/tts?info=voices")
      .then((res) => res.json())
      .then((data) => {
        if (data.available && data.voices?.length > 0) {
          setKokoroVoices(data.voices)
          setEngine("kokoro")
          setSelectedKokoroVoice(data.voices[0].id)
        } else {
          setEngine("browser")
        }
      })
      .catch(() => {
        setEngine("browser")
      })
  }, [])

  // 2. Load browser voices as fallback / option
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices()
      const spanishVoices = available.filter((v) => v.lang.startsWith("es"))
      const allVoices = spanishVoices.length > 0 ? spanishVoices : available
      setBrowserVoices(allVoices)
      if (allVoices.length > 0 && !selectedBrowserVoice) {
        const bestVoice =
          allVoices.find((v) => v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Sabina")) ||
          allVoices[0]
        setSelectedBrowserVoice(bestVoice)
      }
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel()
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // Kokoro Speech playback
  const playKokoroVerse = (index: number) => {
    if (index >= verses.length || index < 0) {
      handleStop()
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    const v = verses[index]
    const textToSpeak = `Versículo ${v.verse}. ${v.text.replace(/\[\d+\]/g, "")}`
    const audioUrl = `/api/tts?text=${encodeURIComponent(textToSpeak)}&voice=${selectedKokoroVoice}&speed=${rate}`

    const audio = new Audio(audioUrl)
    audio.volume = isMuted ? 0 : 1
    audioRef.current = audio

    audio.onplay = () => {
      setCurrentVerseIndex(index)
      onActiveVerseChange?.(v.verse)

      // Prefetch next verse audio for continuous playback
      if (index + 1 < verses.length) {
        const nextV = verses[index + 1]
        const nextText = `Versículo ${nextV.verse}. ${nextV.text.replace(/\[\d+\]/g, "")}`
        const nextUrl = `/api/tts?text=${encodeURIComponent(nextText)}&voice=${selectedKokoroVoice}&speed=${rate}`
        nextAudioPrefetchRef.current = new Audio(nextUrl)
      }
    }

    audio.onended = () => {
      if (!isSpeakingRef.current) return
      if (verseIndexRef.current + 1 < verses.length) {
        playKokoroVerse(verseIndexRef.current + 1)
      } else {
        handleStop()
      }
    }

    audio.onerror = () => {
      console.warn("Kokoro audio failed, falling back to browser voice")
      playBrowserVerse(index)
    }

    audio.play().catch((err) => {
      if (err.name !== "AbortError") {
        console.error("Audio playback error:", err)
      }
    })
  }

  // Browser Web Speech playback
  const playBrowserVerse = (index: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    if (index >= verses.length || index < 0) {
      handleStop()
      return
    }

    window.speechSynthesis.cancel()

    const v = verses[index]
    const textToSpeak = `Versículo ${v.verse}. ${v.text.replace(/\[\d+\]/g, "")}`
    const utterance = new SpeechSynthesisUtterance(textToSpeak)

    if (selectedBrowserVoice) utterance.voice = selectedBrowserVoice
    utterance.rate = rate
    utterance.volume = isMuted ? 0 : 1
    utterance.lang = selectedBrowserVoice?.lang || "es-ES"

    utterance.onstart = () => {
      setCurrentVerseIndex(index)
      onActiveVerseChange?.(v.verse)
    }

    utterance.onend = () => {
      if (!isSpeakingRef.current) return
      if (verseIndexRef.current + 1 < verses.length) {
        playBrowserVerse(verseIndexRef.current + 1)
      } else {
        handleStop()
      }
    }

    utterance.onerror = (e) => {
      if (e.error !== "canceled" && e.error !== "interrupted") {
        console.error("Audio TTS error:", e)
      }
    }

    window.speechSynthesis.speak(utterance)
  }

  const speakVerse = (index: number) => {
    if (engine === "kokoro" && kokoroVoices.length > 0) {
      playKokoroVerse(index)
    } else {
      playBrowserVerse(index)
    }
  }

  const handlePlay = () => {
    if (verses.length === 0) return
    isSpeakingRef.current = true

    if (isPaused) {
      if (engine === "kokoro" && audioRef.current) {
        audioRef.current.play()
      } else if ("speechSynthesis" in window) {
        window.speechSynthesis.resume()
      }
      setIsPaused(false)
      setIsPlaying(true)
    } else {
      setIsPlaying(true)
      setIsPaused(false)
      speakVerse(currentVerseIndex)
    }
  }

  const handlePause = () => {
    if (engine === "kokoro" && audioRef.current) {
      audioRef.current.pause()
    } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause()
    }
    setIsPaused(true)
    setIsPlaying(false)
  }

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }
    isSpeakingRef.current = false
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentVerseIndex(0)
    onActiveVerseChange?.(null)
  }

  const handleNext = () => {
    const nextIdx = Math.min(verses.length - 1, currentVerseIndex + 1)
    setCurrentVerseIndex(nextIdx)
    if (isPlaying) speakVerse(nextIdx)
  }

  const handlePrev = () => {
    const prevIdx = Math.max(0, currentVerseIndex - 1)
    setCurrentVerseIndex(prevIdx)
    if (isPlaying) speakVerse(prevIdx)
  }

  const handleRateChange = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(rate)
    const nextRate = SPEED_OPTIONS[(currentIndex + 1) % SPEED_OPTIONS.length]
    setRate(nextRate)
    if (isPlaying) {
      speakVerse(currentVerseIndex)
    }
  }

  const currentVerse = verses[currentVerseIndex]

  return (
    <div className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] md:bottom-5 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-xl rounded-2xl border border-primary/20 bg-background/95 backdrop-blur-md p-3.5 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {engine === "kokoro" ? (
              <Sparkles className="size-4 text-amber-500 animate-pulse" />
            ) : (
              <Headphones className="size-4 animate-pulse" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-xs text-foreground truncate">{chapterLabel}</p>
              {engine === "kokoro" && (
                <span className="rounded-full bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                  IA Kokoro
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {currentVerse ? `Versículo ${currentVerse.verse} de ${verses.length}` : "Listo para reproducir"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Selector de voces Kokoro / Navegador */}
          {kokoroVoices.length > 0 ? (
            <select
              value={selectedKokoroVoice}
              onChange={(e) => {
                setSelectedKokoroVoice(e.target.value)
                setEngine("kokoro")
                if (isPlaying) playKokoroVerse(currentVerseIndex)
              }}
              className="max-w-[140px] truncate rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground cursor-pointer"
            >
              {kokoroVoices.map((v) => (
                <option key={v.id} value={v.id}>
                  ✨ {v.name}
                </option>
              ))}
              {browserVoices.length > 0 && <option disabled>── Voces del Navegador ──</option>}
              {browserVoices.map((v) => (
                <option key={v.voiceURI} value={`browser:${v.voiceURI}`}>
                  🗣️ {v.name.replace(/(Google|Microsoft|Apple|es-ES|es-MX|Spanish)/g, "").trim() || v.name}
                </option>
              ))}
            </select>
          ) : browserVoices.length > 1 ? (
            <select
              value={selectedBrowserVoice?.voiceURI || ""}
              onChange={(e) => {
                const found = browserVoices.find((v) => v.voiceURI === e.target.value)
                if (found) {
                  setSelectedBrowserVoice(found)
                  setEngine("browser")
                  if (isPlaying) playBrowserVerse(currentVerseIndex)
                }
              }}
              className="max-w-[120px] truncate rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground"
            >
              {browserVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name.replace(/(Google|Microsoft|Apple|es-ES|es-MX|Spanish)/g, "").trim() || v.name}
                </option>
              ))}
            </select>
          ) : null}

          <button
            type="button"
            onClick={() => {
              handleStop()
              onClose?.()
            }}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Cerrar reproductor"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2.5">
        {/* Velocidad */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleRateChange}
          className="h-8 px-2 text-xs font-bold gap-1 rounded-xl cursor-pointer"
          title="Cambiar velocidad"
        >
          <Gauge className="size-3.5" />
          {rate}x
        </Button>

        {/* Controles de reproducción */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
            disabled={currentVerseIndex === 0}
            className="size-8 rounded-full cursor-pointer"
            title="Versículo anterior"
          >
            <SkipBack className="size-4" />
          </Button>

          {isPlaying ? (
            <Button
              variant="default"
              size="icon"
              onClick={handlePause}
              className="size-10 rounded-full shadow-md bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              title="Pausar"
            >
              <Pause className="size-5" />
            </Button>
          ) : (
            <Button
              variant="default"
              size="icon"
              onClick={handlePlay}
              className="size-10 rounded-full shadow-md bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              title="Escuchar capítulo con voz IA"
            >
              <Play className="size-5 ml-0.5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            disabled={currentVerseIndex >= verses.length - 1}
            className="size-8 rounded-full cursor-pointer"
            title="Siguiente versículo"
          >
            <SkipForward className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleStop}
            disabled={!isPlaying && !isPaused}
            className="size-8 rounded-full text-muted-foreground hover:text-rose-500 cursor-pointer"
            title="Detener"
          >
            <Square className="size-3.5 fill-current" />
          </Button>
        </div>

        {/* Mute toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const nextMuted = !isMuted
            setIsMuted(nextMuted)
            if (audioRef.current) {
              audioRef.current.volume = nextMuted ? 0 : 1
            }
          }}
          className="size-8 rounded-xl text-muted-foreground cursor-pointer"
          title={isMuted ? "Activar audio" : "Silenciar"}
        >
          {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </Button>
      </div>
    </div>
  )
}
