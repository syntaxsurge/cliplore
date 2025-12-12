"use client";

import Moveable, { OnDrag, OnResize } from "react-moveable";
import { useAppDispatch, useAppSelector } from "@/app/store";
import {
  setMediaFiles,
  setTextElements,
} from "@/app/store/slices/projectSlice";
import { useEffect, useMemo, useRef, useState } from "react";
import { throttle } from "lodash";
import type { MediaFile, TextElement } from "@/app/types";

export default function MoveableOverlay() {
  const dispatch = useAppDispatch();
  const { activeElement, activeElementIndex, mediaFiles, textElements } =
    useAppSelector((state) => state.projectState);

  const targetRef = useRef<HTMLElement | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);

  const selected = useMemo<MediaFile | TextElement | null>(() => {
    if (activeElement === "media") {
      return mediaFiles[activeElementIndex] ?? null;
    }
    if (activeElement === "text") {
      return textElements[activeElementIndex] ?? null;
    }
    return null;
  }, [activeElement, activeElementIndex, mediaFiles, textElements]);

  useEffect(() => {
    if (!selected) {
      targetRef.current = null;
      setTarget(null);
      return;
    }
    const el = document.querySelector(
      `.id-${selected.id}`,
    ) as HTMLElement | null;
    targetRef.current = el;
    setTarget(el);
  }, [selected]);

  const updateSelected = useMemo(
    () =>
      throttle((updates: Partial<MediaFile> | Partial<TextElement>) => {
        if (!selected) return;
        if (activeElement === "media") {
          const updated = mediaFiles.map((m, idx) =>
            idx === activeElementIndex ? { ...m, ...updates } : m,
          );
          dispatch(setMediaFiles(updated));
        } else if (activeElement === "text") {
          const updated = textElements.map((t, idx) =>
            idx === activeElementIndex ? { ...t, ...updates } : t,
          );
          dispatch(setTextElements(updated));
        }
      }, 50),
    [
      dispatch,
      activeElement,
      activeElementIndex,
      mediaFiles,
      textElements,
      selected,
    ],
  );

  if (!selected || !target) return null;

  const isFiniteNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

  return (
    <Moveable
      target={target}
      container={
        document.querySelector(".__remotion-player") as HTMLElement | null
      }
      origin={false}
      draggable
      throttleDrag={0}
      resizable
      throttleResize={0}
      keepRatio={false}
      onDrag={({ target, left, top }: OnDrag) => {
        if (!target) return;
        target.style.left = `${left}px`;
        target.style.top = `${top}px`;
        target.style.transform = "none";
        updateSelected({ x: left, y: top } as any);
      }}
      onResize={({ target, width, height, drag, delta }: OnResize) => {
        if (!target) return;
        if (delta[0] && isFiniteNumber(width))
          target.style.width = `${width}px`;
        if (delta[1] && isFiniteNumber(height))
          target.style.height = `${height}px`;
        if (drag) {
          if (isFiniteNumber(drag.left)) target.style.left = `${drag.left}px`;
          if (isFiniteNumber(drag.top)) target.style.top = `${drag.top}px`;
        }
        target.style.transform = "none";
        updateSelected({
          ...(isFiniteNumber(width) ? { width } : {}),
          ...(isFiniteNumber(height) ? { height } : {}),
          ...(isFiniteNumber(drag?.left) ? { x: drag.left } : {}),
          ...(isFiniteNumber(drag?.top) ? { y: drag.top } : {}),
        } as any);
      }}
    />
  );
}
