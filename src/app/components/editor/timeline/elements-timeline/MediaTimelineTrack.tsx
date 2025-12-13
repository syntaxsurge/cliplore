"use client";

import { useAppSelector } from "@/app/store";
import {
  setActiveElement,
  setActiveElementIndex,
  setMediaFiles,
} from "@/app/store/slices/projectSlice";
import { MediaFile, MediaType } from "@/app/types";
import Moveable, { OnDrag, OnResize } from "react-moveable";
import { throttle } from "lodash";
import { useDispatch } from "react-redux";
import React, { useEffect, useMemo, useRef } from "react";
import { Image as ImageIcon, Music, Video } from "lucide-react";

type Props = {
  trackId: string;
  mediaTypes: Array<Exclude<MediaType, "unknown">>;
  fallbackTrackIdForType: Record<MediaType, string | null>;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export function MediaTimelineTrack({
  trackId,
  mediaTypes,
  fallbackTrackIdForType,
}: Props) {
  const targetRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const moveableRef = useRef<Record<string, Moveable | null>>({});
  const { mediaFiles, activeElement, activeElementIndex, timelineZoom } =
    useAppSelector((state) => state.projectState);
  const dispatch = useDispatch();
  const zoom =
    isFiniteNumber(timelineZoom) && timelineZoom > 0 ? timelineZoom : 60;

  const mediaFilesRef = useRef(mediaFiles);
  useEffect(() => {
    mediaFilesRef.current = mediaFiles;
  }, [mediaFiles]);

  const onUpdateMedia = useMemo(
    () =>
      throttle((id: string, updates: Partial<MediaFile>) => {
        const currentFiles = mediaFilesRef.current;
        const updated = currentFiles.map((media) =>
          media.id === id ? { ...media, ...updates } : media,
        );
        dispatch(setMediaFiles(updated));
      }, 100),
    [dispatch],
  );

  const handleClick = (id: string) => {
    dispatch(setActiveElement("media") as any);
    const actualIndex = mediaFiles.findIndex((clip) => clip.id === id);
    dispatch(setActiveElementIndex(actualIndex));
  };

  const handleDrag = (
    clip: MediaFile,
    target: HTMLElement,
    left: number,
    top?: number,
  ) => {
    const constrainedLeft = Math.max(left, 0);
    const newPositionStart = constrainedLeft / zoom;
    const deltaSeconds = newPositionStart - clip.positionStart;

    if (clip.type === "image") {
      onUpdateMedia(clip.id, {
        positionStart: newPositionStart,
        positionEnd: deltaSeconds + clip.positionEnd,
        endTime: deltaSeconds + clip.endTime,
      });
    } else {
      onUpdateMedia(clip.id, {
        positionStart: newPositionStart,
        positionEnd: deltaSeconds + clip.positionEnd,
        endTime: Math.max(deltaSeconds + clip.endTime, clip.endTime),
      });
    }

    target.style.left = `${constrainedLeft}px`;
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

  const handleRightResize = (
    clip: MediaFile,
    target: HTMLElement,
    width: number,
  ) => {
    if (clip.type === "image") {
      const newTimelineDuration = width / zoom;
      onUpdateMedia(clip.id, {
        positionEnd: clip.positionStart + newTimelineDuration,
        endTime: clip.positionStart + newTimelineDuration,
      });
      return;
    }

    const playbackSpeed = clip.playbackSpeed || 1;
    const newTimelineDuration = width / zoom;
    const durationWithSpeed = newTimelineDuration * playbackSpeed;
    const nextPositionEnd = clip.positionStart + durationWithSpeed;

    onUpdateMedia(clip.id, {
      positionEnd: nextPositionEnd,
      endTime: clip.startTime + durationWithSpeed,
    });
  };

  const handleLeftResize = (
    clip: MediaFile,
    target: HTMLElement,
    width: number,
  ) => {
    if (clip.type === "image") {
      const newDuration = width / zoom;
      const nextPositionStart = Math.max(clip.positionEnd - newDuration, 0);
      onUpdateMedia(clip.id, {
        positionStart: nextPositionStart,
      });
      target.style.left = `${nextPositionStart * zoom}px`;
      return;
    }

    const playbackSpeed = clip.playbackSpeed || 1;
    const newTimelineDuration = width / zoom;
    const durationWithSpeed = newTimelineDuration * playbackSpeed;
    const nextPositionStart = Math.max(clip.positionEnd - durationWithSpeed, 0);
    const nextStartTime = Math.max(clip.endTime - durationWithSpeed, 0);

    onUpdateMedia(clip.id, {
      positionStart: nextPositionStart,
      startTime: nextStartTime,
    });

    target.style.left = `${nextPositionStart * zoom}px`;
  };

  useEffect(() => {
    for (const clip of mediaFiles) {
      moveableRef.current[clip.id]?.updateRect();
    }
  }, [timelineZoom, mediaFiles]);

  const getClipIcon = (type: MediaType) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" aria-hidden="true" />;
      case "audio":
        return <Music className="h-4 w-4" aria-hidden="true" />;
      case "image":
        return <ImageIcon className="h-4 w-4" aria-hidden="true" />;
      default:
        return null;
    }
  };

  return (
    <div>
      {mediaFiles
        .filter(
          (clip) =>
            mediaTypes.includes(clip.type as Exclude<MediaType, "unknown">) &&
            (clip.trackId ?? fallbackTrackIdForType[clip.type]) === trackId,
        )
        .map((clip) => (
          <div key={clip.id}>
            {(() => {
              const playbackSpeed =
                isFiniteNumber(clip.playbackSpeed) && clip.playbackSpeed > 0
                  ? clip.playbackSpeed
                  : 1;
              const positionStart = isFiniteNumber(clip.positionStart)
                ? clip.positionStart
                : 0;
              const positionEnd = isFiniteNumber(clip.positionEnd)
                ? clip.positionEnd
                : positionStart;
              const widthPx = Math.max(
                2,
                (positionEnd / playbackSpeed - positionStart / playbackSpeed) *
                  zoom,
              );
              const leftPx = Math.max(0, positionStart * zoom);

              return (
                <div
                  ref={(el: HTMLDivElement | null) => {
                    if (el) {
                      targetRefs.current[clip.id] = el;
                    }
                  }}
                  onClick={() => handleClick(clip.id)}
                  className={`absolute border border-gray-500 border-opacity-50 rounded-md top-2 h-12 rounded bg-[#27272A] text-white text-sm flex items-center justify-center cursor-pointer ${
                    activeElement === "media" &&
                    mediaFiles[activeElementIndex]?.id === clip.id
                      ? "bg-[#3F3F46] border-blue-500"
                      : ""
                  }`}
                  style={{
                    left: `${leftPx}px`,
                    width: `${widthPx}px`,
                    zIndex: clip.zIndex,
                  }}
                >
                  <span className="mr-2 inline-flex h-7 w-7 min-w-6 items-center justify-center text-white/80">
                    {getClipIcon(clip.type)}
                  </span>
                  <span className="truncate text-x">{clip.fileName}</span>
                </div>
              );
            })()}

            <Moveable
              ref={(el: Moveable | null) => {
                if (el) {
                  moveableRef.current[clip.id] = el;
                }
              }}
              target={targetRefs.current[clip.id] || null}
              container={null}
              renderDirections={
                activeElement === "media" &&
                mediaFiles[activeElementIndex]?.id === clip.id
                  ? ["w", "e"]
                  : []
              }
              draggable
              throttleDrag={0}
              rotatable={false}
              resizable
              throttleResize={0}
              linePadding={4}
              controlPadding={6}
              onDrag={({ target, left, top }: OnDrag) => {
                handleClick(clip.id);
                handleDrag(clip, target as HTMLElement, left, top);
              }}
              onDragEnd={({ target, clientX, clientY }) => {
                if (!target) return;
                target.style.top = "";
                if (!isFiniteNumber(clientX) || !isFiniteNumber(clientY)) return;
                const nextTrackId = findTrackIdAtPoint(clientX, clientY);
                if (!nextTrackId) return;
                const currentTrackId =
                  clip.trackId ?? fallbackTrackIdForType[clip.type];
                if (nextTrackId === currentTrackId) return;
                onUpdateMedia(clip.id, { trackId: nextTrackId });
              }}
              onResize={({ target, width, delta, direction }: OnResize) => {
                if (!isFiniteNumber(width)) return;
                if (direction[0] === 1) {
                  handleClick(clip.id);
                  delta[0] && (target!.style.width = `${width}px`);
                  handleRightResize(clip, target as HTMLElement, width);
                } else if (direction[0] === -1) {
                  handleClick(clip.id);
                  delta[0] && (target!.style.width = `${width}px`);
                  handleLeftResize(clip, target as HTMLElement, width);
                }
              }}
              className={
                activeElement === "media" &&
                mediaFiles[activeElementIndex]?.id === clip.id
                  ? "moveable-timeline"
                  : "moveable-control-box-hidden"
              }
            />
          </div>
        ))}
    </div>
  );
}

export default MediaTimelineTrack;
