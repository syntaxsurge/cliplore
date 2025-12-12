"use client";

import { getFile, useAppDispatch, useAppSelector } from "../../../../store";
import { setMediaFiles } from "../../../../store/slices/projectSlice";
import { storeFile } from "../../../../store";
import { categorizeFile } from "../../../../utils/utils";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

export default function AddMedia({ fileId }: { fileId: string }) {
  const { mediaFiles } = useAppSelector((state) => state.projectState);
  const dispatch = useAppDispatch();

  const handleFileChange = async () => {
    const updatedMedia = [...mediaFiles];

    const file = await getFile(fileId);
    const mediaId = crypto.randomUUID();

    if (fileId) {
      const relevantClips = mediaFiles.filter(
        (clip) => clip.type === categorizeFile(file.type),
      );
      const lastEnd =
        relevantClips.length > 0
          ? Math.max(...relevantClips.map((f) => f.positionEnd))
          : 0;

      updatedMedia.push({
        id: mediaId,
        fileName: file.name,
        fileId: fileId,
        startTime: 0,
        endTime: 30,
        src: URL.createObjectURL(file),
        positionStart: lastEnd,
        positionEnd: lastEnd + 30,
        includeInMerge: true,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        rotation: 0,
        opacity: 100,
        crop: { x: 0, y: 0, width: 1920, height: 1080 },
        playbackSpeed: 1,
        volume: 100,
        type: categorizeFile(file.type),
        zIndex: 0,
      });
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
