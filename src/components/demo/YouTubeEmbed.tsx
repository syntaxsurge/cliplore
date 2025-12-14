import { cn, getYouTubeVideoId } from "@/lib/utils";

export function YouTubeEmbed({
  url,
  title,
  className,
}: {
  url: string;
  title: string;
  className?: string;
}) {
  const id = getYouTubeVideoId(url);
  if (!id) return null;

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-3xl border border-border bg-black shadow-sm",
        className,
      )}
    >
      <iframe
        className="absolute inset-0 h-full w-full"
        src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
