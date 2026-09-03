import { memo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { parseStrongDefinition } from "@/lib/strong-definition";
import type { InterlinearWordView } from "@/lib/types";

export interface InterlinearPanelProps {
  words: InterlinearWordView[];
  fontSize: number;
  mutedColor?: string;
  accentColor?: string;
  borderColor?: string;
}

function languageLabel(words: InterlinearWordView[]): string {
  const first = words[0]?.language;
  if (first === "heb") return "hebreo";
  if (first === "arc") return "arameo";
  return "griego";
}

function isRtl(language: InterlinearWordView["language"]): boolean {
  return language === "heb" || language === "arc";
}

/**
 * Interlineal plegado bajo el versículo. Solo se pinta al abrirlo: el lector
 * es para leer la Biblia, no para llenar el capítulo de columnas griegas.
 */
export const InterlinearPanel = memo(function InterlinearPanel({
  words,
  fontSize,
  mutedColor,
  accentColor,
  borderColor,
}: InterlinearPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (words.length === 0) return null;

  const rtl = isRtl(words[0].language);
  const active = activeIndex !== null ? words[activeIndex] : null;
  const sections = active?.definition
    ? parseStrongDefinition(active.definition)
    : [];
  const glossSize = Math.max(11, fontSize - 6);

  return (
    <div
      className="interlinear-panel mt-1 border-t border-dashed border-border/70 pt-1.5"
      style={borderColor ? { borderColor } : undefined}
    >
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={mutedColor ? { color: mutedColor } : undefined}
      >
        <Icon
          name="languages"
          size={14}
          style={accentColor ? { color: accentColor } : undefined}
        />
        <span>Interlineal · {languageLabel(words)}</span>
        <Icon
          name="chevron-down"
          size={14}
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="mt-2 space-y-3 pl-1">
          <div
            className={`flex flex-wrap gap-x-1 gap-y-2 ${rtl ? "flex-row-reverse" : ""}`}
            dir={rtl ? "rtl" : "ltr"}
          >
            {words.map((word, index) => {
              const selected = index === activeIndex;
              const wordRtl = isRtl(word.language);
              return (
                <button
                  key={`${word.verse}-${word.position}`}
                  type="button"
                  onClick={() => setActiveIndex(selected ? null : index)}
                  aria-pressed={selected}
                  className={`interlinear-word min-w-[3.2rem] rounded-md border px-1.5 py-1 text-center transition-colors ${
                    selected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/70 bg-background/60 hover:border-primary/50 hover:bg-accent/40"
                  }`}
                >
                  <span
                    className="interlinear-original block font-semibold leading-tight"
                    lang={wordRtl ? "he" : "el"}
                    dir={wordRtl ? "rtl" : "ltr"}
                    style={{ fontSize: `${Math.max(15, fontSize - 1)}px` }}
                  >
                    {word.original}
                  </span>
                  {word.transliteration && (
                    <span
                      className="block text-[10px] italic text-muted-foreground"
                      dir="ltr"
                    >
                      {word.transliteration}
                    </span>
                  )}
                  <span
                    className="block font-serif text-foreground/90"
                    dir="ltr"
                    style={{ fontSize: `${glossSize}px` }}
                  >
                    {word.glossEs || word.glossEn || "—"}
                  </span>
                  {word.strongCode && (
                    <span
                      className="block font-mono text-[10px] text-muted-foreground"
                      dir="ltr"
                    >
                      {word.strongCode}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {active && (
            <aside
              className="rounded-lg border border-border bg-card/50 p-3"
              dir="ltr"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                {active.strongCode && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                    {active.strongCode}
                  </span>
                )}
                {active.lemma && (
                  <span
                    className="interlinear-original text-base font-semibold"
                    lang={isRtl(active.language) ? "he" : "el"}
                    dir="auto"
                  >
                    {active.lemma}
                  </span>
                )}
                {active.morph && (
                  <span className="text-[11px] text-muted-foreground">
                    {active.morph}
                  </span>
                )}
              </div>
              {sections.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {sections.map((section, index) => (
                    <p
                      key={index}
                      className="text-sm leading-relaxed text-foreground/90"
                    >
                      {section.label && (
                        <span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-primary/80">
                          {section.label}.
                        </span>
                      )}
                      {section.text}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  {active.definition ||
                    "Sin definición Strong para esta forma."}
                </p>
              )}
            </aside>
          )}
        </div>
      )}
    </div>
  );
});
