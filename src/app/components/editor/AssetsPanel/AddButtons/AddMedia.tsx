"use client";

import { getFile, useAppDispatch, useAppSelector } from "../../../../store";
import { setMediaFiles } from "../../../../store/slices/projectSlice";
import { categorizeFile } from "../../../../utils/utils";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { createMediaFileFromFile } from "@/lib/media/ingest";

export default function AddMedia({ fileId }: { fileId: string }) {
  const { mediaFiles, resolution, tracks } = useAppSelector(
    (state) => state.projectState,
  );
  const dispatch = useAppDispatch();

  const handleFileChange = async () => {
    const updatedMedia = [...mediaFiles];

    const file = await getFile(fileId);
    if (!file) {
      toast.error("File not found.");
      return;
    }

    if (fileId) {
      const type = categorizeFile(file.type);
      const videoTracks = tracks.filter((t) => t.kind === "video");
      const audioTracks = tracks.filter((t) => t.kind === "audio");
      const mainVideoTrackId = videoTracks[0]?.id ?? null;
      const overlayVideoTrackId = videoTracks[1]?.id ?? mainVideoTrackId;
      const mainAudioTrackId = audioTracks[0]?.id ?? mainVideoTrackId;

      const targetTrackId =
        type === "audio"
          ? mainAudioTrackId
          : type === "image"
            ? overlayVideoTrackId
            : mainVideoTrackId;

      const relevantClips = mediaFiles.filter(
        (clip) => (clip.trackId ?? null) === targetTrackId,
      );
      const lastEnd =
        relevantClips.length > 0
          ? Math.max(...relevantClips.map((f) => f.positionEnd))
          : 0;

      const src = URL.createObjectURL(file);
      const defaultDurationSeconds = type === "image" ? 5 : 30;
      const mediaClip = await createMediaFileFromFile({
        file,
        fileId,
        src,
        positionStart: lastEnd,
        frame: {
          width: resolution?.width ?? 1920,
          height: resolution?.height ?? 1080,
        },
        trackId: targetTrackId ?? undefined,
        defaultDurationSeconds,
      });

      updatedMedia.push(mediaClip);
    }
    dispatch(setMediaFiles(updatedMedia));
    toast.success("Media added successfully.");
  };

  return (
    <button
      type="button"
      onClick={handleFileChange}
      className="inline-flex items-center justify-center rounded-full bg-white px-2 py-2 text-gray-900 transition-colors hover:bg-[#ccc]"
      aria-label="Add media to timeline"
    >
      <Plus className="h-4 w-4" />
    </button>
  );
}
