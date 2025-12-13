import { cn } from "@/lib/utils";

function getYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.replace("/", "").trim();
      return id || null;
    }

    if (parsed.hostname.endsWith("youtube.com")) {
      const watchId = parsed.searchParams.get("v");
      if (watchId) return watchId;

      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" && parts[1]) return parts[1];
      if (parts[0] === "shorts" && parts[1]) return parts[1];
    }

    return null;
  } catch {
    return null;
  }
}

export function YouTubeEmbed({
  url,
  title,
  className,
}: {
  url: string;
  title: string;
  className?: string;
}) {
  const id = getYouTubeId(url);
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

