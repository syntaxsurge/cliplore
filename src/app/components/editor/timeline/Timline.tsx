import { useAppSelector } from "@/app/store";
import type { MediaType } from "@/app/types";
import {
  addTrack,
  setActiveElement,
  setCurrentTime,
  setIsPlaying,
  setMarkerTrack,
  setMediaFiles,
  setTextElements,
  setTimelineZoom,
} from "@/app/store/slices/projectSlice";
import { throttle } from "lodash";
import {
  Check,
  Copy,
  Music,
  Plus,
  Scissors,
  Trash2,
  Video,
  X,
} from "lucide-react";
import {
  memo,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import GlobalKeyHandlerProps from "../../../components/editor/keys/GlobalKeyHandlerProps";
import Header from "./Header";
import MediaTimelineTrack from "./elements-timeline/MediaTimelineTrack";
import TextTimeline from "./elements-timeline/TextTimeline";

const TRACK_LABEL_WIDTH_PX = 144;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const Timeline = () => {
  const {
    currentTime,
    timelineZoom,
    enableMarkerTracking,
    activeElement,
    activeElementIndex,
    mediaFiles,
    textElements,
    duration,
    isPlaying,
    tracks,
  } = useAppSelector((state) => state.projectState);
  const dispatch = useDispatch();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDraggingMarker, setIsDraggingMarker] = useState(false);

  const zoom = isFiniteNumber(timelineZoom) && timelineZoom > 0 ? timelineZoom : 60;
  const safeDuration = isFiniteNumber(duration) && duration > 0 ? duration : 0;

  const totalSeconds = Math.max(safeDuration + 2, 61);
  const laneWidthPx = totalSeconds * zoom;
  const timelineCanvasWidthPx = TRACK_LABEL_WIDTH_PX + laneWidthPx;

  const videoTracks = tracks.filter((t) => t.kind === "video");
  const audioTracks = tracks.filter((t) => t.kind === "audio");

  const mainVideoTrackId = videoTracks[0]?.id ?? null;
  const overlayVideoTrackId = videoTracks[1]?.id ?? mainVideoTrackId;
  const mainAudioTrackId = audioTracks[0]?.id ?? null;

  const fallbackTrackIdForType = useMemo<Record<MediaType, string | null>>(
    () => ({
      video: mainVideoTrackId,
      image: overlayVideoTrackId ?? mainVideoTrackId,
      audio: mainAudioTrackId ?? mainVideoTrackId,
      unknown: mainVideoTrackId,
    }),
    [mainAudioTrackId, mainVideoTrackId, overlayVideoTrackId],
  );

  const fallbackTextTrackId = overlayVideoTrackId ?? mainVideoTrackId;

  const displayVideoTracks = useMemo(
    () => [...videoTracks].reverse(),
    [videoTracks],
  );
  const displayAudioTracks = useMemo(
    () => [...audioTracks].reverse(),
    [audioTracks],
  );

  const formatTrackLabel = (kind: "video" | "audio", name: string) => {
    const suffix = name.replace(/^[VA]/, "");
    return kind === "audio" ? `Audio ${suffix || name}` : `Video ${suffix || name}`;
  };

  const throttledZoom = useMemo(
    () =>
      throttle((value: number) => {
        dispatch(setTimelineZoom(value));
      }, 100),
    [dispatch],
  );

  const handleSplit = () => {
    let element = null;
    let elements = null;
    let setElements = null;

    if (!activeElement) {
      toast.error("No element selected.");
      return;
    }

    if (activeElement === "media") {
      elements = [...mediaFiles];
      element = elements[activeElementIndex];
      setElements = setMediaFiles;

      if (!element) {
        toast.error("No element selected.");
        return;
      }

      const { positionStart, positionEnd } = element;

      if (currentTime <= positionStart || currentTime >= positionEnd) {
        toast.error("Marker is outside the selected element bounds.");
        return;
      }

      const positionDuration = positionEnd - positionStart;

      // Media logic (uses startTime/endTime for trimming)
      const { startTime, endTime } = element;
      const sourceDuration = endTime - startTime;
      const ratio = (currentTime - positionStart) / positionDuration;
      const splitSourceOffset = startTime + ratio * sourceDuration;

      const firstPart = {
        ...element,
        id: crypto.randomUUID(),
        positionStart,
        positionEnd: currentTime,
        startTime,
        endTime: splitSourceOffset,
      };

      const secondPart = {
        ...element,
        id: crypto.randomUUID(),
        positionStart: currentTime,
        positionEnd,
        startTime: splitSourceOffset,
        endTime,
      };

      elements.splice(activeElementIndex, 1, firstPart, secondPart);
    } else if (activeElement === "text") {
      elements = [...textElements];
      element = elements[activeElementIndex];
      setElements = setTextElements;

      if (!element) {
        toast.error("No element selected.");
        return;
      }

      const { positionStart, positionEnd } = element;

      if (currentTime <= positionStart || currentTime >= positionEnd) {
        toast.error("Marker is outside the selected element.");
        return;
      }

      const firstPart = {
        ...element,
        id: crypto.randomUUID(),
        positionStart,
        positionEnd: currentTime,
      };

      const secondPart = {
        ...element,
        id: crypto.randomUUID(),
        positionStart: currentTime,
        positionEnd,
      };

      elements.splice(activeElementIndex, 1, firstPart, secondPart);
    }

    if (elements && setElements) {
      dispatch(setElements(elements as any));
      dispatch(setActiveElement(null));
      toast.success("Element split successfully.");
    }
  };

  const handleDuplicate = () => {
    let element = null;
    let elements = null;
    let setElements = null;

    if (activeElement === "media") {
      elements = [...mediaFiles];
      element = elements[activeElementIndex];
      setElements = setMediaFiles;
    } else if (activeElement === "text") {
      elements = [...textElements];
      element = elements[activeElementIndex];
      setElements = setTextElements;
    }

    if (!element) {
      toast.error("No element selected.");
      return;
    }

    const duplicatedElement = {
      ...element,
      id: crypto.randomUUID(),
    };

    if (elements) {
      elements.splice(activeElementIndex + 1, 0, duplicatedElement as any);
    }

    if (elements && setElements) {
      dispatch(setElements(elements as any));
      dispatch(setActiveElement(null));
      toast.success("Element duplicated successfully.");
    }
  };

  const handleDelete = () => {
    // @ts-ignore
    let element = null;
    let elements = null;
    let setElements = null;

    if (activeElement === "media") {
      elements = [...mediaFiles];
      element = elements[activeElementIndex];
      setElements = setMediaFiles;
    } else if (activeElement === "text") {
      elements = [...textElements];
      element = elements[activeElementIndex];
      setElements = setTextElements;
    }

    if (!element) {
      toast.error("No element selected.");
      return;
    }

    if (elements) {
      // @ts-ignore
      elements = elements.filter((ele) => ele.id !== element.id);
    }

    if (elements && setElements) {
      dispatch(setElements(elements as any));
      dispatch(setActiveElement(null));
      toast.success("Element deleted successfully.");
    }
  };

  const setTimeFromClientX = useCallback(
    (clientX: number) => {
      if (!timelineRef.current) return;
      dispatch(setIsPlaying(false));
      const rect = timelineRef.current.getBoundingClientRect();
      const scrollOffset = timelineRef.current.scrollLeft;
      const offsetX = clientX - rect.left + scrollOffset - TRACK_LABEL_WIDTH_PX;
      const seconds = Math.max(0, offsetX) / zoom;
      const clampedTime = Math.max(0, Math.min(safeDuration, seconds));
      dispatch(setCurrentTime(clampedTime));
      return clampedTime;
    },
    [dispatch, safeDuration, zoom],
  );

  const handleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    setTimeFromClientX(e.clientX);
  };

  const handleDoubleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const time = setTimeFromClientX(e.clientX) ?? 0;
    const newText = {
      id: crypto.randomUUID(),
      text: "New text",
      trackId: fallbackTextTrackId ?? undefined,
      positionStart: time,
      positionEnd: time + 5,
      x: 600,
      y: 600,
      width: 800,
      height: 200,
      font: "Arial",
      fontSize: 64,
      color: "#ffffff",
      backgroundColor: "transparent",
      align: "center" as const,
      zIndex: 0,
      opacity: 100,
      rotation: 0,
      fadeInDuration: 0.3,
      fadeOutDuration: 0.3,
      animation: "fade" as const,
      blur: 0,
    };
    dispatch(setTextElements([...textElements, newText]));
  };

  useEffect(() => {
    if (!enableMarkerTracking) return;
    const el = timelineRef.current;
    if (!el) return;
    const safeCurrentTime = isFiniteNumber(currentTime) ? currentTime : 0;
    const playheadX = TRACK_LABEL_WIDTH_PX + safeCurrentTime * zoom;

    const margin = 160;
    const left = el.scrollLeft;
    const right = left + el.clientWidth;

    if (playheadX < left + margin || playheadX > right - margin) {
      el.scrollTo({
        left: Math.max(0, playheadX - el.clientWidth / 2),
        behavior: isPlaying ? "auto" : "smooth",
      });
    }
  }, [currentTime, enableMarkerTracking, isPlaying, zoom]);

  useEffect(() => {
    if (!isDraggingMarker) return;
    const handleMove = (event: MouseEvent) => {
      setTimeFromClientX(event.clientX);
    };
    const handleUp = () => {
      setIsDraggingMarker(false);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDraggingMarker, setTimeFromClientX]);

  return (
    <div className="flex h-full w-full flex-col gap-2">
      <div className="flex w-full flex-row items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => dispatch(setMarkerTrack(!enableMarkerTracking))}
            className="mt-2 flex h-auto flex-row items-center justify-center rounded-md border border-transparent bg-white px-2 py-1 text-sm font-medium text-gray-800 transition-colors hover:bg-[#ccc] sm:text-base"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center">
              {enableMarkerTracking ? (
                <Check className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </span>
            <span className="ml-2">
              Track Marker <span className="text-xs">(T)</span>
            </span>
          </button>

          <button
            onClick={handleSplit}
            className="mt-2 flex h-auto flex-row items-center justify-center rounded-md border border-transparent bg-white px-2 py-1 text-sm font-medium text-gray-800 transition-colors hover:bg-[#ccc] sm:text-base"
          >
            <Scissors className="h-4 w-4" />
            <span className="ml-2">
              Split <span className="text-xs">(S)</span>
            </span>
          </button>

          <button
            onClick={handleDuplicate}
            className="mt-2 flex h-auto flex-row items-center justify-center rounded-md border border-transparent bg-white px-2 py-1 text-sm font-medium text-gray-800 transition-colors hover:bg-[#ccc] sm:text-base"
          >
            <Copy className="h-4 w-4" />
            <span className="ml-2">
              Duplicate <span className="text-xs">(D)</span>
            </span>
          </button>

          <button
            onClick={handleDelete}
            className="mt-2 flex h-auto flex-row items-center justify-center rounded-md border border-transparent bg-white px-2 py-1 text-sm font-medium text-gray-800 transition-colors hover:bg-[#ccc] sm:text-base"
          >
            <Trash2 className="h-4 w-4" />
            <span className="ml-2">
              Delete <span className="text-xs">(Del)</span>
            </span>
          </button>

          <div className="ml-2 mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => dispatch(addTrack({ kind: "video" }))}
              className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm text-white/80 hover:bg-white/10"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <Video className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-medium">Video track</span>
            </button>
            <button
              type="button"
              onClick={() => dispatch(addTrack({ kind: "audio" }))}
              className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm text-white/80 hover:bg-white/10"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <Music className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-medium">Audio track</span>
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="text-white text-lg">-</span>
          <input
            type="range"
            min={30}
            max={150}
            step="1"
            value={zoom}
            onChange={(e) => throttledZoom(Number(e.target.value))}
            className="w-[120px] rounded border border-white border-opacity-10 bg-darkSurfacePrimary text-white shadow-md focus:border-white-500 focus:outline-none"
            aria-label="Timeline zoom"
          />
          <span className="text-white text-lg">+</span>
        </div>
      </div>

      <div
        className="relative min-h-0 w-full flex-1 overflow-auto border-t border-gray-800 bg-[#1E1D21] z-10"
        ref={timelineRef}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <div className="relative" style={{ width: `${timelineCanvasWidthPx}px` }}>
          <Header
            labelWidth={TRACK_LABEL_WIDTH_PX}
            totalSeconds={totalSeconds}
            zoom={zoom}
          />

          <div
            className="absolute top-0 bottom-0 z-50 w-[2px] cursor-ew-resize bg-red-500"
            style={{
              left: `${TRACK_LABEL_WIDTH_PX + (isFiniteNumber(currentTime) ? currentTime : 0) * zoom}px`,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsDraggingMarker(true);
            }}
          />

          <div className="divide-y divide-white/10">
            {displayVideoTracks.map((track) => (
              <div
                key={track.id}
                className="grid"
                style={{
                  gridTemplateColumns: `${TRACK_LABEL_WIDTH_PX}px 1fr`,
                }}
              >
                <div
                  className="sticky left-0 z-20 flex h-16 items-center gap-2 border-r border-white/10 bg-[#1E1D21] px-3 text-white/80"
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                >
                  <Video className="h-4 w-4 text-white/60" aria-hidden="true" />
                  <span className="text-xs font-medium tracking-wide uppercase">
                    {formatTrackLabel("video", track.name)}
                  </span>
                </div>

                <div
                  className="relative h-16 overflow-visible bg-[#1B1A1E]"
                  data-timeline-track-id={track.id}
                >
                  <MediaTimelineTrack
                    trackId={track.id}
                    mediaTypes={["video", "image"]}
                    fallbackTrackIdForType={fallbackTrackIdForType}
                  />
                  <TextTimeline
                    trackId={track.id}
                    fallbackTrackId={fallbackTextTrackId}
                  />
                </div>
              </div>
            ))}

            {displayVideoTracks.length > 0 && displayAudioTracks.length > 0 ? (
              <div
                className="grid bg-black/40"
                style={{
                  gridTemplateColumns: `${TRACK_LABEL_WIDTH_PX}px 1fr`,
                }}
              >
                <div
                  className="sticky left-0 z-20 h-2 border-r border-white/10 bg-black/40"
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                />
                <div className="h-2 bg-black/40" />
              </div>
            ) : null}

            {displayAudioTracks.map((track) => (
              <div
                key={track.id}
                className="grid"
                style={{
                  gridTemplateColumns: `${TRACK_LABEL_WIDTH_PX}px 1fr`,
                }}
              >
                <div
                  className="sticky left-0 z-20 flex h-16 items-center gap-2 border-r border-white/10 bg-[#1E1D21] px-3 text-white/80"
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                >
                  <Music className="h-4 w-4 text-white/60" aria-hidden="true" />
                  <span className="text-xs font-medium tracking-wide uppercase">
                    {formatTrackLabel("audio", track.name)}
                  </span>
                </div>

                <div
                  className="relative h-16 overflow-visible bg-[#1E1D21]"
                  data-timeline-track-id={track.id}
                >
                  <MediaTimelineTrack
                    trackId={track.id}
                    mediaTypes={["audio"]}
                    fallbackTrackIdForType={fallbackTrackIdForType}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <GlobalKeyHandlerProps
        handleDuplicate={handleDuplicate}
        handleSplit={handleSplit}
        handleDelete={handleDelete}
      />
    </div>
  );
};

export default memo(Timeline);
