import { AuthedImage } from "@/components/AuthedImage";
import { Icon } from "@/components/ui/Icon";
import {
  coverGradientStyle,
  getPresetCover,
  isCustomCoverUrl,
} from "@/lib/notebookCovers";

type Props = {
  title: string;
  coverImage?: string | null;
  className?: string;
  onClick?: () => void;
};

export function BookCover({ title, coverImage, className = "", onClick }: Props) {
  const custom = isCustomCoverUrl(coverImage);
  const preset = !custom ? getPresetCover(coverImage) : null;

  const inner = (
    <div
      className={`relative flex aspect-[3/4] w-full flex-col justify-between overflow-hidden rounded-r-xl border-l-4 border-black/20 p-3 shadow-md ${className}`}
      style={custom ? undefined : coverGradientStyle(coverImage)}
    >
      {custom && coverImage ? (
        <AuthedImage
          uri={coverImage}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      {custom ? <div className="absolute inset-0 bg-black/35" /> : null}
      <div className="relative z-10 mt-auto">
        <p className="text-xs font-bold leading-tight tracking-wide text-white drop-shadow">
          {title.toUpperCase()}
        </p>
        <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-white/80">
          <Icon name="book" size={11} />
          ESTUDIO
        </p>
      </div>
      {!custom && preset ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background: `linear-gradient(180deg, transparent 60%, ${preset.colors[0]})`,
          }}
        />
      ) : null}
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full max-w-[140px] text-left">
        {inner}
      </button>
    );
  }
  return inner;
}
