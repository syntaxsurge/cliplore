import React, { useRef, useMemo, useEffect } from "react";
import Moveable, { OnDrag, OnResize } from "react-moveable";
import { useAppSelector } from "@/app/store";
import {
  setActiveElement,
  setActiveElementIndex,
  setTextElements,
} from "@/app/store/slices/projectSlice";
import { useDispatch } from "react-redux";
import { TextElement } from "@/app/types";
import { throttle } from "lodash";
import { Type } from "lucide-react";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export default function TextTimeline() {
  const targetRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { textElements, activeElement, activeElementIndex, timelineZoom } =
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
    onUpdateText(clip.id, {
      positionStart: newPositionStart,
      positionEnd: newPositionStart - clip.positionStart + clip.positionEnd,
    });

    target.style.left = `${constrainedLeft}px`;
  };

  const handleResize = (
    clip: TextElement,
    target: HTMLElement,
    width: number,
  ) => {
    const newPositionEnd = width / zoom;

    onUpdateText(clip.id, {
      positionEnd: clip.positionStart + newPositionEnd,
    });
  };
  const handleLeftResize = (
    clip: TextElement,
    target: HTMLElement,
    width: number,
  ) => {
    const newDuration = width / zoom;
    const nextPositionStart = Math.max(clip.positionEnd - newDuration, 0);
    onUpdateText(clip.id, {
      positionStart: nextPositionStart,
    });
    target.style.left = `${nextPositionStart * zoom}px`;
  };

  useEffect(() => {
    for (const clip of textElements) {
      moveableRef.current[clip.id]?.updateRect();
    }
  }, [timelineZoom, textElements]);

  return (
    <>
      {textElements.map((clip) => (
        <React.Fragment key={clip.id}>
          <div
            ref={(el: HTMLDivElement | null) => {
              if (el) {
                targetRefs.current[clip.id] = el;
              }
            }}
            onClick={() => handleClick("text", clip.id)}
            className={`absolute top-2 h-12 cursor-pointer items-center justify-center rounded-md border border-gray-500 border-opacity-50 bg-[#27272A] text-sm text-white ${
              activeElement === "text" &&
              textElements[activeElementIndex]?.id === clip.id
                ? "border-blue-500 bg-[#3F3F46]"
                : ""
            } flex`}
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
            <Type className="mr-2 h-5 w-5 min-w-6 flex-shrink-0 text-white/80" />
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
            onDrag={({ target, left }: OnDrag) => {
              handleClick("text", clip.id);
              handleDrag(clip, target as HTMLElement, left);
            }}
            onDragEnd={({ target, isDrag, clientX, clientY }) => {}}
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
