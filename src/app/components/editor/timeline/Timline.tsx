import { useAppSelector } from "@/app/store";
import {
  setMarkerTrack,
  setTextElements,
  setMediaFiles,
  setTimelineZoom,
  setCurrentTime,
  setIsPlaying,
  setActiveElement,
} from "@/app/store/slices/projectSlice";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import Header from "./Header";
import VideoTimeline from "./elements-timeline/VideoTimeline";
import ImageTimeline from "./elements-timeline/ImageTimeline";
import AudioTimeline from "./elements-timeline/AudioTimeline";
import TextTimeline from "./elements-timeline/TextTimeline";
import { throttle } from "lodash";
import GlobalKeyHandlerProps from "../../../components/editor/keys/GlobalKeyHandlerProps";
import toast from "react-hot-toast";
import {
  Check,
  Copy,
  Image as ImageIcon,
  Music,
  Scissors,
  Trash2,
  Type,
  Video,
  X,
} from "lucide-react";

const TRACK_LABEL_WIDTH_PX = 144;
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
  } = useAppSelector((state) => state.projectState);
  const dispatch = useDispatch();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDraggingMarker, setIsDraggingMarker] = useState(false);
  const zoom =
    typeof timelineZoom === "number" &&
    Number.isFinite(timelineZoom) &&
    timelineZoom > 0
      ? timelineZoom
      : 60;
  const safeDuration =
    typeof duration === "number" && Number.isFinite(duration) && duration > 0
      ? duration
      : 0;
  const totalSeconds = Math.max(safeDuration + 2, 61);
  const laneWidthPx = totalSeconds * zoom;
  const timelineCanvasWidthPx = TRACK_LABEL_WIDTH_PX + laneWidthPx;

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
      const offsetX =
        clientX - rect.left + scrollOffset - TRACK_LABEL_WIDTH_PX;
      const seconds = Math.max(0, offsetX) / zoom;
      const clampedTime = Math.max(0, Math.min(safeDuration, seconds));
      dispatch(setCurrentTime(clampedTime));
      return clampedTime;
    },
    [dispatch, safeDuration, zoom],
  );

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;

    setTimeFromClientX(e.clientX);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const time = setTimeFromClientX(e.clientX) ?? 0;
    const newText = {
      id: crypto.randomUUID(),
      text: "New text",
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
    };
    dispatch(setTextElements([...textElements, newText]));
  };

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
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-row items-center justify-between gap-12 w-full">
        <div className="flex flex-row items-center gap-2">
          {/* Track Marker */}
          <button
            onClick={() => dispatch(setMarkerTrack(!enableMarkerTracking))}
            className="bg-white border rounded-md border-transparent transition-colors flex flex-row items-center justify-center text-gray-800 hover:bg-[#ccc] dark:hover:bg-[#ccc] mt-2 font-medium text-sm sm:text-base h-auto px-2 py-1 sm:w-auto"
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
          {/* Split */}
          <button
            onClick={handleSplit}
            className="bg-white border rounded-md border-transparent transition-colors flex flex-row items-center justify-center text-gray-800 hover:bg-[#ccc] dark:hover:bg-[#ccc] mt-2 font-medium text-sm sm:text-base h-auto px-2 py-1 sm:w-auto"
          >
            <Scissors className="h-4 w-4" />
            <span className="ml-2">
              Split <span className="text-xs">(S)</span>
            </span>
          </button>
          {/* Duplicate */}
          <button
            onClick={handleDuplicate}
            className="bg-white border rounded-md border-transparent transition-colors flex flex-row items-center justify-center text-gray-800 hover:bg-[#ccc] dark:hover:bg-[#ccc] mt-2 font-medium text-sm sm:text-base h-auto px-2 py-1 sm:w-auto"
          >
            <Copy className="h-4 w-4" />
            <span className="ml-2">
              Duplicate <span className="text-xs">(D)</span>
            </span>
          </button>
          {/* Delete */}
          <button
            onClick={handleDelete}
            className="bg-white border rounded-md border-transparent transition-colors flex flex-row items-center justify-center text-gray-800 hover:bg-[#ccc] dark:hover:bg-[#ccc] mt-2 font-medium text-sm sm:text-base h-auto px-2 py-1 sm:w-auto"
          >
            <Trash2 className="h-4 w-4" />
            <span className="ml-2">
              Delete <span className="text-xs">(Del)</span>
            </span>
          </button>
        </div>

        {/* Timeline Zoom */}
        <div className="flex flex-row justify-between items-center gap-2 mr-4">
          <label className="block text-sm mt-1 font-semibold text-white">
            Zoom
          </label>
          <span className="text-white text-lg">-</span>
          <input
            type="range"
            min={30}
            max={120}
            step="1"
            value={zoom}
            onChange={(e) => throttledZoom(Number(e.target.value))}
            className="w-[100px] bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:border-white-500"
          />
          <span className="text-white text-lg">+</span>
        </div>
      </div>

      <div
        className="relative overflow-x-auto w-full border-t border-gray-800 bg-[#1E1D21] z-10"
        ref={timelineRef}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <div className="relative" style={{ width: `${timelineCanvasWidthPx}px` }}>
          {/* Timeline Header */}
          <Header
            labelWidth={TRACK_LABEL_WIDTH_PX}
            totalSeconds={totalSeconds}
            zoom={zoom}
          />

          {/* Timeline cursor */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-50 cursor-ew-resize"
            style={{
              left: `${TRACK_LABEL_WIDTH_PX + (typeof currentTime === "number" && Number.isFinite(currentTime) ? currentTime : 0) * zoom}px`,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsDraggingMarker(true);
            }}
          />

          {/* Timeline rows */}
          <div className="divide-y divide-white/10">
            <div
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
                  Video
                </span>
              </div>
              <div className="relative h-16 overflow-hidden bg-[#1B1A1E]">
                <VideoTimeline />
              </div>
            </div>

            <div
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
                  Music
                </span>
              </div>
              <div className="relative h-16 overflow-hidden bg-[#1E1D21]">
                <AudioTimeline />
              </div>
            </div>

            <div
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
                <ImageIcon
                  className="h-4 w-4 text-white/60"
                  aria-hidden="true"
                />
                <span className="text-xs font-medium tracking-wide uppercase">
                  Image
                </span>
              </div>
              <div className="relative h-16 overflow-hidden bg-[#1B1A1E]">
                <ImageTimeline />
              </div>
            </div>

            <div
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
                <Type className="h-4 w-4 text-white/60" aria-hidden="true" />
                <span className="text-xs font-medium tracking-wide uppercase">
                  Text
                </span>
              </div>
              <div className="relative h-16 overflow-hidden bg-[#1E1D21]">
                <TextTimeline />
              </div>
            </div>
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
