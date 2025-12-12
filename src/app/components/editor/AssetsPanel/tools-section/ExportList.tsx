"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Export from "../../render/Ffmpeg/Export";
import { deleteFile, getFile, useAppDispatch, useAppSelector } from "@/app/store";
import { deleteExport } from "@/app/store/slices/projectSlice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export default function ExportList({ projectId }: { projectId: string }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const exports = useAppSelector((state) => state.projectState.exports);

  const sortedExports = useMemo(
    () =>
      [...exports].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [exports],
  );

  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [missingFiles, setMissingFiles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    const nextUrls: Record<string, string> = {};
    const nextMissing: Record<string, boolean> = {};
    const createdUrls: string[] = [];

    const hydrate = async () => {
      for (const exp of sortedExports) {
        const file = await getFile(exp.fileId);
        if (!mounted) return;
        if (!file) {
          nextMissing[exp.id] = true;
          continue;
        }
        const url = URL.createObjectURL(file);
        createdUrls.push(url);
        nextUrls[exp.id] = url;
      }

      if (!mounted) return;
      setPreviewUrls((prev) => {
        Object.values(prev).forEach((u) => URL.revokeObjectURL(u));
        return nextUrls;
      });
      setMissingFiles(nextMissing);
    };

    hydrate().catch((err) => {
      console.error("Failed to hydrate exports", err);
    });

    return () => {
      mounted = false;
      createdUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [sortedExports]);

  return (
    <div className="flex flex-col gap-6">
      <Export />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Saved exports</h3>
          <Badge variant="outline">{sortedExports.length}</Badge>
        </div>

        {sortedExports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Render an export to publish it to Story Protocol.
          </p>
        ) : (
          <div className="space-y-3">
            {sortedExports.map((exp) => {
              const url = previewUrls[exp.id];
              const isMissing = missingFiles[exp.id];

              return (
                <Card key={exp.id} className="overflow-hidden">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-sm font-semibold">
                      {exp.name}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{new Date(exp.createdAt).toLocaleString()}</span>
                      <span>·</span>
                      <span>{formatBytes(exp.fileSizeBytes)}</span>
                      <span>·</span>
                      <span>{Math.max(0, Math.round(exp.durationSeconds))}s</span>
                      <span>·</span>
                      <span>
                        {exp.config.renderEngine === "gpu" ? "GPU" : "FFmpeg"}
                      </span>
                      {exp.publish?.ipId ? (
                        <>
                          <span>·</span>
                          <Badge variant="success">Published</Badge>
                        </>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isMissing ? (
                      <p className="text-sm text-destructive">
                        Export file missing. Re-export to publish.
                      </p>
                    ) : url ? (
                      <video
                        src={url}
                        controls
                        className="w-full rounded-lg border border-border bg-black"
                      />
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isMissing}
                        onClick={() => {
                          const exportQuery = `?exportId=${encodeURIComponent(exp.id)}`;
                          router.push(`/projects/${projectId}/publish${exportQuery}`);
                        }}
                      >
                        <Upload className="h-4 w-4" />
                        {exp.publish?.ipId ? "View publish" : "Publish"}
                      </Button>

                      {url ? (
                        <Button size="sm" variant="outline" asChild>
                          <a href={url} download={exp.name}>
                            <Download className="h-4 w-4" />
                            Download
                          </a>
                        </Button>
                      ) : null}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          dispatch(deleteExport(exp.id));
                          try {
                            await deleteFile(exp.fileId);
                          } catch (err) {
                            console.error("Failed to delete export file", err);
                          }
                          toast.success("Export deleted");
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
