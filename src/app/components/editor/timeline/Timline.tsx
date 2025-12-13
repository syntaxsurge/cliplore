import { useAppSelector } from "@/app/store";
import type { MediaType } from "@/app/types";
import {
  addMarker,
  applyTimelineEdit,
  setActiveElement,
  setCurrentTime,
  setIsPlaying,
  setMarkerTrack,
  setMediaFiles,
  setTextElements,
  setTimelineZoom,
  updateMarker,
} from "@/app/store/slices/projectSlice";
import { throttle } from "lodash";
import {
  Check,
  Copy,
  Flag,
  Layers,
  Scissors,
  Trash2,
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
import { useEditorPlayer } from "@/app/components/editor/player/remotion/EditorPlayerContext";
import { useCurrentPlayerFrame } from "@/app/components/editor/player/remotion/useCurrentPlayerFrame";
import GlobalKeyHandlerProps from "../../../components/editor/keys/GlobalKeyHandlerProps";
import Header from "./Header";
import MediaTimelineTrack from "./elements-timeline/MediaTimelineTrack";
import TextTimeline from "./elements-timeline/TextTimeline";
import { computeRipplePlacement } from "./ops";

const TRACK_LABEL_WIDTH_PX = 144;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const Timeline = () => {
  const {
    timelineZoom,
    enableMarkerTracking,
    activeElement,
    activeElementIndex,
    mediaFiles,
    textElements,
    duration,
    isPlaying,
    tracks,
    markers,
    fps,
  } = useAppSelector((state) => state.projectState);
  const dispatch = useDispatch();
  const { player } = useEditorPlayer();
  const safeFps =
    typeof fps === "number" && Number.isFinite(fps) && fps > 0 ? fps : 30;
  const playerFrame = useCurrentPlayerFrame(player);
  const playheadTime = playerFrame / safeFps;
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDraggingMarker, setIsDraggingMarker] = useState(false);
  const [draggingTimelineMarkerId, setDraggingTimelineMarkerId] = useState<
    string | null
  >(null);

  const zoom = isFiniteNumber(timelineZoom) && timelineZoom > 0 ? timelineZoom : 60;
  const safeDuration = isFiniteNumber(duration) && duration > 0 ? duration : 0;

  const maxMarkerTime =
    markers.length > 0 ? Math.max(...markers.map((m) => m.time)) : 0;
  const totalSeconds = Math.max(safeDuration + 2, maxMarkerTime + 2, 61);
  const laneWidthPx = totalSeconds * zoom;
  const timelineCanvasWidthPx = TRACK_LABEL_WIDTH_PX + laneWidthPx;

  const baseTrackId = tracks[0]?.id ?? null;
  const overlayTrackId = tracks[1]?.id ?? baseTrackId;
  const audioTrackId = tracks[2]?.id ?? baseTrackId;

  const fallbackTrackIdForType = useMemo<Record<MediaType, string | null>>(
    () => ({
      video: baseTrackId,
      image: overlayTrackId ?? baseTrackId,
      audio: audioTrackId ?? baseTrackId,
      unknown: baseTrackId,
    }),
    [audioTrackId, baseTrackId, overlayTrackId],
  );

  const fallbackTextTrackId = overlayTrackId ?? baseTrackId;

  const displayTracks = useMemo(() => [...tracks].reverse(), [tracks]);

  const getTrackBounds = useCallback(
    (targetTrackId: string) => {
      const bounds = [
        ...mediaFiles
          .filter(
            (clip) =>
              (clip.trackId ?? fallbackTrackIdForType[clip.type]) === targetTrackId,
          )
          .map((clip) => ({
            id: clip.id,
            start: clip.positionStart,
            end: clip.positionEnd,
          })),
        ...textElements
          .filter(
            (clip) => (clip.trackId ?? fallbackTextTrackId) === targetTrackId,
          )
          .map((clip) => ({
            id: clip.id,
            start: clip.positionStart,
            end: clip.positionEnd,
          })),
      ];
      return bounds;
    },
    [fallbackTextTrackId, fallbackTrackIdForType, mediaFiles, textElements],
  );

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

      if (playheadTime <= positionStart || playheadTime >= positionEnd) {
        toast.error("Marker is outside the selected element bounds.");
        return;
      }

      const positionDuration = positionEnd - positionStart;

      // Media logic (uses startTime/endTime for trimming)
      const { startTime, endTime } = element;
      const sourceDuration = endTime - startTime;
      const ratio = (playheadTime - positionStart) / positionDuration;
      const splitSourceOffset = startTime + ratio * sourceDuration;

      const firstPart = {
        ...element,
        id: crypto.randomUUID(),
        positionStart,
        positionEnd: playheadTime,
        startTime,
        endTime: splitSourceOffset,
      };

      const secondPart = {
        ...element,
        id: crypto.randomUUID(),
        positionStart: playheadTime,
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

      if (playheadTime <= positionStart || playheadTime >= positionEnd) {
        toast.error("Marker is outside the selected element.");
        return;
      }

      const firstPart = {
        ...element,
        id: crypto.randomUUID(),
        positionStart,
        positionEnd: playheadTime,
      };

      const secondPart = {
        ...element,
        id: crypto.randomUUID(),
        positionStart: playheadTime,
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
    if (!activeElement) {
      toast.error("No element selected.");
      return;
    }

    const nextId = crypto.randomUUID();

    if (activeElement === "media") {
      const element = mediaFiles[activeElementIndex];
      if (!element) {
        toast.error("No element selected.");
        return;
      }

      const resolvedTrackId =
        element.trackId ?? fallbackTrackIdForType[element.type] ?? null;
      if (!resolvedTrackId) {
        toast.error("Select a valid track before duplicating.");
        return;
      }

      const duration = Math.max(0, element.positionEnd - element.positionStart);
      const placement = computeRipplePlacement({
        clips: getTrackBounds(resolvedTrackId),
        movingId: nextId,
        desiredStart: element.positionEnd,
        duration,
      });

      const shiftedMediaFiles = mediaFiles.map((clip) => {
        const delta = placement.shifts[clip.id];
        if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) {
          return clip;
        }
        return {
          ...clip,
          positionStart: clip.positionStart + delta,
          positionEnd: clip.positionEnd + delta,
        };
      });

      const duplicated = {
        ...element,
        id: nextId,
        trackId: resolvedTrackId,
        positionStart: placement.start,
        positionEnd: placement.end,
      };

      shiftedMediaFiles.splice(activeElementIndex + 1, 0, duplicated as any);

      const shiftedTextElements = textElements.map((clip) => {
        const delta = placement.shifts[clip.id];
        if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) {
          return clip;
        }
        return {
          ...clip,
          positionStart: clip.positionStart + delta,
          positionEnd: clip.positionEnd + delta,
        };
      });

      dispatch(
        applyTimelineEdit({
          mediaFiles: shiftedMediaFiles as any,
          textElements: shiftedTextElements as any,
        }),
      );
      dispatch(setActiveElement(null));
      toast.success("Element duplicated successfully.");
      return;
    }

    const element = textElements[activeElementIndex];
    if (!element) {
      toast.error("No element selected.");
      return;
    }

    const resolvedTrackId = element.trackId ?? fallbackTextTrackId ?? null;
    if (!resolvedTrackId) {
      toast.error("Select a valid track before duplicating.");
      return;
    }

    const duration = Math.max(0, element.positionEnd - element.positionStart);
    const placement = computeRipplePlacement({
      clips: getTrackBounds(resolvedTrackId),
      movingId: nextId,
      desiredStart: element.positionEnd,
      duration,
    });

    const shiftedTextElements = textElements.map((clip) => {
      const delta = placement.shifts[clip.id];
      if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) {
        return clip;
      }
      return {
        ...clip,
        positionStart: clip.positionStart + delta,
        positionEnd: clip.positionEnd + delta,
      };
    });

    const duplicated = {
      ...element,
      id: nextId,
      trackId: resolvedTrackId,
      positionStart: placement.start,
      positionEnd: placement.end,
    };

    shiftedTextElements.splice(activeElementIndex + 1, 0, duplicated as any);

    const shiftedMediaFiles = mediaFiles.map((clip) => {
      const delta = placement.shifts[clip.id];
      if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) {
        return clip;
      }
      return {
        ...clip,
        positionStart: clip.positionStart + delta,
        positionEnd: clip.positionEnd + delta,
      };
    });

    dispatch(
      applyTimelineEdit({
        mediaFiles: shiftedMediaFiles as any,
        textElements: shiftedTextElements as any,
      }),
    );
    dispatch(setActiveElement(null));
    toast.success("Element duplicated successfully.");
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

  const getTimeFromClientX = useCallback(
    (clientX: number) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const scrollOffset = timelineRef.current.scrollLeft;
      const offsetX = clientX - rect.left + scrollOffset - TRACK_LABEL_WIDTH_PX;
      const seconds = Math.max(0, offsetX) / zoom;
      return Math.max(0, Math.min(safeDuration, seconds));
    },
    [safeDuration, zoom],
  );

  const setTimeFromClientX = useCallback(
    (clientX: number) => {
      const clampedTime = getTimeFromClientX(clientX);
      if (typeof clampedTime !== "number") return;
      dispatch(setIsPlaying(false));
      dispatch(setCurrentTime(clampedTime));
      player?.seekTo(Math.round(clampedTime * safeFps));
      return clampedTime;
    },
    [dispatch, getTimeFromClientX, player, safeFps],
  );

  const handleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    setTimeFromClientX(e.clientX);
  };

  const handleDoubleClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const time = setTimeFromClientX(e.clientX) ?? 0;
    const resolvedTrackId = fallbackTextTrackId ?? null;
    if (!resolvedTrackId) {
      toast.error("Unable to place text without a layer.");
      return;
    }
    const newText = {
      id: crypto.randomUUID(),
      text: "New text",
      trackId: resolvedTrackId,
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

    const duration = Math.max(0, newText.positionEnd - newText.positionStart);
    const placement = computeRipplePlacement({
      clips: getTrackBounds(resolvedTrackId),
      movingId: newText.id,
      desiredStart: time,
      duration,
    });

    const shiftedMediaFiles = mediaFiles.map((clip) => {
      const delta = placement.shifts[clip.id];
      if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) {
        return clip;
      }
      return {
        ...clip,
        positionStart: clip.positionStart + delta,
        positionEnd: clip.positionEnd + delta,
      };
    });

    const shiftedTextElements = textElements
      .map((clip) => {
        const delta = placement.shifts[clip.id];
        if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) {
          return clip;
        }
        return {
          ...clip,
          positionStart: clip.positionStart + delta,
          positionEnd: clip.positionEnd + delta,
        };
      })
      .concat({
        ...newText,
        positionStart: placement.start,
        positionEnd: placement.end,
      });

    dispatch(
      applyTimelineEdit({
        mediaFiles: shiftedMediaFiles as any,
        textElements: shiftedTextElements as any,
      }),
    );
  };

  useEffect(() => {
    if (!enableMarkerTracking) return;
    const el = timelineRef.current;
    if (!el) return;
    const playheadX = TRACK_LABEL_WIDTH_PX + playheadTime * zoom;

    const margin = 160;
    const left = el.scrollLeft;
    const right = left + el.clientWidth;

    if (playheadX < left + margin || playheadX > right - margin) {
      el.scrollTo({
        left: Math.max(0, playheadX - el.clientWidth / 2),
        behavior: isPlaying ? "auto" : "smooth",
      });
    }
  }, [enableMarkerTracking, isPlaying, playheadTime, zoom]);

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

  const throttledMarkerUpdate = useMemo(
    () =>
      throttle((id: string, time: number) => {
        dispatch(updateMarker({ id, time }));
      }, 50),
    [dispatch],
  );

  useEffect(() => {
    return () => throttledMarkerUpdate.cancel();
  }, [throttledMarkerUpdate]);

  useEffect(() => {
    if (!draggingTimelineMarkerId) return;
    const handleMove = (event: MouseEvent) => {
      const time = getTimeFromClientX(event.clientX);
      if (typeof time !== "number") return;
      throttledMarkerUpdate(draggingTimelineMarkerId, time);
      dispatch(setCurrentTime(time));
      player?.seekTo(Math.round(time * safeFps));
    };
    const handleUp = () => setDraggingTimelineMarkerId(null);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [
    dispatch,
    draggingTimelineMarkerId,
    getTimeFromClientX,
    player,
    safeFps,
    throttledMarkerUpdate,
  ]);

  const handleAddMarker = useCallback(() => {
    dispatch(addMarker({ time: playheadTime }));
  }, [dispatch, playheadTime]);

  return (
    <div className="flex h-full w-full flex-col gap-2">
      <div className="flex w-full flex-row items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAddMarker}
            className="mt-2 flex h-auto flex-row items-center justify-center rounded-md border border-transparent bg-white px-2 py-1 text-sm font-medium text-gray-800 transition-colors hover:bg-[#ccc] sm:text-base"
          >
            <Flag className="h-4 w-4" aria-hidden="true" />
            <span className="ml-2">
              Marker <span className="text-xs">(T)</span>
            </span>
          </button>

          <button
            onClick={() => dispatch(setMarkerTrack(!enableMarkerTracking))}
            className="mt-2 flex h-auto flex-row items-center justify-center rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 sm:text-base"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center">
              {enableMarkerTracking ? (
                <Check className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </span>
            <span className="ml-2">
              Follow <span className="text-xs">(F)</span>
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

          {markers.map((marker) => (
            <div
              key={marker.id}
              className="absolute top-0 bottom-0 z-40"
              style={{
                left: `${TRACK_LABEL_WIDTH_PX + marker.time * zoom}px`,
              }}
            >
              <div className="absolute top-0 bottom-0 w-px bg-amber-400/25" />
              <button
                type="button"
                title={
                  typeof marker.label === "string" && marker.label.trim().length > 0
                    ? marker.label
                    : `${marker.time.toFixed(2)}s`
                }
                className="absolute top-0 -translate-x-1/2 h-12 w-6 cursor-ew-resize"
                style={{ left: 0 }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  dispatch(setIsPlaying(false));
                  setDraggingTimelineMarkerId(marker.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch(setCurrentTime(marker.time));
                  player?.seekTo(Math.round(marker.time * safeFps));
                }}
              >
                <div className="mx-auto mt-1 h-0 w-0 border-x-[6px] border-x-transparent border-t-[10px] border-t-amber-400/90" />
              </button>
            </div>
          ))}

          <div
            className="absolute top-0 bottom-0 z-50 w-[2px] cursor-ew-resize bg-red-500"
            style={{
              left: `${TRACK_LABEL_WIDTH_PX + playheadTime * zoom}px`,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsDraggingMarker(true);
            }}
          />

          <div className="divide-y divide-white/10">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `${TRACK_LABEL_WIDTH_PX}px 1fr`,
              }}
            >
              <div
                className="sticky left-0 z-20 h-8 border-r border-white/10 bg-[#1E1D21]"
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
              />
              <div
                className="relative h-8 bg-[#16151A]"
                data-timeline-track-id="__new-layer-top"
              >
                <div className="flex h-full items-center justify-center border-b border-dashed border-white/10 text-[10px] text-white/35">
                  Drop to create a new layer
                </div>
              </div>
            </div>

            {displayTracks.map((track) => (
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
                  <Layers className="h-4 w-4 text-white/60" aria-hidden="true" />
                  <span className="text-xs font-medium tracking-wide uppercase">
                    {track.name}
                  </span>
                </div>

                <div
                  className="relative h-16 overflow-visible bg-[#1B1A1E]"
                  data-timeline-track-id={track.id}
                >
                  <MediaTimelineTrack
                    trackId={track.id}
                    mediaTypes={["video", "image", "audio"]}
                    fallbackTrackIdForType={fallbackTrackIdForType}
                    fallbackTextTrackId={fallbackTextTrackId}
                  />
                  <TextTimeline
                    trackId={track.id}
                    fallbackTrackId={fallbackTextTrackId}
                  />
                </div>
              </div>
            ))}

            <div
              className="grid"
              style={{
                gridTemplateColumns: `${TRACK_LABEL_WIDTH_PX}px 1fr`,
              }}
            >
              <div
                className="sticky left-0 z-20 h-8 border-r border-white/10 bg-[#1E1D21]"
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
              />
              <div
                className="relative h-8 bg-[#16151A]"
                data-timeline-track-id="__new-layer-bottom"
              >
                <div className="flex h-full items-center justify-center border-t border-dashed border-white/10 text-[10px] text-white/35">
                  Drop to create a new layer
                </div>
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
