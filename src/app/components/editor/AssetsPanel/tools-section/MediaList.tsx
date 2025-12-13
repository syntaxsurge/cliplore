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
import { Film, Image as ImageIcon, Music, Trash2 } from "lucide-react";
import { categorizeFile } from "@/app/utils/utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
            {filteredFiles.map((mediaFile) => {
            const kind = categorizeFile(mediaFile.file.type);

            return (
              <div
                key={mediaFile.id}
                className="group overflow-hidden rounded-xl border border-white/10 bg-black/20 transition-colors hover:bg-black/30"
              >
                <div className="relative aspect-video bg-black/30">
                  {mediaFile.previewUrl ? (
                    kind === "video" ? (
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
                        sizes="(max-width: 420px) 100vw, 200px"
                        className="object-cover"
                      />
                    ) : kind === "audio" ? (
                      <div className="flex h-full w-full items-center justify-center">
                        <Music className="h-6 w-6 text-white/60" aria-hidden="true" />
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon
                          className="h-6 w-6 text-white/50"
                          aria-hidden="true"
                        />
                      </div>
                    )
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-white/50" aria-hidden="true" />
                    </div>
                  )}

                  <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <AddMedia fileId={mediaFile.id} variant="icon" />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-full bg-black/40 text-red-200 hover:bg-black/60 hover:text-red-100"
                      onClick={() => onDeleteMedia(mediaFile.id)}
                      aria-label={`Delete ${mediaFile.file.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>

                  <div className="absolute left-2 top-2">
                    <div
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/50 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white/70",
                      )}
                    >
                      {kind === "video" ? (
                        <Film className="h-3 w-3" aria-hidden="true" />
                      ) : kind === "image" ? (
                        <ImageIcon className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <Music className="h-3 w-3" aria-hidden="true" />
                      )}
                      {kind}
                    </div>
                  </div>
                </div>

                <div className="space-y-1 p-3">
                  <div
                    className="truncate text-sm font-medium text-white"
                    title={mediaFile.file.name}
                  >
                    {mediaFile.file.name}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
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
