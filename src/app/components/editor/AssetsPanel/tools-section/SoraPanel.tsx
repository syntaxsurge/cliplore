"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch } from "@/app/store";
import { addSoraJob } from "@/app/store/slices/projectSlice";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import type { SoraJob } from "@/app/types";
import { ensureOpenAIKeyOrRedirect } from "@/features/ai/byok/require-openai-key";

type Props = {
  onGenerated?: () => void;
  hideHeader?: boolean;
  className?: string;
};

export function SoraPanel({ onGenerated, hideHeader = false, className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const [prompt, setPrompt] = useState("");
  const [seconds, setSeconds] = useState<4 | 8 | 12>(8);
  const [size, setSize] = useState<
    "720x1280" | "1280x720" | "1024x1792" | "1792x1024"
  >("1280x720");

  const nextPath = useMemo(() => {
    const queryString = searchParams.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }, [pathname, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const ok = await ensureOpenAIKeyOrRedirect(router.push, nextPath);
      if (!ok) return;
    } catch (error) {
      console.error(error);
      toast.error("Failed to check OpenAI key status.");
      return;
    }

    if (!prompt.trim()) {
      toast.error("Enter a prompt to generate a Sora clip.");
      return;
    }

    const now = new Date().toISOString();
    const job: SoraJob = {
      id: crypto.randomUUID(),
      prompt: prompt.trim(),
      seconds,
      size,
      status: "queued",
      createdAt: now,
      updatedAt: now,
      message: "Queued.",
    };

    dispatch(addSoraJob(job));
    toast.success("Sora job queued. Track it in History.");
    setPrompt("");
    onGenerated?.();
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
              Generate a clip in the background, then review it in History.
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
          disabled={false}
          className="w-full rounded-md bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Generate clip
        </button>
      </form>
      <p className="text-xs text-white/55">
        Tip: You can close this dialog — generation continues and stays visible in
        History.
      </p>
    </div>
  );
}
