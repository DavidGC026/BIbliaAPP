import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import * as api from "@/lib/api";
import type { TtsVoice } from "@/lib/types";

export interface AudioPlayerProps {
  verses: Array<{ verse: number; text: string }>;
  chapterLabel: string;
  onActiveVerseChange?: (verseNumber: number | null) => void;
  onClose?: () => void;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

export function BibleAudioPlayer({
  verses,
  chapterLabel,
  onActiveVerseChange,
  onClose,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [rate, setRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Engine selection: "kokoro" (Neural AI) or "browser" (Web Speech API)
  const [engine, setEngine] = useState<"kokoro" | "browser">("kokoro");
  const [kokoroVoices, setKokoroVoices] = useState<TtsVoice[]>([]);
  const [selectedKokoroVoice, setSelectedKokoroVoice] = useState("em_alex");
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedBrowserVoice, setSelectedBrowserVoice] =
    useState<SpeechSynthesisVoice | null>(null);

  const isSpeakingRef = useRef(false);
  const verseIndexRef = useRef(0);
  verseIndexRef.current = currentVerseIndex;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextAudioPrefetchRef = useRef<HTMLAudioElement | null>(null);

  // 1. Check Kokoro availability
  useEffect(() => {
    api
      .getTtsVoices()
      .then((data) => {
        if (data.available && data.voices?.length > 0) {
          setKokoroVoices(data.voices);
          setEngine("kokoro");
          setSelectedKokoroVoice(data.voices[0].id);
        } else {
          setEngine("browser");
        }
      })
      .catch(() => {
        setEngine("browser");
      });
  }, []);

  // 2. Load browser voices as fallback / option
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      const spanishVoices = available.filter((v) => v.lang.startsWith("es"));
      const allVoices = spanishVoices.length > 0 ? spanishVoices : available;
      setBrowserVoices(allVoices);
      if (allVoices.length > 0 && !selectedBrowserVoice) {
        const bestVoice =
          allVoices.find(
            (v) =>
              v.name.includes("Google") ||
              v.name.includes("Natural") ||
              v.name.includes("Sabina") ||
              v.name.includes("Paulina") ||
              v.name.includes("Jorge"),
          ) || allVoices[0];
        setSelectedBrowserVoice(bestVoice);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  // Helper: clean verse text for speech (strip brackets, strong numbers, notes)
  const cleanVerseText = (text: string) => {
    return text
      .replace(/\[\d+\]/g, "")
      .replace(/<[^>]*>/g, "")
      .replace(/\b[HG]\d+\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const stopPlayback = () => {
    isSpeakingRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    if (onActiveVerseChange) onActiveVerseChange(null);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (nextAudioPrefetchRef.current) {
      nextAudioPrefetchRef.current.src = "";
      nextAudioPrefetchRef.current = null;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  const playVerse = (index: number) => {
    if (index >= verses.length) {
      stopPlayback();
      return;
    }

    const verse = verses[index];
    if (!verse) return;

    setCurrentVerseIndex(index);
    if (onActiveVerseChange) onActiveVerseChange(verse.verse);

    const rawText = cleanVerseText(verse.text);
    if (!rawText) {
      playVerse(index + 1);
      return;
    }

    if (engine === "kokoro") {
      playKokoroAudio(index, rawText);
    } else {
      playBrowserSpeech(index, rawText);
    }
  };

  const playKokoroAudio = (index: number, text: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audioUrl = api.getTtsAudioUrl(text, selectedKokoroVoice, rate);
    const audio = new Audio(audioUrl);
    audio.playbackRate = 1;
    audio.muted = isMuted;
    audioRef.current = audio;

    audio.onended = () => {
      if (isSpeakingRef.current) {
        playVerse(index + 1);
      }
    };

    audio.onerror = () => {
      console.warn("Kokoro TTS falló, intentando voz del sistema...");
      playBrowserSpeech(index, text);
    };

    audio
      .play()
      .then(() => {
        prefetchNextKokoro(index + 1);
      })
      .catch((err) => {
        console.warn("Error al reproducir audio:", err);
        playBrowserSpeech(index, text);
      });
  };

  const prefetchNextKokoro = (nextIndex: number) => {
    if (nextIndex < verses.length) {
      const nextText = cleanVerseText(verses[nextIndex].text);
      if (nextText) {
        const nextUrl = api.getTtsAudioUrl(
          nextText,
          selectedKokoroVoice,
          rate,
        );
        const prefetchAudio = new Audio();
        prefetchAudio.src = nextUrl;
        prefetchAudio.preload = "auto";
        nextAudioPrefetchRef.current = prefetchAudio;
      }
    }
  };

  const playBrowserSpeech = (index: number, text: string) => {
    if (!("speechSynthesis" in window)) {
      stopPlayback();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedBrowserVoice) {
      utterance.voice = selectedBrowserVoice;
    }
    utterance.rate = rate;
    utterance.lang = selectedBrowserVoice?.lang || "es-ES";

    utterance.onend = () => {
      if (isSpeakingRef.current) {
        playVerse(index + 1);
      }
    };

    utterance.onerror = () => {
      if (isSpeakingRef.current) {
        playVerse(index + 1);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleStart = () => {
    isSpeakingRef.current = true;
    setIsPlaying(true);
    setIsPaused(false);
    playVerse(currentVerseIndex);
  };

  const handlePauseResume = () => {
    if (isPaused) {
      setIsPaused(false);
      setIsPlaying(true);
      isSpeakingRef.current = true;
      if (engine === "kokoro" && audioRef.current) {
        audioRef.current.play();
      } else if (engine === "browser") {
        window.speechSynthesis.resume();
      } else {
        playVerse(currentVerseIndex);
      }
    } else {
      setIsPaused(true);
      isSpeakingRef.current = false;
      if (engine === "kokoro" && audioRef.current) {
        audioRef.current.pause();
      } else if (engine === "browser") {
        window.speechSynthesis.pause();
      }
    }
  };

  const handleSkipNext = () => {
    if (currentVerseIndex < verses.length - 1) {
      const nextIdx = currentVerseIndex + 1;
      setCurrentVerseIndex(nextIdx);
      if (isPlaying && !isPaused) {
        playVerse(nextIdx);
      } else if (onActiveVerseChange) {
        onActiveVerseChange(verses[nextIdx].verse);
      }
    }
  };

  const handleSkipPrev = () => {
    if (currentVerseIndex > 0) {
      const prevIdx = currentVerseIndex - 1;
      setCurrentVerseIndex(prevIdx);
      if (isPlaying && !isPaused) {
        playVerse(prevIdx);
      } else if (onActiveVerseChange) {
        onActiveVerseChange(verses[prevIdx].verse);
      }
    }
  };

  const handleSpeedChange = (newRate: number) => {
    setRate(newRate);
    if (isPlaying && !isPaused) {
      playVerse(currentVerseIndex);
    }
  };

  const currentVerse = verses[currentVerseIndex];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl animate-fade-in">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/95 p-4 shadow-2xl backdrop-blur-md">
        {/* Header & Controls */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon name="volume" size={16} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-xs text-foreground truncate">
                {chapterLabel}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {currentVerse ? `Versículo ${currentVerse.verse}` : "Listo"}
                {engine === "kokoro" ? " · IA Neuronal" : " · Voz del sistema"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Speed selector */}
            <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-muted/30 p-0.5">
              {SPEED_OPTIONS.map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                    rate === speed
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* Mute button */}
            <button
              onClick={() => {
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                if (audioRef.current) audioRef.current.muted = nextMuted;
              }}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title={isMuted ? "Activar sonido" : "Silenciar"}
            >
              <Icon name={isMuted ? "volume-x" : "volume"} size={16} />
            </button>


            {/* Close button */}
            {onClose && (
              <button
                onClick={() => {
                  stopPlayback();
                  onClose();
                }}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                title="Cerrar reproductor"
              >
                <Icon name="close" size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Playback Controls & Voice Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSkipPrev}
              disabled={currentVerseIndex <= 0}
              className="size-8 p-0"
              title="Versículo anterior"
            >
              ‹
            </Button>

            {!isPlaying || isPaused ? (
              <Button
                variant="primary"
                size="sm"
                onClick={isPlaying ? handlePauseResume : handleStart}
                className="gap-1.5 px-3 h-8 shadow-sm"
              >
                <Icon name="play" size={14} />
                <span>{isPaused ? "Reanudar" : "Escuchar"}</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePauseResume}
                className="gap-1.5 px-3 h-8 text-amber-600 dark:text-amber-400"
              >
                <span>Pausar</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleSkipNext}
              disabled={currentVerseIndex >= verses.length - 1}
              className="size-8 p-0"
              title="Versículo siguiente"
            >
              ›
            </Button>

            {isPlaying && (
              <Button
                variant="outline"
                size="sm"
                onClick={stopPlayback}
                className="size-8 p-0 text-muted-foreground hover:text-destructive"
                title="Detener"
              >
                ■
              </Button>
            )}
          </div>

          {/* Voice Switcher Dropdown */}
          <div className="flex items-center gap-2 text-xs">
            {kokoroVoices.length > 0 && (
              <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-background/50 p-1">
                <button
                  type="button"
                  onClick={() => setEngine("kokoro")}
                  className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    engine === "kokoro"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  IA Kokoro
                </button>
                <button
                  type="button"
                  onClick={() => setEngine("browser")}
                  className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    engine === "browser"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sistema
                </button>
              </div>
            )}

            {engine === "kokoro" && kokoroVoices.length > 0 && (
              <select
                value={selectedKokoroVoice}
                onChange={(e) => setSelectedKokoroVoice(e.target.value)}
                className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {kokoroVoices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.gender === "male" ? "Voz masc." : "Voz fem."})
                  </option>
                ))}
              </select>
            )}

            {engine === "browser" && browserVoices.length > 0 && (
              <select
                value={selectedBrowserVoice?.name || ""}
                onChange={(e) => {
                  const voice = browserVoices.find(
                    (v) => v.name === e.target.value,
                  );
                  if (voice) setSelectedBrowserVoice(voice);
                }}
                className="max-w-[160px] truncate rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {browserVoices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
