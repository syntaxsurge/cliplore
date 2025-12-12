"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useAccount } from "wagmi";
import { PILFlavor } from "@story-protocol/core-sdk";
import { parseEther, zeroAddress } from "viem";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useStoryClient } from "@/lib/story/useStoryClient";
import { clientEnv } from "@/lib/env/client";
import { uploadIpMetadataAction } from "@/lib/story/actions/upload-ip-metadata";
import { LICENSE_PRESETS, type LicensePreset } from "@/lib/story/license-presets";
import { createConvexIpAsset, fetchConvexUser } from "@/lib/api/convex";
import { getFile, getProject, storeProject, useAppDispatch, useAppSelector } from "@/app/store";
import { rehydrate } from "@/app/store/slices/projectSlice";
import { setCurrentProject, updateProject } from "@/app/store/slices/projectsSlice";
import { ipfsUriToGatewayUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Copy, ExternalLink, Loader2, Upload } from "lucide-react";
import { RoyaltiesPanel } from "./RoyaltiesPanel";

type PinnedFile = {
  ipfsUri: string;
  gatewayUrl: string;
};

async function pinFileToIpfs(file: File, name?: string): Promise<PinnedFile> {
  const body = new FormData();
  body.append("file", file);
  if (name) body.append("name", name);

  const res = await fetch("/api/ipfs/pin-file", { method: "POST", body });
  const data = (await res.json()) as
    | { ipfsUri: string; gatewayUrl: string }
    | { error: string };
  if (!res.ok || "error" in data) {
    throw new Error("error" in data ? data.error : "Failed to pin file to IPFS");
  }
  return data;
}

const LICENSE_PRESET_ORDER: LicensePreset[] = [
  "commercial-5",
  "commercial-10",
  "noncommercial",
];

