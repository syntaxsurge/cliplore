import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence } from "remotion";
import { MediaFile } from "@/app/types";
import { useAppDispatch, useAppSelector } from "@/app/store";
import { setActiveElement, setActiveElementIndex } from "@/app/store/slices/projectSlice";

const REMOTION_SAFE_FRAME = 0;

interface SequenceItemOptions {
  handleTextChange?: (id: string, text: string) => void;
  fps: number;
  editableTextId?: string | null;
  currentTime?: number;
}

const calculateFrames = (
  display: { from: number; to: number },
  fps: number,
) => {
  const from = display.from * fps;
  const to = display.to * fps;
  const durationInFrames = Math.max(1, to - from);
  return { from, durationInFrames };
};

interface VideoSequenceItemProps {
  item: MediaFile;
  options: SequenceItemOptions;
}

export const VideoSequenceItem: React.FC<VideoSequenceItemProps> = ({
  item,
  options,
}) => {
  const { fps } = options;
  const dispatch = useAppDispatch();
  const { tracks, mediaFiles, activeElement, activeElementIndex } = useAppSelector(
    (state) => state.projectState,
  );

  const isSelected =
    activeElement === "media" && mediaFiles[activeElementIndex]?.id === item.id;

  const trackIndex = (() => {
    if (!item.trackId) return 0;
    const idx = tracks.findIndex((t) => t.id === item.trackId);
    return idx >= 0 ? idx : 0;
  })();

  const effectiveZIndex = trackIndex * 1000 + (item.zIndex ?? 0);

  const playbackRate = item.playbackSpeed || 1;
  const { from, durationInFrames } = calculateFrames(
    {
      from: item.positionStart,
      to: item.positionEnd,
    },
    fps,
  );

  const crop = item.crop || {
    x: 0,
    y: 0,
    width: item.width,
    height: item.height,
  };

  const trim = {
    from: item.startTime,
    to: item.endTime,
  };

  return (
    <Sequence
      key={item.id}
      from={from}
      durationInFrames={durationInFrames + REMOTION_SAFE_FRAME}
      style={{ pointerEvents: "none" }}
    >
      <AbsoluteFill
        data-track-item="transition-element"
        className={`designcombo-scene-item id-${item.id} designcombo-scene-item-type-${item.type}`}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (isSelected) return;
          dispatch(setActiveElement("media"));
          const index = mediaFiles.findIndex((clip) => clip.id === item.id);
          if (index >= 0) dispatch(setActiveElementIndex(index));
        }}
        style={{
          pointerEvents: "auto",
          top: item.y,
          left: item.x,
          width: crop.width || item.width || "100%",
          height: crop.height || item.height || "auto",
          transform:
            typeof item.rotation === "number" && Number.isFinite(item.rotation) && item.rotation !== 0
              ? `rotate(${item.rotation}deg)`
              : "none",
          transformOrigin: "center center",
          zIndex: effectiveZIndex,
          opacity: item?.opacity !== undefined ? item.opacity / 100 : 1,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: crop.width || item.width || "100%",
            height: crop.height || item.height || "auto",
            position: "relative",
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <OffthreadVideo
            startFrom={trim.from * fps}
            endAt={trim.to * fps + REMOTION_SAFE_FRAME}
            playbackRate={playbackRate}
            src={item.src || ""}
            volume={item.volume / 100 || 100}
            style={{
              pointerEvents: "none",
              top: -(crop.y || 0),
              left: -(crop.x || 0),
              width: item.width || "100%", // Default width
              height: item.height || "auto", // Default height
              position: "absolute",
              filter: item.blur ? `blur(${item.blur}px)` : "none",
            }}
          />
        </div>
      </AbsoluteFill>
    </Sequence>
  );
};
