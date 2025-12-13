"use client";

import Moveable, { OnDrag, OnResize, OnRotate } from "react-moveable";
import { useAppDispatch, useAppSelector } from "@/app/store";
import {
  setMediaFiles,
  setTextElements,
} from "@/app/store/slices/projectSlice";
import { useEffect, useMemo, useRef, useState } from "react";
import { throttle } from "lodash";
import type { MediaFile, TextElement } from "@/app/types";
import { createPortal } from "react-dom";
import { useEditorPlayer } from "./EditorPlayerContext";

export default function MoveableOverlay() {
  const dispatch = useAppDispatch();
  const { editingTextId } = useEditorPlayer();
  const { activeElement, activeElementIndex, mediaFiles, textElements } =
    useAppSelector((state) => state.projectState);

  const targetRef = useRef<HTMLElement | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );
  const [containerScale, setContainerScale] = useState(1);

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

  useEffect(() => {
    const container = document.querySelector(
      ".__remotion-player",
    ) as HTMLElement | null;
    setPortalContainer(container);
  }, []);

  useEffect(() => {
    if (!portalContainer) return;

    const updateScale = () => {
      const rect = portalContainer.getBoundingClientRect();
      const scaleX = rect.width / portalContainer.offsetWidth;
      const scaleY = rect.height / portalContainer.offsetHeight;
      const safeScaleX = Number.isFinite(scaleX) && scaleX > 0 ? scaleX : 1;
      const safeScaleY = Number.isFinite(scaleY) && scaleY > 0 ? scaleY : 1;
      setContainerScale(Math.min(safeScaleX, safeScaleY));
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => {
      window.removeEventListener("resize", updateScale);
    };
  }, [portalContainer]);

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

  if (!selected || !target || !portalContainer || editingTextId) return null;

  const isFiniteNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

  const keepRatio =
    activeElement === "media" &&
    (selected as MediaFile).type !== undefined &&
    ((selected as MediaFile).type === "image" || (selected as MediaFile).type === "video");

  const patchTransformRotation = (value: string, rotation: number) => {
    const nextRotation = `rotate(${rotation}deg)`;
    if (!value || value === "none") return nextRotation;
    if (/\brotate\([^)]+\)/.test(value)) {
      return value.replace(/\brotate\([^)]+\)/, nextRotation);
    }
    return `${value} ${nextRotation}`;
  };

  return createPortal(
    <Moveable
      target={target}
      container={portalContainer}
      origin={false}
      draggable
      throttleDrag={0}
      resizable
      throttleResize={0}
      rotatable
      throttleRotate={0}
      keepRatio={keepRatio}
      renderDirections={["nw", "n", "ne", "e", "se", "s", "sw", "w"]}
      linePadding={6}
      controlPadding={8}
      zoom={containerScale > 0 ? 1 / containerScale : 1}
      className="moveable-canvas"
      onDrag={({ target, left, top }: OnDrag) => {
        if (!target) return;
        target.style.left = `${left}px`;
        target.style.top = `${top}px`;
        updateSelected({ x: left, y: top } as any);
      }}
      onResize={({ target, width, height, drag, delta }: OnResize) => {
        if (!target) return;

        if (delta[0] && isFiniteNumber(width)) target.style.width = `${width}px`;
        if (delta[1] && isFiniteNumber(height))
          target.style.height = `${height}px`;
        if (drag) {
          if (isFiniteNumber(drag.left)) target.style.left = `${drag.left}px`;
          if (isFiniteNumber(drag.top)) target.style.top = `${drag.top}px`;
        }

        if (activeElement === "media") {
          const media = selected as MediaFile;
          const prevCrop = media.crop ?? {
            x: 0,
            y: 0,
            width: media.width ?? 1,
            height: media.height ?? 1,
          };
          const prevBoundsWidth = prevCrop.width || media.width || 1;
          const prevBoundsHeight = prevCrop.height || media.height || 1;

          const nextBoundsWidth = isFiniteNumber(width) ? Math.max(1, width) : prevBoundsWidth;
          const nextBoundsHeight = isFiniteNumber(height) ? Math.max(1, height) : prevBoundsHeight;

          const scaleX =
            prevBoundsWidth > 0 ? nextBoundsWidth / prevBoundsWidth : 1;
          const scaleY =
            prevBoundsHeight > 0 ? nextBoundsHeight / prevBoundsHeight : 1;

          const nextWidth = Math.round((media.width ?? prevBoundsWidth) * scaleX);
          const nextHeight = Math.round((media.height ?? prevBoundsHeight) * scaleY);

          updateSelected({
            width: nextWidth,
            height: nextHeight,
            crop: {
              x: Math.round((prevCrop.x || 0) * scaleX),
              y: Math.round((prevCrop.y || 0) * scaleY),
              width: Math.round(nextBoundsWidth),
              height: Math.round(nextBoundsHeight),
            },
            ...(isFiniteNumber(drag?.left) ? { x: drag.left } : {}),
            ...(isFiniteNumber(drag?.top) ? { y: drag.top } : {}),
          } as any);
          return;
        }

        updateSelected({
          ...(isFiniteNumber(width) ? { width } : {}),
          ...(isFiniteNumber(height) ? { height } : {}),
          ...(isFiniteNumber(drag?.left) ? { x: drag.left } : {}),
          ...(isFiniteNumber(drag?.top) ? { y: drag.top } : {}),
        } as any);
      }}
      onRotate={({ target, beforeRotate }: OnRotate) => {
        if (!target) return;
        const nextRotation =
          typeof beforeRotate === "number" && Number.isFinite(beforeRotate)
            ? beforeRotate
            : 0;
        target.style.transform = patchTransformRotation(
          target.style.transform,
          nextRotation,
        );
        updateSelected({ rotation: nextRotation } as any);
      }}
    />,
    portalContainer,
  );
}