export default function PublishClient({
  projectId,
  initialExportId,
}: {
  projectId: string;
  initialExportId?: string;
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const projectState = useAppSelector((state) => state.projectState);
  const exports = projectState.exports;
  const { address, isConnected } = useAccount();
  const { getClient } = useStoryClient();

  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const sortedExports = useMemo(
    () =>
      [...exports].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [exports],
  );

  const [selectedExportId, setSelectedExportId] = useState<string | null>(null);
  const selectedExport = useMemo(
    () => sortedExports.find((exp) => exp.id === selectedExportId) ?? null,
    [sortedExports, selectedExportId],
  );

  const [exportFile, setExportFile] = useState<File | null>(null);
  const [exportPreviewUrl, setExportPreviewUrl] = useState<string | null>(null);

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(
    null,
  );

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [licensePreset, setLicensePreset] = useState<LicensePreset>(
    LICENSE_PRESET_ORDER[0],
  );

  const [status, setStatus] = useState<
    "idle" | "uploading" | "registering" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const videoRef = useRef<HTMLVideoElement>(null);

  const isSpgConfigured =
    (clientEnv.NEXT_PUBLIC_SPG_NFT_CONTRACT_ADDRESS as string) !== zeroAddress;
  const isWipConfigured =
    (clientEnv.NEXT_PUBLIC_WIP_TOKEN_ADDRESS as string) !== zeroAddress;

  useEffect(() => {
    let mounted = true;

    const loadProject = async () => {
      setIsLoadingProject(true);
      setLoadError(null);
      try {
        const project = await getProject(projectId);
        if (!project) {
          setLoadError("Project not found.");
          return;
        }

        dispatch(setCurrentProject(projectId));
        dispatch(rehydrate(project));

        if (mounted) {
          setTitle(project.projectName || "Untitled export");
        }
      } catch (err) {
        console.error(err);
        setLoadError("Failed to load project.");
      } finally {
        setIsLoadingProject(false);
      }
    };

    loadProject();
    return () => {
      mounted = false;
    };
  }, [dispatch, projectId]);

  useEffect(() => {
    if (!sortedExports.length) {
      setSelectedExportId(null);
      return;
    }

    const preferred =
      (initialExportId &&
        sortedExports.some((exp) => exp.id === initialExportId) &&
        initialExportId) ||
      sortedExports[0].id;

    setSelectedExportId((prev) => prev ?? preferred);
  }, [initialExportId, sortedExports]);

  useEffect(() => {
    let mounted = true;
    let nextUrl: string | null = null;

    const loadExportFile = async () => {
      setExportFile(null);
      setExportPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });

      if (!selectedExport) return;

      const file = await getFile(selectedExport.fileId);
      if (!mounted) return;

      if (!file) {
        setMessage("Export file missing. Re-export from the editor.");
        setStatus("error");
        return;
      }

      nextUrl = URL.createObjectURL(file);
      setExportFile(file);
      setExportPreviewUrl(nextUrl);
      setStatus("idle");
      setMessage(null);
    };

    loadExportFile().catch((err) => {
      console.error(err);
      setStatus("error");
      setMessage("Failed to load export file.");
    });

    return () => {
      mounted = false;
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [selectedExport]);

  useEffect(() => {
    if (!isConnected || !address) return;

    startTransition(async () => {
      try {
        const { user } = await fetchConvexUser(address);
        const preset = user?.defaultLicensePreset as LicensePreset | undefined;
        if (preset && preset in LICENSE_PRESETS) {
          setLicensePreset(preset);
        }
      } catch {
        // ignore
      }
    });
  }, [address, isConnected]);

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleGenerateThumbnail = async () => {
    if (!exportPreviewUrl) {
      toast.error("Select an export first.");
      return;
    }

    try {
      const video = document.createElement("video");
      video.src = exportPreviewUrl;
      video.muted = true;
      video.playsInline = true;
      await new Promise<void>((resolve, reject) => {
        const onLoaded = () => resolve();
        const onError = () => reject(new Error("Failed to load video"));
        video.addEventListener("loadeddata", onLoaded, { once: true });
        video.addEventListener("error", onError, { once: true });
      });

      const t = Math.min(0.1, Number.isFinite(video.duration) ? video.duration : 0.1);
      video.currentTime = t;
      await new Promise<void>((resolve) => {
        video.addEventListener("seeked", () => resolve(), { once: true });
      });

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context missing");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Thumbnail encoding failed"))),
          "image/png",
          0.92,
        );
      });

      const file = new File([blob], `${title || "thumbnail"}.png`, {
        type: "image/png",
      });

      setThumbnailFile(file);
      setThumbnailPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });

      toast.success("Thumbnail generated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate thumbnail");
    }
  };

  const handleSelectThumbnailFile = (file: File | null) => {
    setThumbnailFile(file);
    setThumbnailPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!selectedExport || !selectedExportId) {
      setStatus("error");
      setMessage("Select an export to publish.");
      return;
    }
    if (!exportFile) {
      setStatus("error");
      setMessage("Export file missing. Re-export from the editor.");
      return;
    }
    if (!isConnected || !address) {
      setStatus("error");
      setMessage("Connect your wallet to publish.");
      return;
    }
    if (!isSpgConfigured) {
      setStatus("error");
      setMessage("Set NEXT_PUBLIC_SPG_NFT_CONTRACT_ADDRESS to publish.");
      return;
    }
    if (!isWipConfigured) {
      setStatus("error");
      setMessage("Set NEXT_PUBLIC_WIP_TOKEN_ADDRESS to publish.");
      return;
    }
    if (!title.trim() || title.trim().length < 3) {
      setStatus("error");
      setMessage("Title must be at least 3 characters.");
      return;
    }
    if (!summary.trim() || summary.trim().length < 5) {
      setStatus("error");
      setMessage("Description must be at least 5 characters.");
      return;
    }

    try {
      setStatus("uploading");
      setMessage("Uploading export to IPFS…");

      const [videoPin, thumbPin] = await Promise.all([
        pinFileToIpfs(exportFile, exportFile.name),
        thumbnailFile ? pinFileToIpfs(thumbnailFile, thumbnailFile.name) : null,
      ]);

      setMessage("Uploading Story metadata to IPFS…");
      const meta = await uploadIpMetadataAction({
        title: title.trim(),
        description: summary.trim(),
        videoUri: videoPin.ipfsUri,
        thumbnailUri: thumbPin?.ipfsUri,
      });

      setStatus("registering");
      setMessage("Registering IP Asset on Story…");

      const client = await getClient();
      const preset = LICENSE_PRESETS[licensePreset];
      const terms =
        preset.share && preset.share > 0
          ? PILFlavor.commercialRemix({
              commercialRevShare: preset.share,
              defaultMintingFee: parseEther(preset.fee ?? "1"),
              currency: clientEnv.NEXT_PUBLIC_WIP_TOKEN_ADDRESS as `0x${string}`,
            })
          : PILFlavor.nonCommercialSocialRemixing();

      const res = await client.ipAsset.registerIpAsset({
        nft: {
          type: "mint",
          spgNftContract:
            clientEnv.NEXT_PUBLIC_SPG_NFT_CONTRACT_ADDRESS as `0x${string}`,
        },
        ipMetadata: {
          ipMetadataURI: meta.ipMetadataUri,
          ipMetadataHash: meta.ipMetadataHash,
          nftMetadataURI: meta.nftMetadataUri,
          nftMetadataHash: meta.nftMetadataHash,
        },
        licenseTermsData: [
          {
            terms,
          },
        ],
      });

      const ipId = (res.ipId as string | undefined) ?? null;
      if (!ipId) {
        throw new Error("Story registration returned no ipId.");
      }

      const licenseTermsId =
        (res.licenseTermsIds && res.licenseTermsIds[0]?.toString()) ?? undefined;
      const txHash = (res as any).txHash as string | undefined;

      const publishRecord = {
        ipId,
        licenseTermsId,
        txHash,
        title: title.trim(),
        summary: summary.trim(),
        terms: preset.label,
        video: videoPin,
        thumbnail: thumbPin ?? undefined,
        ipMetadataUri: meta.ipMetadataUri,
        nftMetadataUri: meta.nftMetadataUri,
        createdAt: new Date().toISOString(),
      };

      const nextProject = {
        ...projectState,
        lastModified: new Date().toISOString(),
        exports: projectState.exports.map((exp) =>
          exp.id === selectedExportId ? { ...exp, publish: publishRecord } : exp,
        ),
      };

      await storeProject(nextProject);
      dispatch(rehydrate(nextProject));
      dispatch(updateProject(nextProject));

      try {
        await createConvexIpAsset({
          wallet: address,
          localProjectId: projectId,
          ipId,
          title: publishRecord.title,
          summary: publishRecord.summary,
          terms: publishRecord.terms,
          videoUrl: publishRecord.video.gatewayUrl,
          thumbnailUrl: publishRecord.thumbnail?.gatewayUrl,
          licenseTermsId,
          txHash,
        });
      } catch (err) {
        console.debug("Convex IP asset sync failed", err);
      }

      setStatus("success");
      setMessage("Published to Story Protocol.");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err?.message ?? "Publish failed.");
    }
  };

  const published = selectedExport?.publish ?? null;

  if (isLoadingProject) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Loading project…</CardTitle>
            <CardDescription>Preparing your exports for publishing.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Publish</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href="/projects">Back to projects</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <h1 className="text-4xl font-semibold text-foreground">Publish</h1>
          <p className="text-muted-foreground">
            Export first, then register your final cut as a Story IP Asset with attached
            license terms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {published?.ipId ? (
            <>
              <Badge variant="success">Published</Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(published.ipId)}
              >
                <Copy className="h-4 w-4" />
                Copy IP ID
              </Button>
              <Button size="sm" asChild>
                <a
                  href={`https://explorer.story.foundation/ip-assets/${published.ipId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Story Explorer
                </a>
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {sortedExports.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No exports yet</CardTitle>
            <CardDescription>
              Render an export in the editor before publishing.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/projects/${projectId}`}>Go to editor</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/projects">Projects</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Select an export</CardTitle>
              <CardDescription>
                Publishing always references a specific exported artifact.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sortedExports.map((exp) => (
                <label
                  key={exp.id}
                  className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border bg-card px-3 py-3 text-sm hover:bg-muted/40"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{exp.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(exp.createdAt).toLocaleString()} ·{" "}
                      {Math.max(0, Math.round(exp.durationSeconds))}s ·{" "}
                      {formatBytes(exp.fileSizeBytes)}
                    </p>
                    {exp.publish?.ipId ? (
                      <Badge variant="success">Published</Badge>
                    ) : null}
                  </div>
                  <input
                    type="radio"
                    name="export"
                    className="mt-1 h-4 w-4"
                    checked={exp.id === selectedExportId}
                    onChange={() => {
                      setSelectedExportId(exp.id);
                      router.replace(`/projects/${projectId}/publish?exportId=${encodeURIComponent(exp.id)}`);
                    }}
                    aria-label={`Select export ${exp.name}`}
                  />
                </label>
              ))}
            </CardContent>
          </Card>

          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Export preview</CardTitle>
                <CardDescription>
                  Confirm this is the final cut you want to register.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {exportPreviewUrl ? (
                  <video
                    ref={videoRef}
                    src={exportPreviewUrl}
                    controls
                    className="w-full rounded-xl border border-border bg-black"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select an export to preview it.
                  </p>
                )}
              </CardContent>
            </Card>

            <form onSubmit={(e) => startTransition(() => handlePublish(e))}>
              <Card>
                <CardHeader>
                  <CardTitle>Publish details</CardTitle>
                  <CardDescription>
                    Upload to IPFS, attach license terms, and register on Story.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Neon courier edit"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="license">License preset</Label>
                      <select
                        id="license"
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        value={licensePreset}
                        onChange={(e) =>
                          setLicensePreset(e.target.value as LicensePreset)
                        }
                      >
                        {LICENSE_PRESET_ORDER.map((preset) => (
                          <option key={preset} value={preset} className="text-black">
                            {LICENSE_PRESETS[preset].label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="summary">Description</Label>
                    <Textarea
                      id="summary"
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="Short summary of this cut and what remixers can do."
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          Thumbnail (optional)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Used for Story metadata and marketplace previews.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => void handleGenerateThumbnail()}
                          disabled={!exportPreviewUrl}
                        >
                          Generate
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelectThumbnailFile(null)}
                          disabled={!thumbnailFile}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="thumbnailFile">Upload thumbnail</Label>
                        <Input
                          id="thumbnailFile"
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleSelectThumbnailFile(e.target.files?.[0] ?? null)
                          }
                        />
                      </div>

                      {thumbnailPreviewUrl ? (
                        <div className="space-y-2">
                          <Label>Preview</Label>
                          <div className="relative h-24 w-full overflow-hidden rounded-lg border border-border">
                            <Image
                              src={thumbnailPreviewUrl}
                              alt="Thumbnail preview"
                              fill
                              unoptimized
                              sizes="(max-width: 640px) 100vw, 50vw"
                              className="object-cover"
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-4">
                    <p className="text-sm font-medium text-foreground">
                      Readiness checks
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>
                        Wallet:{" "}
                        <span className="text-foreground">
                          {isConnected && address ? "Connected" : "Not connected"}
                        </span>
                      </li>
                      <li>
                        SPG NFT contract:{" "}
                        <span className="text-foreground">
                          {isSpgConfigured ? "Configured" : "Missing"}
                        </span>
                      </li>
                      <li>
                        WIP token address:{" "}
                        <span className="text-foreground">
                          {isWipConfigured ? "Configured" : "Missing"}
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Status:{" "}
                        <span className="font-semibold text-foreground">
                          {status === "idle" && "Ready"}
                          {status === "uploading" && "Uploading"}
                          {status === "registering" && "Registering"}
                          {status === "success" && "Published"}
                          {status === "error" && "Error"}
                        </span>
                      </p>
                      {message ? (
                        <p
                          className={`text-sm ${
                            status === "error"
                              ? "text-destructive"
                              : "text-emerald-600 dark:text-emerald-300"
                          }`}
                        >
                          {message}
                        </p>
                      ) : null}
                      {published?.ipId ? (
                        <p className="text-xs text-muted-foreground">
                          Video gateway URL:{" "}
                          <a
                            className="underline"
                            href={ipfsUriToGatewayUrl(published.video.ipfsUri)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open
                          </a>
                        </p>
                      ) : null}
                    </div>

                    <Button
                      type="submit"
                      className="min-w-[220px]"
                      disabled={
                        isPending ||
                        status === "uploading" ||
                        status === "registering" ||
                        !selectedExport ||
                        !exportFile ||
                        !!published?.ipId
                      }
                    >
                      <Upload className="h-4 w-4" />
                      {status === "uploading"
                        ? "Uploading…"
                        : status === "registering"
                          ? "Registering…"
                          : published?.ipId
                            ? "Published"
                            : "Upload & Register"}
                    </Button>
                  </div>

                  {published?.ipId ? (
                    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        Next steps
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" asChild>
                          <Link href={`/ip/${published.ipId}`}>
                            View marketplace page
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopy(published.ipId)}
                        >
                          <Copy className="h-4 w-4" />
                          Copy IP ID
                        </Button>
                        <Button size="sm" asChild>
                          <a
                            href={`https://explorer.story.foundation/ip-assets/${published.ipId}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Story Explorer
                          </a>
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </form>

            {published?.ipId ? <RoyaltiesPanel ipId={published.ipId} /> : null}
          </div>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}
