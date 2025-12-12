"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

export async function createLoadedFfmpeg(options?: {
  onLog?: (message: string) => void;
}) {
  const ffmpeg = new FFmpeg();

  if (options?.onLog) {
    ffmpeg.on("log", ({ message }) => {
      options.onLog?.(message);
    });
  }

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  return ffmpeg;
}
