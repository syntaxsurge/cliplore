"use client";

import { useAppSelector, getFile, storeFile } from "../../../store";
import {
  setActiveElement,
  setMediaFiles,
  setTextElements,
} from "../../../store/slices/projectSlice";
import { MediaFile } from "../../../types";
import { useAppDispatch } from "../../../store";
import { useState } from "react";
import toast from "react-hot-toast";
import { createLoadedFfmpeg } from "@/lib/media/ffmpeg";
import { mimeToExt } from "@/app/types";

export default function MediaProperties() {
  const { mediaFiles, activeElementIndex } = useAppSelector(
    (state) => state.projectState,
  );
  const mediaFile = mediaFiles[activeElementIndex];
  const dispatch = useAppDispatch();
  const [isExtracting, setIsExtracting] = useState(false);
  const onUpdateMedia = (id: string, updates: Partial<MediaFile>) => {
    dispatch(
      setMediaFiles(
        mediaFiles.map((media) =>
          media.id === id ? { ...media, ...updates } : media,
        ),
      ),
    );
  };

  const handleSeparateAudio = async () => {
    if (!mediaFile || mediaFile.type !== "video") return;
    setIsExtracting(true);
    try {
      const file = await getFile(mediaFile.fileId);
      if (!file) {
        toast.error("Original file not found");
        return;
      }
      const ffmpeg = await createLoadedFfmpeg();
      const buffer = await file.arrayBuffer();
      const ext =
        mimeToExt[file.type as keyof typeof mimeToExt] ??
        file.type.split("/")[1] ??
        "mp4";
      const inputName = `input.${ext}`;
      await ffmpeg.writeFile(inputName, new Uint8Array(buffer));
      const outputName = "output.m4a";
      await ffmpeg.exec([
        "-i",
        inputName,
        "-vn",
        "-acodec",
        "aac",
        "-b:a",
        "192k",
        outputName,
      ]);
      const data = (await ffmpeg.readFile(outputName)) as Uint8Array;
      ffmpeg.terminate();
      const audioFile = new File(
        [data.buffer],
        `${mediaFile.fileName}-audio.m4a`,
        { type: "audio/mp4" },
      );
      const audioId = crypto.randomUUID();
      await storeFile(audioFile, audioId);
      const newAudio: MediaFile = {
        ...mediaFile,
        id: crypto.randomUUID(),
        fileId: audioId,
        src: URL.createObjectURL(audioFile),
        type: "audio",
        playbackSpeed: mediaFile.playbackSpeed || 1,
        volume: mediaFile.volume ?? 100,
        positionStart: mediaFile.positionStart,
        positionEnd: mediaFile.positionEnd,
        startTime: mediaFile.startTime,
        endTime: mediaFile.endTime,
      };
      dispatch(setMediaFiles([...mediaFiles, newAudio]));
      toast.success("Audio track created");
    } catch (error) {
      console.error("Separate audio failed", error);
      toast.error("Unable to separate audio");
    } finally {
      setIsExtracting(false);
    }
  };

  if (!mediaFile) return null;
  const baseCrop = mediaFile.crop ?? {
    x: 0,
    y: 0,
    width: mediaFile.width ?? 0,
    height: mediaFile.height ?? 0,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-8">
        {/* Source Video */}
        <div className="space-y-2">
          <h4 className="font-semibold">Source Video</h4>
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm">Start (s)</label>
              <input
                type="number"
                readOnly={true}
                value={mediaFile.startTime}
                min={0}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, {
                    startTime: Number(e.target.value),
                    endTime: mediaFile.endTime,
                  })
                }
                className="w-full p-2 bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:ring-2 focus:ring-white-500 focus:border-white-500"
              />
            </div>
            <div>
              <label className="block text-sm">End (s)</label>
              <input
                type="number"
                readOnly={true}
                value={mediaFile.endTime}
                min={mediaFile.startTime}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, {
                    startTime: mediaFile.startTime,
                    endTime: Number(e.target.value),
                  })
                }
                className="w-full p-2 bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:ring-2 focus:ring-white-500 focus:border-white-500"
              />
            </div>
          </div>
        </div>
        {/* Timing Position */}
        <div className="space-y-2">
          <h4 className="font-semibold">Timing Position</h4>
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm">Start (s)</label>
              <input
                type="number"
                readOnly={true}
                value={mediaFile.positionStart}
                min={0}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, {
                    positionStart: Number(e.target.value),
                    positionEnd:
                      Number(e.target.value) +
                      (mediaFile.positionEnd - mediaFile.positionStart),
                  })
                }
                className="w-full p-2 bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:ring-2 focus:ring-white-500 focus:border-white-500"
              />
            </div>
            <div>
              <label className="block text-sm">End (s)</label>
              <input
                type="number"
                readOnly={true}
                value={mediaFile.positionEnd}
                min={mediaFile.positionStart}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, {
                    positionEnd: Number(e.target.value),
                  })
                }
                className="w-full p-2 bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:ring-2 focus:ring-white-500 focus:border-white-500"
              />
            </div>
          </div>
        </div>
        {/* Visual Properties */}
        <div className="space-y-6">
          <h4 className="font-semibold">Visual Properties</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm">X Position</label>
              <input
                type="number"
                step="10"
                value={mediaFile.x || 0}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, { x: Number(e.target.value) })
                }
                className="w-full p-2 bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:ring-2 focus:ring-white-500 focus:border-white-500"
              />
            </div>
            <div>
              <label className="block text-sm">Y Position</label>
              <input
                type="number"
                step="10"
                value={mediaFile.y || 0}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, { y: Number(e.target.value) })
                }
                className="w-full p-2 bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:ring-2 focus:ring-white-500 focus:border-white-500"
              />
            </div>
            <div>
              <label className="block text-sm">Width</label>
              <input
                type="number"
                step="10"
                value={mediaFile.width || 100}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, { width: Number(e.target.value) })
                }
                className="w-full p-2 bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:ring-2 focus:ring-white-500 focus:border-white-500"
              />
            </div>
            <div>
              <label className="block text-sm">Height</label>
              <input
                type="number"
                step="10"
                value={mediaFile.height || 100}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, {
                    height: Number(e.target.value),
                  })
                }
                className="w-full p-2 bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:ring-2 focus:ring-white-500 focus:border-white-500"
              />
            </div>
            <div>
              <label className="block text-sm">Zindex</label>
              <input
                type="number"
                value={mediaFile.zIndex || 0}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, {
                    zIndex: Number(e.target.value),
                  })
                }
                className="w-full p-2 bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:ring-2 focus:ring-white-500 focus:border-white-500"
              />
            </div>
            <div>
              <label className="block text-sm">Opacity</label>
              <input
                type="range"
                min="0"
                max="100"
                value={mediaFile.opacity}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, {
                    opacity: Number(e.target.value),
                  })
                }
                className="w-full bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:border-white-500"
              />
            </div>
            <div>
              <label className="block text-sm">Blur</label>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value={mediaFile.blur || 0}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, { blur: Number(e.target.value) })
                }
                className="w-full bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:border-white-500"
              />
            </div>
            <div>
              <label className="block text-sm">Crop X</label>
              <input
                type="number"
                value={mediaFile.crop?.x ?? 0}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, {
                    crop: {
                      ...baseCrop,
                      x: Number(e.target.value),
                    },
                  })
                }
                className="w-full p-2 bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:ring-2 focus:ring-white-500 focus:border-white-500"
              />
            </div>
            <div>
              <label className="block text-sm">Crop Y</label>
              <input
                type="number"
                value={mediaFile.crop?.y ?? 0}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, {
                    crop: {
                      ...baseCrop,
                      y: Number(e.target.value),
                    },
                  })
                }
                className="w-full p-2 bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:ring-2 focus:ring-white-500 focus:border-white-500"
              />
            </div>
            <div>
              <label className="block text-sm">Crop Width</label>
              <input
                type="number"
                value={mediaFile.crop?.width ?? mediaFile.width}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, {
                    crop: {
                      ...baseCrop,
                      width: Number(e.target.value),
                    },
                  })
                }
                className="w-full p-2 bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:ring-2 focus:ring-white-500 focus:border-white-500"
              />
            </div>
            <div>
              <label className="block text-sm">Crop Height</label>
              <input
                type="number"
                value={mediaFile.crop?.height ?? mediaFile.height}
                onChange={(e) =>
                  onUpdateMedia(mediaFile.id, {
                    crop: {
                      ...baseCrop,
                      height: Number(e.target.value),
                    },
                  })
                }
                className="w-full p-2 bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:ring-2 focus:ring-white-500 focus:border-white-500"
              />
            </div>
          </div>
        </div>
        {/* Audio Properties */}
        {(mediaFile.type === "video" || mediaFile.type === "audio") && (
          <div className="space-y-2">
            <h4 className="font-semibold">Audio Properties</h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm mb-2 text-white">Volume</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={mediaFile.volume}
                  onChange={(e) =>
                    onUpdateMedia(mediaFile.id, {
                      volume: Number(e.target.value),
                    })
                  }
                  className="w-full bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:border-white-500"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-white">
                  Playback speed
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={mediaFile.playbackSpeed || 1}
                  onChange={(e) =>
                    onUpdateMedia(mediaFile.id, {
                      playbackSpeed: Number(e.target.value),
                    })
                  }
                  className="w-full bg-darkSurfacePrimary border border-white border-opacity-10 shadow-md text-white rounded focus:outline-none focus:border-white-500"
                />
                <p className="text-xs text-white/60 mt-1">
                  {`${(mediaFile.playbackSpeed || 1).toFixed(1)}x`}
                </p>
              </div>
              {mediaFile.type === "video" && (
                <button
                  type="button"
                  disabled={isExtracting}
                  onClick={handleSeparateAudio}
                  className="w-full rounded-md bg-white text-black py-2 text-sm font-semibold hover:bg-[#dcdcdc] disabled:opacity-60"
                >
                  {isExtracting
                    ? "Extracting audio..."
                    : "Separate audio track"}
                </button>
              )}
            </div>
          </div>
        )}
        <div></div>
      </div>
    </div>
  );
}
