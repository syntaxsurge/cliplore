import React, { useRef, useMemo, useEffect } from "react";
import Moveable, { OnDrag, OnResize } from "react-moveable";
import { useAppSelector } from "@/app/store";
import {
  applyTimelineEdit,
  setActiveElement,
  setActiveElementIndex,
  setTextElements,
} from "@/app/store/slices/projectSlice";
import { useDispatch } from "react-redux";
import { MediaFile, TextElement, TimelineTrack } from "@/app/types";
import { throttle } from "lodash";
import { Type } from "lucide-react";
import {
  computeRipplePlacement,
  findNeighborLimits,
} from "@/app/components/editor/timeline/ops";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

type Props = {
  trackId: string;
  fallbackTrackId: string | null;
};

export default function TextTimeline({ trackId, fallbackTrackId }: Props) {
  const targetRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { textElements, mediaFiles, tracks, activeElement, activeElementIndex, timelineZoom } =
    useAppSelector((state) => state.projectState);
  const dispatch = useDispatch();
  const moveableRef = useRef<Record<string, Moveable | null>>({});
  const zoom =
    isFiniteNumber(timelineZoom) && timelineZoom > 0 ? timelineZoom : 60;

  // this affect the performance cause of too much re-renders

  // const onUpdateMedia = (id: string, updates: Partial<MediaFile>) => {
  //     dispatch(setMediaFiles(mediaFiles.map(media =>
  //         media.id === id ? { ...media, ...updates } : media
  //     )));
  // };

  // TODO: this is a hack to prevent the mediaFiles from being updated too often while dragging or resizing
  const textElementsRef = useRef(textElements);
  useEffect(() => {
    textElementsRef.current = textElements;
  }, [textElements]);

  const mediaFilesRef = useRef(mediaFiles);
  useEffect(() => {
    mediaFilesRef.current = mediaFiles;
  }, [mediaFiles]);

  const onUpdateText = useMemo(
    () =>
      throttle((id: string, updates: Partial<TextElement>) => {
        const currentFiles = textElementsRef.current;
        const updated = currentFiles.map((text) =>
          text.id === id ? { ...text, ...updates } : text,
        );
        dispatch(setTextElements(updated));
      }, 100),
    [dispatch],
  );

  const handleClick = (element: string, index: number | string) => {
    if (element === "text") {
      dispatch(setActiveElement("text") as any);
      // TODO: find better way to do this
      const actualIndex = textElements.findIndex(
        (clip) => clip.id === (index as unknown as string),
      );
      dispatch(setActiveElementIndex(actualIndex));
    }
  };

  const handleDrag = (clip: TextElement, target: HTMLElement, left: number) => {
    // no negative left
    const constrainedLeft = Math.max(left, 0);
    const newPositionStart = constrainedLeft / zoom;
    const duration = Math.max(0, clip.positionEnd - clip.positionStart);
    onUpdateText(clip.id, {
      positionStart: newPositionStart,
      positionEnd: newPositionStart + duration,
    });

    target.style.left = `${constrainedLeft}px`;
  };

  const handleDragWithDrop = (
    clip: TextElement,
    target: HTMLElement,
    left: number,
    top?: number,
  ) => {
    handleDrag(clip, target, left);
    if (isFiniteNumber(top)) {
      target.style.top = `${top}px`;
    }
  };

  const findTrackIdAtPoint = (clientX: number, clientY: number) => {
    const elements = document.elementsFromPoint(
      clientX,
      clientY,
    ) as HTMLElement[];
    const trackEl = elements.find(
      (el) => el?.dataset?.timelineTrackId !== undefined,
    );
    return trackEl?.dataset?.timelineTrackId ?? null;
  };

  const handleResize = (
    clip: TextElement,
    target: HTMLElement,
    width: number,
  ) => {
    const currentTrackId = clip.trackId ?? fallbackTrackId ?? trackId;
    const bounds = getTrackBounds(currentTrackId);
    const { maxEnd } = findNeighborLimits({
      clips: bounds,
      movingId: clip.id,
      desiredStart: clip.positionEnd,
    });

    const desiredDuration = Math.max(0, width / zoom);
    const unclampedEnd = clip.positionStart + desiredDuration;
    const clampedEnd = Math.min(unclampedEnd, maxEnd);
    const nextDuration = Math.max(0, clampedEnd - clip.positionStart);

    onUpdateText(clip.id, {
      positionEnd: clampedEnd,
    });

    target.style.width = `${Math.max(2, nextDuration * zoom)}px`;
  };
  const handleLeftResize = (
    clip: TextElement,
    target: HTMLElement,
    width: number,
  ) => {
    const currentTrackId = clip.trackId ?? fallbackTrackId ?? trackId;
    const bounds = getTrackBounds(currentTrackId);
    const { minStart } = findNeighborLimits({
      clips: bounds,
      movingId: clip.id,
      desiredStart: clip.positionStart,
    });

    const desiredDuration = Math.max(0, width / zoom);
    const unclampedStart = Math.max(0, clip.positionEnd - desiredDuration);
    const clampedStart = Math.max(unclampedStart, minStart);
    const nextDuration = Math.max(0, clip.positionEnd - clampedStart);

    onUpdateText(clip.id, {
      positionStart: clampedStart,
    });

    target.style.left = `${clampedStart * zoom}px`;
    target.style.width = `${Math.max(2, nextDuration * zoom)}px`;
  };

  const getTrackBounds = (targetTrackId: string) => {
    const bounds = [
      ...mediaFilesRef.current
        .filter((clip) => (clip.trackId ?? null) === targetTrackId)
        .map((clip) => ({
          id: clip.id,
          start: clip.positionStart,
          end: clip.positionEnd,
        })),
      ...textElementsRef.current
        .filter((clip) => (clip.trackId ?? fallbackTrackId) === targetTrackId)
        .map((clip) => ({
          id: clip.id,
          start: clip.positionStart,
          end: clip.positionEnd,
        })),
    ];
    return bounds;
  };

  useEffect(() => {
    for (const clip of textElements) {
      moveableRef.current[clip.id]?.updateRect();
    }
  }, [timelineZoom, textElements]);

  return (
    <>
      {textElements
        .filter((clip) => (clip.trackId ?? fallbackTrackId) === trackId)
        .map((clip) => (
        <React.Fragment key={clip.id}>
          <div
            ref={(el: HTMLDivElement | null) => {
              if (el) {
                targetRefs.current[clip.id] = el;
              }
            }}
            onClick={() => handleClick("text", clip.id)}
            className={`absolute top-2 flex h-12 cursor-pointer items-center gap-2 rounded-md border border-amber-400/40 bg-amber-500/10 px-2 text-sm text-white/90 shadow-sm ${
              activeElement === "text" &&
              textElements[activeElementIndex]?.id === clip.id
                ? "ring-2 ring-blue-500/70"
                : "hover:bg-white/10"
            }`}
            style={{
              left: `${Math.max(
                0,
                (isFiniteNumber(clip.positionStart) ? clip.positionStart : 0) *
                  zoom,
              )}px`,
              width: `${Math.max(
                2,
                ((isFiniteNumber(clip.positionEnd) ? clip.positionEnd : 0) -
                  (isFiniteNumber(clip.positionStart) ? clip.positionStart : 0)) *
                  zoom,
              )}px`,
              zIndex: clip.zIndex,
            }}
          >
            <Type className="h-5 w-5 min-w-6 flex-shrink-0 text-white/80" />
            <span className="truncate text-x">{clip.text}</span>
          </div>

          <Moveable
            ref={(el: Moveable | null) => {
              if (el) {
                moveableRef.current[clip.id] = el;
              }
            }}
            target={targetRefs.current[clip.id] || null}
            container={null}
            className={
              activeElement === "text" &&
              textElements[activeElementIndex]?.id === clip.id
                ? "moveable-timeline"
                : "moveable-control-box-hidden"
            }
            renderDirections={
              activeElement === "text" &&
              textElements[activeElementIndex]?.id === clip.id
                ? ["w", "e"]
                : []
            }
            draggable={true}
            throttleDrag={0}
            rotatable={false}
            linePadding={4}
            controlPadding={6}
            onDragStart={({ target, clientX, clientY }) => {}}
            onDrag={({ target, left, top }: OnDrag) => {
              handleClick("text", clip.id);
              handleDragWithDrop(clip, target as HTMLElement, left, top);
            }}
            onDragEnd={({ target, clientX, clientY }) => {
              if (!target) return;
              onUpdateText.cancel();
              (target as HTMLElement).style.top = "";
              if (!isFiniteNumber(clientX) || !isFiniteNumber(clientY)) return;

              const dropTarget = findTrackIdAtPoint(clientX, clientY);
              const current = textElementsRef.current.find((t) => t.id === clip.id);
              if (!current) return;

              const currentTrackId =
                current.trackId ?? fallbackTrackId ?? trackId;

              let targetTrackId = dropTarget ?? currentTrackId;
              let nextTracks: TimelineTrack[] | undefined;

              if (
                dropTarget === "__new-layer-top" ||
                dropTarget === "__new-layer-bottom"
              ) {
                const insertAt =
                  dropTarget === "__new-layer-bottom"
                    ? Math.min(2, tracks.length)
                    : tracks.length;
                const nextId = crypto.randomUUID();
                const newTrack: TimelineTrack = {
                  id: nextId,
                  kind: "layer",
                  name: `Layer ${insertAt + 1}`,
                };
                nextTracks = [
                  ...tracks.slice(0, insertAt),
                  newTrack,
                  ...tracks.slice(insertAt),
                ];
                targetTrackId = nextId;
              }

              if (!targetTrackId) return;

              const rawLeft = Number.parseFloat(
                (target as HTMLElement).style.left || "0",
              );
              const leftPx = Number.isFinite(rawLeft) ? Math.max(0, rawLeft) : 0;
              const desiredStart = leftPx / zoom;

              const duration = Math.max(0, current.positionEnd - current.positionStart);

              const bounds = getTrackBounds(targetTrackId);
              const placement = computeRipplePlacement({
                clips: bounds,
                movingId: current.id,
                desiredStart,
                duration,
              });

              const nextTextElements = textElementsRef.current.map((t) => {
                if (t.id === current.id) {
                  return {
                    ...t,
                    trackId: targetTrackId,
                    positionStart: placement.start,
                    positionEnd: placement.end,
                  };
                }

                const delta = placement.shifts[t.id];
                if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) {
                  return t;
                }

                return {
                  ...t,
                  positionStart: t.positionStart + delta,
                  positionEnd: t.positionEnd + delta,
                };
              });

              const nextMediaFiles = mediaFilesRef.current.map((m) => {
                const delta = placement.shifts[m.id];
                if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) {
                  return m;
                }
                return {
                  ...m,
                  positionStart: m.positionStart + delta,
                  positionEnd: m.positionEnd + delta,
                };
              });

              dispatch(
                applyTimelineEdit({
                  ...(nextTracks ? { tracks: nextTracks } : {}),
                  mediaFiles: nextMediaFiles,
                  textElements: nextTextElements,
                }),
              );
            }}
            resizable={true}
            throttleResize={0}
            onResizeStart={({ target, clientX, clientY }) => {}}
            onResize={({ target, width, delta, direction }: OnResize) => {
              if (!isFiniteNumber(width)) return;
              if (direction[0] === 1) {
                handleClick("text", clip.id);
                delta[0] && (target!.style.width = `${width}px`);
                handleResize(clip, target as HTMLElement, width);
              } else if (direction[0] === -1) {
                handleClick("text", clip.id);
                delta[0] && (target!.style.width = `${width}px`);
                handleLeftResize(clip, target as HTMLElement, width);
              }
            }}
            onResizeEnd={({ target, isDrag, clientX, clientY }) => {}}
          />
        </React.Fragment>
      ))}
    </>
  );
}
