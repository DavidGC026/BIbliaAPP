import { AuthedImage } from "@/components/AuthedImage";
import { Icon } from "@/components/ui/Icon";
import { openAuthedFile } from "@/lib/openMedia";
import { parseFeedContent } from "@/lib/media";

type Props = {
  content: string;
};

export function FeedContent({ content }: Props) {
  const blocks = parseFeedContent(content);

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        if (block.type === "image") {
          return (
            <AuthedImage
              key={i}
              uri={block.url}
              alt={block.alt}
              className="max-h-80 w-full rounded-xl border border-border object-cover"
            />
          );
        }
        if (block.type === "file") {
          return (
            <button
              key={i}
              type="button"
              onClick={() => openAuthedFile(block.url, block.label).catch(() => {})}
              className="w-full rounded-xl border border-border bg-primary/10 px-4 py-3 text-left transition-colors hover:bg-primary/15"
            >
              <p className="flex items-center gap-2 font-semibold text-primary">
                <Icon name="file" size={17} />
                {block.label}
              </p>
              <p className="text-xs text-muted-foreground">Clic para abrir</p>
            </button>
          );
        }
        if (!block.text.trim()) return null;
        return (
          <p key={i} className="whitespace-pre-wrap text-foreground">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
