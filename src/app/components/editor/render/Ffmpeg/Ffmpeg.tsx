"use client";

import { useEffect, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { createLoadedFfmpeg } from "@/lib/media/ffmpeg";
import FfmpegRender from "./FfmpegRender";
import RenderOptions from "./RenderOptions";
export default function Ffmpeg() {
  const [loadFfmpeg, setLoadedFfmpeg] = useState(false);
  const ffmpegRef = useRef<FFmpeg>(new FFmpeg());
  const [logMessages, setLogMessages] = useState<string>("");

  const loadFFmpegFunction = async () => {
    setLoadedFfmpeg(false);
    const ffmpeg = await createLoadedFfmpeg({
      onLog: (message) => setLogMessages(message),
    });
    ffmpegRef.current = ffmpeg;
    setLoadedFfmpeg(true);
  };

  useEffect(() => {
    loadFFmpegFunction();
  }, []);

  return (
    <div className="flex flex-col justify-center items-center py-2">
      <RenderOptions />
      <FfmpegRender
        loadFunction={loadFFmpegFunction}
        loadFfmpeg={loadFfmpeg}
        logMessages={logMessages}
        ffmpeg={ffmpegRef.current}
      />
    </div>
  );
}
