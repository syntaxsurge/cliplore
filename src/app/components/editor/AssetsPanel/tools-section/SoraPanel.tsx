"use client";

import { useState, useCallback } from "react";
import { useAppDispatch, useAppSelector, storeFile } from "@/app/store";
import { setFilesID, setMediaFiles } from "@/app/store/slices/projectSlice";
import { categorizeFile } from "@/app/utils/utils";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { createMediaFileFromFile } from "@/lib/media/ingest";

type SoraStatus =
  | "idle"
  | "creating"
  | "polling"
  | "downloading"
  | "success"
  | "error";

type Props = {
  onGenerated?: () => void;
  hideHeader?: boolean;
  className?: string;
};

export function SoraPanel({ onGenerated, hideHeader = false, className }: Props) {
  const dispatch = useAppDispatch();
  const { mediaFiles, filesID = [], resolution } = useAppSelector(
    (state) => state.projectState,
  );
  const [prompt, setPrompt] = useState("");
  const [seconds, setSeconds] = useState<4 | 8 | 12>(8);
  const [size, setSize] = useState<
    "720x1280" | "1280x720" | "1024x1792" | "1792x1024"
  >("1280x720");
  const [status, setStatus] = useState<SoraStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const addMediaFromFile = useCallback(
    async (file: File, fileId: string) => {
      const updatedMedia = [...mediaFiles];
      const relevantClips = mediaFiles.filter(
        (clip) => clip.type === categorizeFile(file.type),
      );
      const lastEnd =
        relevantClips.length > 0
          ? Math.max(...relevantClips.map((f) => f.positionEnd))
          : 0;

      const src = URL.createObjectURL(file);
      const mediaClip = await createMediaFileFromFile({
        file,
        fileId,
        src,
        positionStart: lastEnd,
        frame: {
          width: resolution?.width ?? 1920,
          height: resolution?.height ?? 1080,
        },
        defaultDurationSeconds: 30,
      });
      updatedMedia.push(mediaClip);

      dispatch(setFilesID([...filesID, fileId]));
      dispatch(setMediaFiles(updatedMedia));
    },
    [dispatch, filesID, mediaFiles, resolution],
  );

  const pollJob = useCallback(async (jobId: string) => {
    setStatus("polling");
    setMessage("Polling Sora job…");
    for (let i = 0; i < 30; i++) {
      const res = await fetch(`/api/sora?jobId=${jobId}`);
      const data = (await res.json()) as {
        status: string;
        error?: string;
        contentUrl?: string | null;
      };

      if (data.status === "completed") {
        return data.contentUrl ?? `/api/sora/content?jobId=${jobId}`;
      }
      if (data.status === "failed") {
        throw new Error(data.error ?? "Sora job failed");
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    throw new Error("Sora job timed out");
  }, []);

  const downloadAndStore = useCallback(
    async (url: string) => {
      setStatus("downloading");
      setMessage("Downloading Sora render…");
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], `sora-${Date.now()}.mp4`, {
        type: blob.type || "video/mp4",
      });
      const fileId = crypto.randomUUID();
      await storeFile(file, fileId);
      await addMediaFromFile(file, fileId);
    },
    [addMediaFromFile],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setMessage("Enter a prompt to generate a Sora clip.");
      setStatus("error");
      return;
    }

    try {
      setStatus("creating");
      setMessage("Creating Sora job…");
      const res = await fetch("/api/sora", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, seconds, size }),
      });
      const data = await res.json();
      if (!res.ok || !data.jobId) {
        throw new Error(data.error ?? "Failed to start Sora job");
      }

      const contentUrl = await pollJob(data.jobId);
      await downloadAndStore(contentUrl);
      setStatus("success");
      setMessage("Sora clip added to your media list.");
      onGenerated?.();
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err?.message ?? "Sora generation failed.");
      toast.error("Sora generation failed");
    }
  };

  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border border-white/10 bg-white/5 p-4",
        className,
      )}
    >
      {!hideHeader ? (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Generate with Sora
            </h3>
            <p className="text-sm text-white/60">
              Create a clip and drop it straight into your timeline.
            </p>
          </div>
        </div>
      ) : null}
      <form className="space-y-3" onSubmit={handleSubmit}>
        <textarea
          className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          rows={3}
          placeholder="A cyberpunk courier racing through neon streets…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm text-white/80">
            <span className="text-xs text-white/60">Duration</span>
            <select
              className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              value={seconds}
              onChange={(e) => setSeconds(Number(e.target.value) as 4 | 8 | 12)}
            >
              <option value={4} className="text-black">
                4s
              </option>
              <option value={8} className="text-black">
                8s
              </option>
              <option value={12} className="text-black">
                12s
              </option>
            </select>
          </label>
          <label className="space-y-1 text-sm text-white/80">
            <span className="text-xs text-white/60">Size</span>
            <select
              className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              value={size}
              onChange={(e) => setSize(e.target.value as any)}
            >
              <option value="1280x720" className="text-black">
                1280 x 720 (16:9)
              </option>
              <option value="720x1280" className="text-black">
                720 x 1280 (9:16)
              </option>
              <option value="1024x1792" className="text-black">
                1024 x 1792
              </option>
              <option value="1792x1024" className="text-black">
                1792 x 1024
              </option>
            </select>
          </label>
        </div>
        <button
          type="submit"
          disabled={
            status === "creating" ||
            status === "polling" ||
            status === "downloading"
          }
          className="w-full rounded-md bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "creating"
            ? "Starting..."
            : status === "polling"
              ? "Waiting for render..."
              : status === "downloading"
                ? "Saving clip..."
                : "Generate clip"}
        </button>
      </form>
      {message && (
        <p
          className={`text-sm ${status === "error" ? "text-red-300" : "text-white/70"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
