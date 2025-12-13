"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getProject } from "@/app/store";
import type { ProjectExport, ProjectPublishRecord, ProjectState } from "@/app/types";
import { getStoryIpaExplorerUrl } from "@/lib/story/explorer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Copy, ExternalLink, Loader2 } from "lucide-react";

type PublishedExport = ProjectExport & { publish: ProjectPublishRecord };

function findPublishedExports(project: ProjectState): PublishedExport[] {
  return project.exports
    .filter((exp): exp is PublishedExport => Boolean(exp.publish?.ipId))
    .sort(
      (a, b) =>
        new Date(b.publish.createdAt).getTime() -
        new Date(a.publish.createdAt).getTime(),
    );
}

export default function IpfiClient({
  projectId,
  initialExportId,
}: {
  projectId: string;
  initialExportId?: string;
}) {
  const [project, setProject] = useState<ProjectState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const loaded = (await getProject(projectId)) as ProjectState | null;
        if (!loaded) {
          setLoadError("Project not found.");
          setProject(null);
          return;
        }
        setProject(loaded);
      } catch (err: any) {
        console.error(err);
        setLoadError(err?.message ?? "Failed to load project.");
        setProject(null);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [projectId]);

  const publishedExports = useMemo(
    () => (project ? findPublishedExports(project) : []),
    [project],
  );

  const [selectedExportId, setSelectedExportId] = useState<string | null>(
    initialExportId ?? null,
  );

  useEffect(() => {
    setSelectedExportId(initialExportId ?? null);
  }, [initialExportId]);

  const selectedPublished = useMemo(() => {
    if (!publishedExports.length) return null;
    if (selectedExportId) {
      const explicit = publishedExports.find((exp) => exp.id === selectedExportId);
      if (explicit) return explicit;
    }
    return publishedExports[0];
  }, [publishedExports, selectedExportId]);

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </CardTitle>
            <CardDescription>Preparing published exports.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle>IPFi</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href={`/projects/${projectId}`}>Back to editor</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedPublished) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle>No published exports yet</CardTitle>
            <CardDescription>
              Publish an export to manage royalties, licensing terms, and files in the asset dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/projects/${projectId}/publish`}>Open publish</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/assets`}>Assets</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const publish = selectedPublished.publish;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon">
              <Link href={`/projects/${projectId}`} aria-label="Back to editor">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">Project</p>
          </div>
          <h1 className="text-4xl font-semibold text-foreground">IPFi</h1>
          <p className="text-muted-foreground">
            Manage published Story IP assets from the asset dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success">Published</Badge>
          <Button size="sm" asChild>
            <Link href={`/assets/${publish.ipId}?tab=royalties`}>
              Open asset dashboard
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Published export</CardTitle>
          <CardDescription>Select which published export to manage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="publishedExport">Published export</Label>
            <select
              id="publishedExport"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedPublished.id}
              onChange={(e) => setSelectedExportId(e.target.value)}
            >
              {publishedExports.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.name} · {new Date(exp.publish.createdAt).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {publish.videoUrl ? (
            <video
              src={publish.videoUrl}
              controls
              className="w-full rounded-lg border border-border bg-black"
            />
          ) : null}

          <div className="space-y-2">
            <Label>IP ID</Label>
            <div className="flex items-center gap-2">
              <Input readOnly value={publish.ipId} />
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Copy IP ID"
                onClick={() => void handleCopy(publish.ipId)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button asChild type="button" size="icon" variant="outline" aria-label="Open in explorer">
                <a href={getStoryIpaExplorerUrl({ ipId: publish.ipId })} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href={`/ip/${publish.ipId}`}>Public page</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/assets/${publish.ipId}?tab=royalties`}>Royalties</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/assets/${publish.ipId}?tab=files`}>Files</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

