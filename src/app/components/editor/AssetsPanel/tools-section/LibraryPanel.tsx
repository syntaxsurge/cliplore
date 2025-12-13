"use client";

import { useMemo, useState } from "react";
import { useAppSelector } from "@/app/store";
import type { MediaType } from "@/app/types";
import UploadMedia from "../AddButtons/UploadMedia";
import MediaList from "./MediaList";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { History, Search, Sparkles } from "lucide-react";
import { SoraPanel } from "./SoraPanel";
import { SoraHistoryPanel } from "./SoraHistoryPanel";

type LibraryFilter = "all" | Exclude<MediaType, "unknown">;

const filters: { id: LibraryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "video", label: "Video" },
  { id: "image", label: "Images" },
  { id: "audio", label: "Audio" },
];

export default function LibraryPanel() {
  const totalFiles = useAppSelector(
    (state) => state.projectState.filesID?.length ?? 0,
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [aiOpen, setAiOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const normalizedQuery = useMemo(() => query.trim(), [query]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Library</h2>
            <div className="text-xs text-white/50 tabular-nums">
              {totalFiles} item{totalFiles === 1 ? "" : "s"}
            </div>
          </div>
          <p className="text-xs text-white/50">
            Upload or generate media. Drag items to the timeline.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Dialog open={aiOpen} onOpenChange={setAiOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-white/10 bg-black/30 text-white hover:bg-black/40 hover:text-white"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Generate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl border-white/10 bg-black/90 text-white">
              <DialogHeader>
                <DialogTitle>Generate with Sora</DialogTitle>
                <DialogDescription>
                  Queue a render and track progress in History.
                </DialogDescription>
              </DialogHeader>
              <SoraPanel hideHeader onGenerated={() => setAiOpen(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-white/10 bg-black/30 text-white hover:bg-black/40 hover:text-white"
              >
                <History className="h-4 w-4" aria-hidden="true" />
                History
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl border-white/10 bg-black/90 text-white">
              <DialogHeader>
                <DialogTitle>Sora history</DialogTitle>
                <DialogDescription>
                  View queued, rendering, completed, and failed generations.
                </DialogDescription>
              </DialogHeader>
              <SoraHistoryPanel />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <UploadMedia variant="dropzone" className="py-3" />

      <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search media…"
            className="border-white/10 bg-black/30 pl-9 text-white placeholder:text-white/40 focus-visible:ring-white/30 focus-visible:ring-offset-0"
            aria-label="Search media library"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <Button
              key={f.id}
              type="button"
              size="sm"
              variant={filter === f.id ? "secondary" : "ghost"}
              onClick={() => setFilter(f.id)}
              className={cn(
                "h-8 rounded-full px-3",
                filter === f.id ? null : "text-white/70 hover:text-white",
              )}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <MediaList
        query={normalizedQuery}
        typeFilter={filter === "all" ? undefined : filter}
      />
    </div>
  );
}
