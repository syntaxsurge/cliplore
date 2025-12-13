"use client";

import {
  deleteFile,
  useAppSelector,
  getFile,
} from "@/app/store";
import { setMediaFiles, setFilesID } from "@/app/store/slices/projectSlice";
import type { MediaType, UploadedFile } from "@/app/types";
import { useAppDispatch } from "@/app/store";
import AddMedia from "../AddButtons/AddMedia";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Image from "next/image";
import { Image as ImageIcon, Music, Trash2 } from "lucide-react";
import { categorizeFile } from "@/app/utils/utils";

type Props = {
  query?: string;
  typeFilter?: Exclude<MediaType, "unknown">;
};

export default function MediaList({ query = "", typeFilter }: Props) {
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

  const normalizedQuery = query.trim().toLowerCase();
  const filteredFiles = useMemo(() => {
    return files.filter((mediaFile) => {
      if (
        normalizedQuery &&
        !mediaFile.file.name.toLowerCase().includes(normalizedQuery)
      ) {
        return false;
      }
      const kind = categorizeFile(mediaFile.file.type);
      if (typeFilter && kind !== typeFilter) return false;
      return true;
    });
  }, [files, normalizedQuery, typeFilter]);

  return (
    <>
      {filesID?.length ? (
        <div className="space-y-4">
          {filteredFiles.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-white/70">No media matches your filters.</p>
            </div>
          ) : null}

          {filteredFiles.map((mediaFile) => {
            const kind = categorizeFile(mediaFile.file.type);

            return (
              <div
                key={mediaFile.id}
                className="rounded-lg border border-white/10 bg-black/20 p-3 transition-colors hover:bg-black/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <AddMedia fileId={mediaFile.id} />
                    {mediaFile.previewUrl ? (
                      <div className="relative h-10 w-14 overflow-hidden rounded border border-white/10 flex-shrink-0">
                        {kind === "video" ? (
                          <video
                            className="h-full w-full object-cover"
                            src={mediaFile.previewUrl}
                            muted
                            playsInline
                          />
                        ) : kind === "image" ? (
                          <Image
                            unoptimized
                            src={mediaFile.previewUrl}
                            alt={mediaFile.file.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : kind === "audio" ? (
                          <div className="flex h-full w-full items-center justify-center bg-black/40">
                            <Music
                              className="h-4 w-4 text-white/60"
                              aria-hidden="true"
                            />
                          </div>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-black/40">
                            <ImageIcon
                              className="h-4 w-4 text-white/50"
                              aria-hidden="true"
                            />
                          </div>
                        )}
                      </div>
                    ) : null}
                    <span
                      className="py-1 px-1 text-sm flex-1 truncate"
                      title={mediaFile.file.name}
                    >
                      {mediaFile.file.name}
                    </span>
                  </div>
                  <button
                    onClick={() => onDeleteMedia(mediaFile.id)}
                    className="text-red-400 hover:text-red-300 flex-shrink-0 ml-2"
                    aria-label="Delete file"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-white/70">No media imported yet.</p>
          <p className="mt-1 text-xs text-white/50">
            Drag & drop files above to start a library.
          </p>
        </div>
      )}
    </>
  );
}
