import * as core from "@diffusionstudio/core";

import { getFile } from "@/app/store";
import type { ExportConfig, MediaFile, TextElement } from "@/app/types";
import { clientEnv } from "@/lib/env/client";

type CoreRenderInput = {
  mediaFiles: MediaFile[];
  textElements: TextElement[];
  exportSettings: ExportConfig;
  onProgress?: NonNullable<InstanceType<typeof core.Encoder>["onProgress"]>;
};

const resolutionToSize = (resolution: string) => {
  switch (resolution) {
    case "480p":
      return { width: 854, height: 480 };
    case "720p":
      return { width: 1280, height: 720 };
    case "1080p":
      return { width: 1920, height: 1080 };
    case "2K":
      return { width: 2048, height: 1080 };
    case "4K":
      return { width: 3840, height: 2160 };
    default:
      return { width: 1920, height: 1080 };
  }
};

const qualityToBitrates = (quality: string) => {
  switch (quality) {
    case "low":
      return { video: 2e6, audio: 128e3 };
    case "medium":
      return { video: 4e6, audio: 192e3 };
    case "high":
      return { video: 8e6, audio: 256e3 };
    case "ultra":
      return { video: 16e6, audio: 320e3 };
    default:
      return { video: 4e6, audio: 192e3 };
  }
};

const normalizeOpacity = (opacity?: number) =>
  Math.min(Math.max((opacity ?? 100) / 100, 0), 1);

const normalizeVolume = (volume?: number) =>
  Math.min(Math.max((volume ?? 100) / 100, 0), 1);

const toHexColor = (input?: string) => {
  if (!input) return "#ffffff";
  if (input.startsWith("#")) return input;
  const lowered = input.toLowerCase();
  if (lowered === "white") return "#ffffff";
  if (lowered === "black") return "#000000";
  return "#ffffff";
};

export async function renderWithDiffusionCore({
  mediaFiles,
  textElements,
  exportSettings,
  onProgress,
}: CoreRenderInput): Promise<Blob> {
  if (typeof window === "undefined") {
    throw new Error(
      "Diffusion Core rendering is only supported in the browser.",
    );
  }

  const { width, height } = resolutionToSize(exportSettings.resolution);
  const bitrates = qualityToBitrates(exportSettings.quality);

  const composition = new core.Composition({
    width,
    height,
    background: "#000000",
    licenseKey: clientEnv.NEXT_PUBLIC_DIFFUSION_LICENSE_KEY ?? null,
  });

  const mountEl = document.createElement("div");
  mountEl.style.position = "fixed";
  mountEl.style.left = "-9999px";
  mountEl.style.top = "0";
  mountEl.style.width = "0";
  mountEl.style.height = "0";
  document.body.appendChild(mountEl);
  composition.mount(mountEl);

  try {
    const visualFiles = mediaFiles.filter(
      (m) => m.type === "video" || m.type === "image",
    );
    const audioFiles = mediaFiles.filter((m) => m.type === "audio");

    const zIndices = Array.from(
      new Set(visualFiles.map((m) => m.zIndex ?? 0)),
    ).sort((a, b) => b - a);

    for (const z of zIndices) {
      const layer = new core.Layer();
      await composition.add(layer, composition.layers.length);

      const filesForZ = visualFiles.filter((m) => (m.zIndex ?? 0) === z);
      for (const file of filesForZ) {
        const fileData = await getFile(file.fileId);
        const duration = file.positionEnd - file.positionStart;

        const effects: core.Effect[] | undefined =
          file.blur && file.blur > 0
            ? [{ type: "blur", value: file.blur }]
            : undefined;

        const commonProps = {
          delay: file.positionStart,
          duration,
          x: file.x ?? 0,
          y: file.y ?? 0,
          width: file.width,
          height: file.height,
          rotation: file.rotation ?? 0,
          opacity: normalizeOpacity(file.opacity),
          effects,
        };

        if (file.type === "video") {
          const source = await core.Source.from<core.VideoSource>(fileData);
          const clip = new core.VideoClip(source, {
            ...commonProps,
            range: [file.startTime, file.startTime + duration] as [
              number,
              number,
            ],
            volume: normalizeVolume(file.volume),
          });
          await layer.add(clip);
        } else if (file.type === "image") {
          const source = await core.Source.from<core.ImageSource>(fileData);
          const clip = new core.ImageClip(source, commonProps);
          await layer.add(clip);
        }
      }
    }

    if (audioFiles.length > 0) {
      const audioLayer = new core.Layer();
      await composition.add(audioLayer, composition.layers.length);

      for (const file of audioFiles) {
        const fileData = await getFile(file.fileId);
        const duration = file.positionEnd - file.positionStart;
        const source = await core.Source.from<core.AudioSource>(fileData);
        const clip = new core.AudioClip(source, {
          delay: file.positionStart,
          duration,
          range: [file.startTime, file.startTime + duration] as [
            number,
            number,
          ],
          volume: normalizeVolume(file.volume),
        });
        await audioLayer.add(clip);
      }
    }

    if (textElements.length > 0) {
      const textLayer = new core.Layer();
      await composition.add(textLayer, 0);

      const uniqueFonts = Array.from(
        new Set(textElements.map((t) => t.font).filter(Boolean)),
      ) as string[];
      const fontsByFamily = new Map<string, core.Font>();
      for (const family of uniqueFonts) {
        try {
          const font = await core.loadFont({
            family,
            source: `url(/fonts/${family}.ttf)`,
          });
          fontsByFamily.set(family, font);
        } catch {
          // Fallback to system fonts if custom font fails to load.
        }
      }

      for (const text of textElements) {
        const duration = text.positionEnd - text.positionStart;
        const family = text.font || "Arial";
        const loadedFont = fontsByFamily.get(family);
        const fontSize = text.fontSize || loadedFont?.size || 24;

        const clip = new core.TextClip({
          text: text.text,
          delay: text.positionStart,
          duration,
          x: text.x,
          y: text.y,
          width: text.width,
          rotation: text.rotation ?? 0,
          opacity: normalizeOpacity(text.opacity),
          color: toHexColor(text.color) as core.hex,
          font: {
            family,
            size: fontSize,
            weight: loadedFont?.weight,
            style: loadedFont?.style,
          },
          align: text.align,
        });

        await textLayer.add(clip);
      }
    }

    const encoder = new core.Encoder(composition, {
      format: "mp4",
      video: {
        codec: "avc",
        fps: exportSettings.fps,
        bitrate: bitrates.video,
      },
      audio: {
        codec: "aac",
        bitrate: bitrates.audio,
      },
    });

    if (onProgress) {
      encoder.onProgress = onProgress;
    }

    const result = await encoder.render();
    if (result.type !== "success" || !result.data) {
      throw new Error("GPU render failed or was canceled.");
    }

    return result.data;
  } finally {
    composition.unmount();
    mountEl.remove();
  }
}
