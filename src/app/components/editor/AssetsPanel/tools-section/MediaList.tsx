"use client";

import {
  listFiles,
  deleteFile,
  useAppSelector,
  storeFile,
  getFile,
} from "@/app/store";
import { setMediaFiles, setFilesID } from "@/app/store/slices/projectSlice";
import { MediaFile, UploadedFile } from "@/app/types";
import { useAppDispatch } from "@/app/store";
import AddMedia from "../AddButtons/AddMedia";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Image from "next/image";
import { Trash2 } from "lucide-react";
export default function MediaList() {
  const { mediaFiles, filesID } = useAppSelector((state) => state.projectState);
  const dispatch = useAppDispatch();
  const [files, setFiles] = useState<
    (UploadedFile & { previewUrl?: string })[]
  >([]);

  useEffect(() => {
    let mounted = true;

    const previewUrls: string[] = [];

    const fetchFiles = async () => {
      try {
        const storedFilesArray: (UploadedFile & { previewUrl?: string })[] = [];

        for (const fileId of filesID || []) {
          const file = await getFile(fileId);
          if (file && mounted) {
            const previewUrl = URL.createObjectURL(file);
            previewUrls.push(previewUrl);
            storedFilesArray.push({
              file: file,
              id: fileId,
              previewUrl,
            });
          }
        }

        if (mounted) {
          setFiles(storedFilesArray);
        }
      } catch (error) {
        toast.error("Error fetching files");
        console.error("Error fetching files:", error);
      }
    };

    fetchFiles();

    // Cleanup
    return () => {
      mounted = false;
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [filesID]);

  const onDeleteMedia = async (id: string) => {
    const onUpdateMedia = mediaFiles.filter((f) => f.fileId !== id);
    dispatch(setMediaFiles(onUpdateMedia));
    dispatch(setFilesID(filesID?.filter((f) => f !== id) || []));
    await deleteFile(id);
  };

  return (
    <>
      {files.length > 0 && (
        <div className="space-y-4">
          {files.map((mediaFile) => (
            <div
              key={mediaFile.id}
              className="border border-gray-700 p-3 rounded bg-black bg-opacity-30 hover:bg-opacity-40 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <AddMedia fileId={mediaFile.id} />
                  {mediaFile.previewUrl && (
                    <div className="relative h-10 w-14 overflow-hidden rounded border border-white/10 flex-shrink-0">
                      {mediaFile.file.type.startsWith("video/") ? (
                        <video
                          className="h-full w-full object-cover"
                          src={mediaFile.previewUrl}
                          muted
                          playsInline
                        />
                      ) : (
                        <Image
                          unoptimized
                          src={mediaFile.previewUrl}
                          alt={mediaFile.file.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      )}
                    </div>
                  )}
                  <span
                    className="py-1 px-1 text-sm flex-1 truncate"
                    title={mediaFile.file.name}
                  >
                    {mediaFile.file.name}
                  </span>
                </div>
                <button
                  onClick={() => onDeleteMedia(mediaFile.id)}
                  className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2"
                  aria-label="Delete file"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
