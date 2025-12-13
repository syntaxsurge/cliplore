import { TextElement } from "@/app/types";
import { useAppDispatch, useAppSelector } from "@/app/store";
import { setActiveElement, setActiveElementIndex } from "@/app/store/slices/projectSlice";
import {
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";

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

export const TextSequenceItem: React.FC<{
  item: TextElement;
  options: SequenceItemOptions;
}> = ({ item, options }) => {
  const { fps } = options;
  const dispatch = useAppDispatch();
  const { textElements, tracks, activeElement, activeElementIndex } = useAppSelector(
    (state) => state.projectState,
  );
  const frame = useCurrentFrame();
  const videoConfig = useVideoConfig();

  const trackIndex = (() => {
    if (!item.trackId) return 0;
    const idx = tracks.findIndex((t) => t.id === item.trackId);
    return idx >= 0 ? idx : 0;
  })();

  const effectiveZIndex = trackIndex * 1000 + (item.zIndex ?? 0);

  const { from, durationInFrames } = calculateFrames(
    {
      from: item.positionStart,
      to: item.positionEnd,
    },
    fps,
  );

  const isSelected =
    activeElement === "text" && textElements[activeElementIndex]?.id === item.id;

  const localFrame = frame - from;
  const totalFrames = durationInFrames + REMOTION_SAFE_FRAME;
  const fadeInFrames = Math.floor(
    (item.fadeInDuration ?? 0.4) * videoConfig.fps,
  );
  const fadeOutFrames = Math.floor(
    (item.fadeOutDuration ?? 0.4) * videoConfig.fps,
  );

  const opacity = (() => {
    const fadeIn = interpolate(localFrame, [0, fadeInFrames], [0, 1], {
      extrapolateRight: "clamp",
    });
    const fadeOutStart = Math.max(totalFrames - fadeOutFrames, 0);
    const fadeOut = interpolate(
      localFrame,
      [fadeOutStart, totalFrames],
      [1, 0],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );
    return Math.min(fadeIn, fadeOut);
  })();

  const transform = (() => {
    switch (item.animation) {
      case "slide-in":
      case "slide-up":
        const slideY = interpolate(localFrame, [0, fadeInFrames], [30, 0], {
          easing: Easing.out(Easing.cubic),
          extrapolateRight: "clamp",
        });
        return `translateY(${slideY}px)`;
      case "zoom":
        const scale = interpolate(localFrame, [0, fadeInFrames], [0.9, 1], {
          easing: Easing.out(Easing.cubic),
          extrapolateRight: "clamp",
        });
        return `scale(${scale})`;
      case "bounce":
        const bounce = interpolate(localFrame, [0, fadeInFrames], [0.8, 1], {
          easing: Easing.elastic(1),
          extrapolateRight: "clamp",
        });
        return `scale(${bounce})`;
      case "fade":
      case "none":
      default:
        return "none";
    }
  })();

  return (
    <Sequence
      className={`designcombo-scene-item id-${item.id} designcombo-scene-item-type-text `}
      key={item.id}
      from={from}
      durationInFrames={durationInFrames + REMOTION_SAFE_FRAME}
      data-track-item="transition-element"
      style={{
        position: "absolute",
        width: item.width || 3000,
        height: item.height || 400,
        fontSize: item.fontSize || "16px",
        top: item.y,
        left: item.x,
        color: item.color || "#000000",
        zIndex: effectiveZIndex,
        // backgroundColor: item.backgroundColor || "transparent",
        opacity: ((item.opacity ?? 100) / 100) * opacity,
        fontFamily: item.font || "Arial",
        transform,
        transition: "transform 0.2s ease",
        filter: item.blur ? `blur(${item.blur}px)` : "none",
      }}
    >
      <div
        data-text-id={item.id}
        style={{
          height: "100%",
          boxShadow: "none",
          outline: "none",
          whiteSpace: "normal",
          backgroundColor: item.backgroundColor || "transparent",
          textAlign: item.align ?? "left",
          position: "relative",
          width: "100%",
          cursor: "pointer",
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (isSelected) return;
          dispatch(setActiveElement("text"));
          const index = textElements.findIndex((clip) => clip.id === item.id);
          if (index >= 0) dispatch(setActiveElementIndex(index));
        }}
        dangerouslySetInnerHTML={{ __html: item.text }}
        className="designcombo_textLayer"
      />
    </Sequence>
  );
};
