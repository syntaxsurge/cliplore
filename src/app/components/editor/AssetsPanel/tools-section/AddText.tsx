"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "@/app/store";
import { setTextElements } from "@/app/store/slices/projectSlice";
import type { TextElement } from "@/app/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PlacementMode = "playhead" | "append";
type Preset = "title" | "lower-third" | "caption";

const DEFAULT_DURATION_SECONDS = 8;

export default function AddTextPanel() {
  const dispatch = useAppDispatch();
  const { textElements, currentTime, duration, resolution, tracks } = useAppSelector(
    (state) => state.projectState,
  );

  const [text, setText] = useState("New text");
  const [placement, setPlacement] = useState<PlacementMode>("playhead");

  const baseStart = useMemo(() => {
    const playhead = Number.isFinite(currentTime) ? currentTime : 0;
    const append = Number.isFinite(duration) ? duration : 0;
    return Math.max(0, placement === "append" ? append : playhead);
  }, [currentTime, duration, placement]);

  const frameWidth = resolution?.width ?? 1920;
  const frameHeight = resolution?.height ?? 1080;
  const insetX = Math.round(frameWidth * 0.08);
  const overlayVideoTrackId = tracks[1]?.id ?? tracks[0]?.id ?? undefined;

  const addPreset = (preset: Preset) => {
    const start = baseStart;
    const end = start + DEFAULT_DURATION_SECONDS;
    const nextText = text.trim() || "New text";

    const common: Omit<TextElement, "x" | "y"> = {
      id: crypto.randomUUID(),
      text: nextText,
      positionStart: start,
      positionEnd: end,
      width: frameWidth - insetX * 2,
      height: 240,
      font: "Inter",
      fontSize: 96,
      color: "#ffffff",
      backgroundColor: "transparent",
      align: "center",
      zIndex: 0,
      opacity: 100,
      rotation: 0,
      fadeInDuration: 0.25,
      fadeOutDuration: 0.25,
      animation: "fade",
      blur: 0,
      includeInMerge: true,
    };

    const presetFields = (() => {
      switch (preset) {
        case "lower-third":
          return {
            x: insetX,
            y: Math.round(frameHeight * 0.72),
            width: Math.round(frameWidth * 0.52),
            height: 220,
            fontSize: 64,
            align: "left" as const,
          };
        case "caption":
          return {
            x: insetX,
            y: Math.round(frameHeight * 0.82),
            height: 220,
            fontSize: 52,
            align: "center" as const,
          };
        case "title":
        default:
          return {
            x: insetX,
            y: Math.round(frameHeight * 0.18),
            height: 260,
            fontSize: 96,
            align: "center" as const,
          };
      }
    })();

    const nextElement: TextElement = {
      ...common,
      ...presetFields,
      trackId: overlayVideoTrackId,
    };

    dispatch(setTextElements([...textElements, nextElement]));
    toast.success("Text added to timeline.");
  };

  const addShape = () => {
    const start = baseStart;
    const end = start + DEFAULT_DURATION_SECONDS;

    const shape: TextElement = {
      id: crypto.randomUUID(),
      text: "",
      positionStart: start,
      positionEnd: end,
      trackId: overlayVideoTrackId,
      x: Math.round(frameWidth * 0.2),
      y: Math.round(frameHeight * 0.35),
      width: Math.round(frameWidth * 0.6),
      height: Math.round(frameHeight * 0.25),
      font: "Inter",
      fontSize: 1,
      color: "#00000000",
      backgroundColor: "#ffffff",
      align: "center",
      zIndex: 0,
      opacity: 100,
      rotation: 0,
      fadeInDuration: 0.25,
      fadeOutDuration: 0.25,
      animation: "fade",
      blur: 0,
      includeInMerge: true,
    };

    dispatch(setTextElements([...textElements, shape]));
    toast.success("Shape added to timeline.");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-white">Text</h2>
        <p className="text-xs text-white/50">
          Add titles and captions. Fine-tune styles in Properties.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-white/70">
            Default text
          </label>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="New text…"
            className="border-white/10 bg-black/30 text-white placeholder:text-white/40 focus-visible:ring-white/30 focus-visible:ring-offset-0"
            aria-label="Text to insert"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={placement === "playhead" ? "secondary" : "ghost"}
            onClick={() => setPlacement("playhead")}
            className={cn(
              "h-8 rounded-full px-3",
              placement === "playhead" ? null : "text-white/70 hover:text-white",
            )}
          >
            At playhead
          </Button>
          <Button
            type="button"
            size="sm"
            variant={placement === "append" ? "secondary" : "ghost"}
            onClick={() => setPlacement("append")}
            className={cn(
              "h-8 rounded-full px-3",
              placement === "append" ? null : "text-white/70 hover:text-white",
            )}
          >
            Append
          </Button>
          <div className="ml-auto text-xs text-white/50">
            Start: {baseStart.toFixed(1)}s
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" onClick={() => addPreset("title")}>
            Title
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => addPreset("lower-third")}
          >
            Lower third
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => addPreset("caption")}
          >
            Caption
          </Button>
          <Button type="button" variant="outline" onClick={addShape}>
            Shape
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
        <p className="text-xs text-white/60">
          Tip: select a text clip on the timeline to edit font, color, and
          animation.
        </p>
      </div>
    </div>
  );
}
