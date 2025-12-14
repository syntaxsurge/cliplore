"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useAccount } from "wagmi";
import { PILFlavor } from "@story-protocol/core-sdk";
import { parseEther, sha256, zeroAddress } from "viem";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useStoryClient } from "@/lib/story/useStoryClient";
import { getStoryIpaExplorerUrl } from "@/lib/story/explorer";
import { clientEnv } from "@/lib/env/client";
import { uploadIpMetadataAction } from "@/lib/story/actions/upload-ip-metadata";
import { LICENSE_PRESETS, type LicensePreset } from "@/lib/story/license-presets";
import { fetchConvexUser, upsertConvexIpAsset } from "@/lib/api/convex";
import { getFile, getProject, storeProject, useAppDispatch, useAppSelector } from "@/app/store";
import { rehydrate } from "@/app/store/slices/projectSlice";
import { setCurrentProject, updateProject } from "@/app/store/slices/projectsSlice";
import { uploadFileToB2 } from "@/lib/storage/upload-client";
import { formatBytes, ipfsUriToGatewayUrl } from "@/lib/utils";
import { formatTime } from "@/app/utils/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  ExternalLink,
  Globe,
  LayoutDashboard,
  Loader2,
  Upload,
} from "lucide-react";

const LICENSE_PRESET_ORDER: LicensePreset[] = [
  "commercial-5",
  "commercial-10",
  "noncommercial",
];

type UploadProgressState = {
  stage: "video" | "thumbnail";
  uploadedBytes: number;
  totalBytes: number;
  partNumber: number;
  totalParts: number;
};

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
  const client = useStoryClient();

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
  const [thumbnailScrubPreviewUrl, setThumbnailScrubPreviewUrl] = useState<string | null>(
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
  const [marketplaceSyncStatus, setMarketplaceSyncStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");
  const [marketplaceSyncMessage, setMarketplaceSyncMessage] = useState<
    string | null
  >(null);
  const [, startTransition] = useTransition();
  const [uploadProgress, setUploadProgress] =
    useState<UploadProgressState | null>(null);
  const [thumbnailTimestamp, setThumbnailTimestamp] = useState(0.1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubCaptureInFlightRef = useRef(false);
  const scrubCaptureScheduledRef = useRef(false);
  const publishInFlightRef = useRef(false);
  const uploadOnlyInFlightRef = useRef(false);
  const marketplaceSyncInFlightRef = useRef(false);

  const [creatorName, setCreatorName] = useState<string>("");

  const exportDurationSeconds = useMemo(() => {
    const fromExport =
      typeof selectedExport?.durationSeconds === "number" &&
      Number.isFinite(selectedExport.durationSeconds) &&
      selectedExport.durationSeconds > 0
        ? selectedExport.durationSeconds
        : 0;
    const fromVideo =
      typeof videoRef.current?.duration === "number" &&
      Number.isFinite(videoRef.current.duration) &&
      videoRef.current.duration > 0
        ? videoRef.current.duration
        : 0;
    return Math.max(fromExport, fromVideo);
  }, [selectedExport]);

  const updateThumbnailScrubPreview = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !exportPreviewUrl) return;
    if (scrubCaptureInFlightRef.current) return;

    scrubCaptureInFlightRef.current = true;
    try {
      if (video.readyState < 2) return;
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) return;

      const maxWidth = 420;
      const scale = Math.min(1, maxWidth / width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.86);
      });
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      setThumbnailScrubPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } finally {
      scrubCaptureInFlightRef.current = false;
    }
  }, [exportPreviewUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !exportPreviewUrl) return;

    const schedule = () => {
      if (scrubCaptureScheduledRef.current) return;
      scrubCaptureScheduledRef.current = true;
      requestAnimationFrame(() => {
        scrubCaptureScheduledRef.current = false;
        void updateThumbnailScrubPreview();
      });
    };

    video.addEventListener("seeked", schedule);
    video.addEventListener("loadeddata", schedule);
    video.addEventListener("loadedmetadata", schedule);
    schedule();

    return () => {
      video.removeEventListener("seeked", schedule);
      video.removeEventListener("loadeddata", schedule);
      video.removeEventListener("loadedmetadata", schedule);
    };
  }, [exportPreviewUrl, updateThumbnailScrubPreview]);

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
      setUploadProgress(null);
      setThumbnailTimestamp(0.1);
      setThumbnailFile(null);
      setThumbnailPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setThumbnailScrubPreviewUrl((prev) => {
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
        if (user?.displayName) {
          setCreatorName(user.displayName);
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

  const handleRetryMarketplaceSync = async () => {
    if (!selectedExport?.publish?.ipId) return;
    if (!address) {
      toast.error("Connect your wallet to sync the marketplace listing.");
      return;
    }
    if (marketplaceSyncInFlightRef.current) return;
    marketplaceSyncInFlightRef.current = true;

    setMarketplaceSyncStatus("syncing");
    setMarketplaceSyncMessage("Syncing listing to marketplace…");
    try {
      await upsertConvexIpAsset({
        wallet: address,
        localProjectId: projectId,
        projectTitle: projectState.projectName,
        ipId: selectedExport.publish.ipId,
        title: selectedExport.publish.title,
        summary: selectedExport.publish.summary,
        terms: selectedExport.publish.terms,
        videoUrl: selectedExport.publish.videoUrl,
        thumbnailUrl: selectedExport.publish.thumbnailUrl,
        licenseTermsId: selectedExport.publish.licenseTermsId,
        txHash: selectedExport.publish.txHash,
        chainId: clientEnv.NEXT_PUBLIC_STORY_CHAIN_ID,
        ipMetadataUri: selectedExport.publish.ipMetadataUri,
        ipMetadataHash: selectedExport.publish.ipMetadataHash,
        nftMetadataUri: selectedExport.publish.nftMetadataUri,
        nftMetadataHash: selectedExport.publish.nftMetadataHash,
        videoKey: selectedExport.publish.videoKey,
        thumbnailKey: selectedExport.publish.thumbnailKey,
        videoSha256: selectedExport.publish.videoSha256,
        thumbnailSha256: selectedExport.publish.thumbnailSha256,
      });
      setMarketplaceSyncStatus("success");
      setMarketplaceSyncMessage(null);
      toast.success("Marketplace synced");
    } catch (err: any) {
      console.error(err);
      setMarketplaceSyncStatus("error");
      setMarketplaceSyncMessage(err?.message ?? "Marketplace sync failed.");
    } finally {
      marketplaceSyncInFlightRef.current = false;
    }
  };

  const handleGenerateThumbnail = async (timeOverride?: number) => {
    if (!exportPreviewUrl) {
      toast.error("Select an export first.");
      return;
	    }

	    try {
	      const desired =
	        typeof timeOverride === "number" && Number.isFinite(timeOverride)
	          ? timeOverride
	        : Number.isFinite(thumbnailTimestamp)
	          ? thumbnailTimestamp
	          : 0.1;

      const existingVideo = videoRef.current;
      const video =
        existingVideo && existingVideo.src === exportPreviewUrl ? existingVideo : null;

      const capture = async (el: HTMLVideoElement) => {
        if (Number.isFinite(el.duration) && el.duration > 0) {
          const t = Math.max(0, Math.min(desired, el.duration));
          el.pause();
          if (!Number.isFinite(el.currentTime) || Math.abs(el.currentTime - t) > 0.01) {
            el.currentTime = t;
            await new Promise<void>((resolve) => {
              el.addEventListener("seeked", () => resolve(), { once: true });
            });
          }
          setThumbnailTimestamp(t);
        }

        const canvas = document.createElement("canvas");
        canvas.width = el.videoWidth || 1280;
        canvas.height = el.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context missing");
        ctx.drawImage(el, 0, 0, canvas.width, canvas.height);

        return await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Thumbnail encoding failed"))),
            "image/png",
            0.92,
          );
        });
      };

      const blob = video
        ? await capture(video)
        : await (async () => {
            const temp = document.createElement("video");
            temp.src = exportPreviewUrl;
            temp.muted = true;
            temp.playsInline = true;
            await new Promise<void>((resolve, reject) => {
              const onLoaded = () => resolve();
              const onError = () => reject(new Error("Failed to load video"));
              temp.addEventListener("loadeddata", onLoaded, { once: true });
              temp.addEventListener("error", onError, { once: true });
            });
            try {
              return await capture(temp);
            } finally {
              temp.removeAttribute("src");
              temp.load();
            }
          })();

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

  const uploadAssetsToB2 = async () => {
    setStatus("uploading");
    setMessage("Uploading export to Backblaze…");

    const wallet = address as `0x${string}`;
    const existingUpload = selectedExport?.upload ?? null;
    let baseProject = projectState;

    const videoUpload =
      existingUpload?.videoUrl && existingUpload.videoKey
        ? { url: existingUpload.videoUrl, key: existingUpload.videoKey }
        : await uploadFileToB2({
            wallet,
            scope: { scope: "export", projectId, exportId: selectedExportId as string },
            kind: "video",
            file: exportFile as File,
            onProgress: (progress) => {
              setUploadProgress({ stage: "video", ...progress });
            },
          });

    const thumbnailUpload = thumbnailFile
      ? await uploadFileToB2({
          wallet,
          scope: { scope: "export", projectId, exportId: selectedExportId as string },
          kind: "thumbnail",
          file: thumbnailFile,
          onProgress: (progress) => {
            setUploadProgress({ stage: "thumbnail", ...progress });
          },
        })
      : existingUpload?.thumbnailUrl && existingUpload.thumbnailKey
        ? { url: existingUpload.thumbnailUrl, key: existingUpload.thumbnailKey }
        : null;

    const nextUploadRecord = {
      videoUrl: videoUpload.url,
      videoKey: videoUpload.key,
      thumbnailUrl: thumbnailUpload?.url,
      thumbnailKey: thumbnailUpload?.key,
      uploadedAt: existingUpload?.uploadedAt ?? new Date().toISOString(),
    };

    if (
      !existingUpload ||
      existingUpload.videoUrl !== nextUploadRecord.videoUrl ||
      existingUpload.videoKey !== nextUploadRecord.videoKey ||
      existingUpload.thumbnailUrl !== nextUploadRecord.thumbnailUrl ||
      existingUpload.thumbnailKey !== nextUploadRecord.thumbnailKey
    ) {
      const nextProject = {
        ...projectState,
        lastModified: new Date().toISOString(),
        exports: projectState.exports.map((exp) =>
          exp.id === selectedExportId ? { ...exp, upload: nextUploadRecord } : exp,
        ),
      };

      await storeProject(nextProject);
      dispatch(rehydrate(nextProject));
      dispatch(updateProject(nextProject));
      baseProject = nextProject;
    }

    return { baseProject, videoUpload, thumbnailUpload };
  };

  const handleUploadOnly = async () => {
    if (uploadOnlyInFlightRef.current) return;
    uploadOnlyInFlightRef.current = true;
    try {
      setMessage(null);

      if (!selectedExport || !selectedExportId) {
        setStatus("error");
        setMessage("Select an export to upload.");
        return;
      }
      if (!exportFile) {
        setStatus("error");
        setMessage("Export file missing. Re-export from the editor.");
        return;
      }
      if (!isConnected || !address) {
        setStatus("error");
        setMessage("Connect your wallet to upload.");
        return;
      }

      await uploadAssetsToB2();
      setStatus("idle");
      setMessage("Upload complete. Ready to register on Story.");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err?.message ?? "Upload failed.");
    } finally {
      uploadOnlyInFlightRef.current = false;
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (publishInFlightRef.current) return;
    publishInFlightRef.current = true;

    try {
      setMessage(null);
      setMarketplaceSyncStatus("idle");
      setMarketplaceSyncMessage(null);

      if (!selectedExport || !selectedExportId) {
        setStatus("error");
        setMessage("Select an export to publish.");
        return;
      }
      if (selectedExport.publish?.ipId) {
        setStatus("error");
        setMessage("This export is already published.");
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

      const { baseProject, videoUpload, thumbnailUpload } =
        await uploadAssetsToB2();

      if (!thumbnailUpload?.url) {
        setStatus("error");
        setMessage("Add a thumbnail to publish (required for Story Explorer).");
        return;
      }

      let mediaHash: `0x${string}` | undefined;
      try {
        mediaHash = sha256(new Uint8Array(await exportFile.arrayBuffer()));
      } catch (hashErr) {
        console.error(hashErr);
        setStatus("error");
        setMessage(
          "Failed to compute video hash. Re-export the project and try again.",
        );
        return;
      }

      let imageHash: `0x${string}` | undefined;
      try {
        if (thumbnailFile) {
          imageHash = sha256(new Uint8Array(await thumbnailFile.arrayBuffer()));
        } else {
          const res = await fetch(thumbnailUpload.url, { method: "GET" });
          if (!res.ok) {
            throw new Error(`Thumbnail fetch failed: ${res.status}`);
          }
          imageHash = sha256(new Uint8Array(await res.arrayBuffer()));
        }
      } catch (hashErr) {
        console.error(hashErr);
        setStatus("error");
        setMessage(
          "Failed to compute thumbnail hash. Re-select the thumbnail or ensure your storage URL allows cross-origin GET.",
        );
        return;
      }

      setMessage("Uploading Story metadata to IPFS…");
      const meta = await uploadIpMetadataAction({
        title: title.trim(),
        description: summary.trim(),
        creatorAddress: address,
        creatorName: creatorName.trim() || undefined,
        mediaUri: videoUpload.url,
        mediaHash,
        thumbnailUri: thumbnailUpload.url,
        imageHash,
        ipType: "video",
        mediaMimeType: exportFile.type || "video/mp4",
        mediaSizeBytes: exportFile.size,
        mediaDurationSeconds: selectedExport.durationSeconds,
        mediaFps: selectedExport.config.fps,
        mediaResolution: selectedExport.config.resolution,
        thumbnailMimeType: thumbnailFile?.type,
        thumbnailSizeBytes: thumbnailFile?.size,
      });

      setStatus("registering");
      setMessage(
        "Registering IP Asset on Story… You may be prompted for more than one wallet confirmation (approval + registration).",
      );

      if (!client) {
        throw new Error("Wallet client not ready yet. Try again in a moment.");
      }
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
        videoUrl: videoUpload.url,
        thumbnailUrl: thumbnailUpload?.url,
        videoKey: videoUpload.key,
        thumbnailKey: thumbnailUpload?.key,
        videoSha256: mediaHash,
        thumbnailSha256: imageHash,
        ipMetadataUri: meta.ipMetadataUri,
        ipMetadataHash: meta.ipMetadataHash,
        nftMetadataUri: meta.nftMetadataUri,
        nftMetadataHash: meta.nftMetadataHash,
        createdAt: new Date().toISOString(),
      };

      const nextProject = {
        ...baseProject,
        lastModified: new Date().toISOString(),
        exports: baseProject.exports.map((exp) =>
          exp.id === selectedExportId ? { ...exp, publish: publishRecord } : exp,
        ),
      };

      await storeProject(nextProject);
      dispatch(rehydrate(nextProject));
      dispatch(updateProject(nextProject));

      try {
        setMarketplaceSyncStatus("syncing");
        setMarketplaceSyncMessage("Syncing listing to marketplace…");
        await upsertConvexIpAsset({
          wallet: address,
          localProjectId: projectId,
          projectTitle: baseProject.projectName,
          assetKind: "video",
          mediaMimeType: exportFile.type || "video/mp4",
          mediaSizeBytes: exportFile.size,
          ipId,
          title: publishRecord.title,
          summary: publishRecord.summary,
          terms: publishRecord.terms,
          videoUrl: publishRecord.videoUrl,
          thumbnailUrl: publishRecord.thumbnailUrl,
          licenseTermsId,
          txHash,
          chainId: clientEnv.NEXT_PUBLIC_STORY_CHAIN_ID,
          ipMetadataUri: publishRecord.ipMetadataUri,
          ipMetadataHash: publishRecord.ipMetadataHash,
          nftMetadataUri: publishRecord.nftMetadataUri,
          nftMetadataHash: publishRecord.nftMetadataHash,
          videoKey: publishRecord.videoKey,
          thumbnailKey: publishRecord.thumbnailKey,
          videoSha256: publishRecord.videoSha256,
          thumbnailSha256: publishRecord.thumbnailSha256,
        });
        setMarketplaceSyncStatus("success");
        setMarketplaceSyncMessage(null);
      } catch (err) {
        console.debug("Convex IP asset sync failed", err);
        setMarketplaceSyncStatus("error");
        setMarketplaceSyncMessage(
          "Marketplace sync failed. You can retry once Convex is available.",
        );
      }

      setStatus("success");
      setMessage("Published to Story Protocol.");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err?.message ?? "Publish failed.");
    } finally {
      publishInFlightRef.current = false;
    }
  };

  const published = selectedExport?.publish ?? null;
  const hasThumbnail = Boolean(thumbnailFile || selectedExport?.upload?.thumbnailUrl);

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
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-10">
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
            Select an export, set a thumbnail + metadata, then upload and register it as a
            Story IP Asset.
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
                  href={getStoryIpaExplorerUrl({ ipId: published.ipId })}
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
	        <div className="grid gap-6 lg:grid-cols-12">
	          <Card className="lg:col-span-4 lg:sticky lg:top-6 h-fit">
	            <CardHeader>
	              <CardTitle>Exports</CardTitle>
	              <CardDescription>
	                Pick the exported cut you want to register.
	              </CardDescription>
	            </CardHeader>
		            <CardContent className="space-y-3 max-h-[520px] overflow-auto pr-1">
		              {sortedExports.map((exp) => (
		                <label
		                  key={exp.id}
		                  className={`flex cursor-pointer items-start justify-between gap-3 rounded-lg border px-3 py-3 text-sm transition-colors ${
		                    exp.id === selectedExportId
		                      ? "border-emerald-500/40 bg-emerald-500/10 ring-1 ring-emerald-500/20"
		                      : "border-border bg-card hover:bg-muted/40"
		                  }`}
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

	          <div className="lg:col-span-8 space-y-6">
	            <Card>
	              <CardHeader>
			              <CardTitle>Preview & Thumbnail</CardTitle>
			              <CardDescription>
			                  Confirm the final cut and choose a cover frame for Story Explorer.
			              </CardDescription>
		              </CardHeader>
	              <CardContent className="space-y-4">
	                {exportPreviewUrl ? (
	                  <div className="grid gap-4 lg:grid-cols-5">
	                    <div className="lg:col-span-3 space-y-3">
	                      <video
	                        ref={videoRef}
	                        src={exportPreviewUrl}
	                        controls
	                        className="w-full rounded-xl border border-border bg-black"
	                      />
	                      {selectedExport ? (
	                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
	                          <div className="flex flex-wrap items-center gap-2">
	                            <span className="font-medium text-foreground">
	                              {selectedExport.name}
	                            </span>
	                          </div>
	                          <div className="flex flex-wrap items-center gap-2">
	                            <span>{formatBytes(selectedExport.fileSizeBytes)}</span>
	                            <span aria-hidden="true">·</span>
	                            <span>{formatTime(Math.max(0, selectedExport.durationSeconds))}</span>
	                          </div>
	                        </div>
	                      ) : null}
	                    </div>

	                    <div className="lg:col-span-2 space-y-3">
	                      <div className="flex items-start justify-between gap-2">
	                        <div className="space-y-0.5">
	                          <p className="text-sm font-medium text-foreground">
	                            Thumbnail
	                          </p>
		                          <p className="text-xs text-muted-foreground">
		                            Cover image shown on Story Explorer and marketplace.
		                          </p>
		                        </div>
			                        <Badge variant={hasThumbnail ? "success" : "warning"}>
			                          {hasThumbnail ? "Ready" : "Required"}
			                        </Badge>
		                      </div>

	                      <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-muted/30">
	                        {thumbnailPreviewUrl || thumbnailScrubPreviewUrl ? (
	                          <Image
	                            src={(thumbnailScrubPreviewUrl ?? thumbnailPreviewUrl) as string}
	                            alt="Thumbnail preview"
	                            fill
	                            unoptimized
	                            sizes="(max-width: 1024px) 100vw, 320px"
	                            className="object-cover"
	                          />
	                        ) : (
		                          <div className="flex h-full flex-col items-center justify-center gap-1 p-4 text-center text-xs text-muted-foreground">
		                            <p className="font-medium text-foreground/80">
		                              No thumbnail selected
		                            </p>
			                            <p>Scrub to preview a frame, then set it as your thumbnail to publish.</p>
		                          </div>
		                        )}

		                        {thumbnailScrubPreviewUrl ? (
		                          <div className="absolute left-2 top-2 rounded-full border border-border bg-background/80 px-2 py-1 text-[10px] font-medium text-foreground backdrop-blur">
		                            Preview
		                          </div>
		                        ) : thumbnailPreviewUrl ? (
		                          <div className="absolute left-2 top-2 rounded-full border border-border bg-background/80 px-2 py-1 text-[10px] font-medium text-foreground backdrop-blur">
		                            Selected
		                          </div>
		                        ) : null}

	                        {thumbnailPreviewUrl && thumbnailScrubPreviewUrl ? (
	                          <div className="absolute bottom-2 right-2 overflow-hidden rounded-lg border border-border bg-background/70 backdrop-blur">
	                            <div className="relative h-14 w-24">
	                              <Image
	                                src={thumbnailPreviewUrl}
	                                alt="Selected thumbnail"
	                                fill
	                                unoptimized
	                                sizes="96px"
	                                className="object-cover"
	                              />
	                            </div>
		                            <div className="px-2 py-1 text-[10px] font-medium text-foreground/80">
		                              Selected
		                            </div>
		                          </div>
		                        ) : null}
	                      </div>

	                      <div className="space-y-2">
	                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
	                          <span>
	                            {formatTime(Math.max(0, thumbnailTimestamp))} /{" "}
	                            {formatTime(Math.max(0, exportDurationSeconds))}
	                          </span>
	                          <span>{Math.max(0, thumbnailTimestamp).toFixed(2)}s</span>
	                        </div>
	                        <input
	                          type="range"
	                          min={0}
	                          max={Math.max(0.01, exportDurationSeconds)}
	                          step={0.01}
	                          value={Math.min(
	                            Math.max(0, thumbnailTimestamp),
	                            Math.max(0.01, exportDurationSeconds),
	                          )}
	                          onPointerDown={() => {
	                            videoRef.current?.pause();
	                          }}
	                          onChange={(e) => {
	                            const next = Number(e.target.value);
	                            const clamped = Number.isFinite(next) ? Math.max(0, next) : 0;
	                            setThumbnailTimestamp(clamped);
	                            const video = videoRef.current;
	                            if (!video) return;
	                            if (!Number.isFinite(video.duration) || video.duration <= 0) return;
	                            video.currentTime = Math.max(0, Math.min(clamped, video.duration));
	                          }}
	                          className="w-full accent-emerald-500"
	                          aria-label="Thumbnail scrubber"
	                          disabled={!exportPreviewUrl || exportDurationSeconds <= 0}
	                        />
	                      </div>

		                      <div className="flex flex-wrap gap-2">
		                        <Button
		                          type="button"
		                          size="sm"
		                          variant="secondary"
		                          onClick={() => {
		                            const t = videoRef.current?.currentTime;
		                            const captureTime =
		                              typeof t === "number" && Number.isFinite(t) ? t : thumbnailTimestamp;
		                            void handleGenerateThumbnail(captureTime);
		                          }}
		                          disabled={!exportPreviewUrl}
		                        >
		                          Set thumbnail
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
	                    </div>
	                  </div>
	                ) : (
	                  <p className="text-sm text-muted-foreground">
	                    Select an export to preview it.
	                  </p>
	                )}
	              </CardContent>
	            </Card>

	            <form
	              onSubmit={handlePublish}
	              className="space-y-6"
	            >
	              <Card>
	                <CardHeader>
		              <CardTitle>Metadata</CardTitle>
		              <CardDescription>
	                    Title, description, and licensing terms shown on Story.
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
	                </CardContent>
	              </Card>

	              <Card>
	                <CardHeader>
		              <CardTitle>Upload & Register</CardTitle>
		              <CardDescription>
	                    Upload to Backblaze B2, pin metadata to IPFS, and register on Story.
		              </CardDescription>
	                </CardHeader>
	                <CardContent className="space-y-5">
		                  <div className="grid gap-4 lg:grid-cols-2">
		                    <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-4">
		                      <p className="text-sm font-medium text-foreground">Readiness</p>
		                      <ul className="space-y-2 text-sm">
			                        <li className="flex items-center justify-between gap-3">
			                          <span className="text-muted-foreground">Wallet</span>
			                          <Badge
			                            variant={isConnected && address ? "success" : "warning"}
			                            className="px-2 py-0.5 text-[11px] font-semibold"
			                          >
			                            {isConnected && address ? "Connected" : "Connect wallet"}
			                          </Badge>
			                        </li>
			                        <li className="flex items-center justify-between gap-3">
			                          <span className="text-muted-foreground">Thumbnail</span>
			                          <Badge
			                            variant={hasThumbnail ? "success" : "warning"}
			                            className="px-2 py-0.5 text-[11px] font-semibold"
			                          >
			                            {hasThumbnail ? "Ready" : "Required"}
			                          </Badge>
			                        </li>
			                        <li className="flex items-center justify-between gap-3">
			                          <span className="text-muted-foreground">SPG NFT contract</span>
			                          <Badge
			                            variant={isSpgConfigured ? "success" : "warning"}
		                            className="px-2 py-0.5 text-[11px] font-semibold"
		                          >
		                            {isSpgConfigured ? "Configured" : "Missing"}
		                          </Badge>
		                        </li>
		                        <li className="flex items-center justify-between gap-3">
		                          <span className="text-muted-foreground">WIP token</span>
		                          <Badge
		                            variant={isWipConfigured ? "success" : "warning"}
		                            className="px-2 py-0.5 text-[11px] font-semibold"
		                          >
		                            {isWipConfigured ? "Configured" : "Missing"}
		                          </Badge>
		                        </li>
		                      </ul>
		                    </div>

		                    <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-4">
		                      <div className="flex items-start justify-between gap-3">
		                        <p className="text-sm font-medium text-foreground">Status</p>
		                        <Badge
		                          variant={
		                            status === "success"
		                              ? "success"
		                              : status === "uploading" || status === "registering"
		                                ? "warning"
		                                : "outline"
		                          }
		                          className={
		                            status === "error"
		                              ? "px-2 py-0.5 text-[11px] font-semibold border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200"
		                              : "px-2 py-0.5 text-[11px] font-semibold"
		                          }
		                        >
		                          {status === "idle" && "Ready"}
		                          {status === "uploading" && "Uploading"}
		                          {status === "registering" && "Registering"}
		                          {status === "success" && "Published"}
		                          {status === "error" && "Error"}
		                        </Badge>
		                      </div>
		                      {message ? (
		                        <p
		                          className={`text-sm ${
		                            status === "error"
		                              ? "text-destructive"
		                              : status === "success"
		                                ? "text-emerald-600 dark:text-emerald-300"
		                                : "text-muted-foreground"
		                          }`}
		                        >
		                          {message}
		                        </p>
		                      ) : null}

	                      {status === "uploading" && uploadProgress ? (
	                        <div className="space-y-2 pt-1">
	                          <p className="text-xs text-muted-foreground">
	                            Uploading {uploadProgress.stage} ·{" "}
	                            {formatBytes(uploadProgress.uploadedBytes)} /{" "}
	                            {formatBytes(uploadProgress.totalBytes)} · Part{" "}
	                            {uploadProgress.partNumber} / {uploadProgress.totalParts}
	                          </p>
	                          <div
	                            className="h-2 w-full rounded-full bg-muted"
	                            aria-label="Upload progress"
	                            role="progressbar"
	                            aria-valuenow={Math.round(
	                              (uploadProgress.uploadedBytes /
	                                Math.max(1, uploadProgress.totalBytes)) *
	                                100,
	                            )}
	                            aria-valuemin={0}
	                            aria-valuemax={100}
	                          >
	                            <div
	                              className="h-2 rounded-full bg-emerald-500"
	                              style={{
	                                width: `${Math.min(
	                                  100,
	                                  (uploadProgress.uploadedBytes /
	                                    Math.max(1, uploadProgress.totalBytes)) *
	                                    100,
	                                )}%`,
	                              }}
	                            />
	                          </div>
	                        </div>
	                      ) : null}
	                    </div>
	                  </div>

	                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
	                    <Button
	                      type="button"
	                      variant="outline"
	                      disabled={
	                        status === "uploading" ||
	                        status === "registering" ||
	                        !selectedExport ||
	                        !exportFile ||
	                        !!published?.ipId
	                      }
	                      onClick={() => void handleUploadOnly()}
	                    >
	                      Upload only
	                    </Button>
	                    <Button
	                      type="submit"
	                      className="min-w-[220px]"
	                      disabled={
	                        status === "uploading" ||
	                        status === "registering" ||
	                        !hasThumbnail ||
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
	                            : !hasThumbnail
	                              ? "Set thumbnail to publish"
	                              : selectedExport?.upload?.videoUrl
	                                ? "Register on Story"
	                                : "Upload & Register"}
	                    </Button>
	                  </div>

	                  <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-4">
	                    <div className="flex items-center justify-between gap-2">
	                      <p className="text-sm font-medium text-foreground">Storage</p>
	                      <Badge variant="outline">Backblaze B2</Badge>
	                    </div>
	                    {selectedExport?.upload ? (
	                      <div className="space-y-3">
	                        <div className="space-y-2">
	                          <div className="flex flex-wrap items-center justify-between gap-2">
	                            <p className="text-sm text-muted-foreground">Video URL</p>
	                            <div className="flex items-center gap-2">
	                              <Button
	                                type="button"
	                                size="sm"
	                                variant="outline"
	                                onClick={() => void handleCopy(selectedExport.upload!.videoUrl)}
	                              >
	                                <Copy className="h-4 w-4" />
	                                Copy
	                              </Button>
	                              <Button size="sm" asChild>
	                                <a
	                                  href={selectedExport.upload.videoUrl}
	                                  target="_blank"
	                                  rel="noreferrer"
	                                >
	                                  <ExternalLink className="h-4 w-4" />
	                                  Open
	                                </a>
	                              </Button>
	                            </div>
	                          </div>
	                          <p className="break-all text-xs text-foreground/80">
	                            {selectedExport.upload.videoUrl}
	                          </p>
	                        </div>

	                        {selectedExport.upload.thumbnailUrl ? (
	                          <div className="space-y-2">
	                            <div className="flex flex-wrap items-center justify-between gap-2">
	                              <p className="text-sm text-muted-foreground">
	                                Thumbnail URL
	                              </p>
	                              <div className="flex items-center gap-2">
	                                <Button
	                                  type="button"
	                                  size="sm"
	                                  variant="outline"
	                                  onClick={() =>
	                                    void handleCopy(selectedExport.upload!.thumbnailUrl!)
	                                  }
	                                >
	                                  <Copy className="h-4 w-4" />
	                                  Copy
	                                </Button>
	                                <Button size="sm" variant="secondary" asChild>
	                                  <a
	                                    href={selectedExport.upload.thumbnailUrl}
	                                    target="_blank"
	                                    rel="noreferrer"
	                                  >
	                                    <ExternalLink className="h-4 w-4" />
	                                    Open
	                                  </a>
	                                </Button>
	                              </div>
	                            </div>
	                            <p className="break-all text-xs text-foreground/80">
	                              {selectedExport.upload.thumbnailUrl}
	                            </p>
	                          </div>
	                        ) : null}
	                      </div>
	                    ) : (
	                      <p className="text-sm text-muted-foreground">
	                        URLs are generated when you publish. Large exports upload via resumable
	                        multipart to avoid timeouts.
	                      </p>
	                    )}
	                  </div>

	                  {published?.ipMetadataUri ? (
	                    <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-4">
	                      <div className="flex items-center justify-between gap-2">
	                        <p className="text-sm font-medium text-foreground">IPFS metadata</p>
	                        <Badge variant="outline">Pinata</Badge>
	                      </div>
	                      <div className="space-y-4">
	                        <div className="space-y-2">
	                          <div className="flex flex-wrap items-center justify-between gap-2">
	                            <p className="text-sm text-muted-foreground">IP metadata</p>
	                            <div className="flex items-center gap-2">
	                              <Button
	                                type="button"
	                                size="sm"
	                                variant="outline"
	                                onClick={() => void handleCopy(published.ipMetadataUri)}
	                              >
	                                <Copy className="h-4 w-4" />
	                                Copy
	                              </Button>
	                              <Button size="sm" variant="secondary" asChild>
	                                <a
	                                  href={ipfsUriToGatewayUrl(
	                                    published.ipMetadataUri,
	                                    "https://ipfs.io/ipfs/",
	                                  )}
	                                  target="_blank"
	                                  rel="noreferrer"
	                                >
	                                  <ExternalLink className="h-4 w-4" />
	                                  Open
	                                </a>
	                              </Button>
	                            </div>
	                          </div>
	                          <p className="break-all text-xs text-foreground/80">
	                            {published.ipMetadataUri}
	                          </p>
	                          {published.ipMetadataHash ? (
	                            <p className="break-all text-xs text-muted-foreground">
	                              SHA-256: {published.ipMetadataHash}
	                            </p>
	                          ) : null}
	                        </div>

	                        <div className="space-y-2">
	                          <div className="flex flex-wrap items-center justify-between gap-2">
	                            <p className="text-sm text-muted-foreground">NFT metadata</p>
	                            <div className="flex items-center gap-2">
	                              <Button
	                                type="button"
	                                size="sm"
	                                variant="outline"
	                                onClick={() => void handleCopy(published.nftMetadataUri)}
	                              >
	                                <Copy className="h-4 w-4" />
	                                Copy
	                              </Button>
	                              <Button size="sm" variant="secondary" asChild>
	                                <a
	                                  href={ipfsUriToGatewayUrl(
	                                    published.nftMetadataUri,
	                                    "https://ipfs.io/ipfs/",
	                                  )}
	                                  target="_blank"
	                                  rel="noreferrer"
	                                >
	                                  <ExternalLink className="h-4 w-4" />
	                                  Open
	                                </a>
	                              </Button>
	                            </div>
	                          </div>
	                          <p className="break-all text-xs text-foreground/80">
	                            {published.nftMetadataUri}
	                          </p>
	                          {published.nftMetadataHash ? (
	                            <p className="break-all text-xs text-muted-foreground">
	                              SHA-256: {published.nftMetadataHash}
	                            </p>
	                          ) : null}
	                        </div>
	                      </div>
	                    </div>
	                  ) : null}

		                  {published?.ipId ? (
		                    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
		                      <div className="flex flex-wrap items-start justify-between gap-2">
		                        <div className="space-y-1">
		                          <p className="text-sm font-medium text-foreground">
		                            Next steps
		                          </p>
		                          <p className="text-xs text-muted-foreground">
		                            Your IP is live. View it publicly, open the asset dashboard, or copy
		                            identifiers for sharing.
		                          </p>
		                        </div>
		                        <Badge variant="success" className="shrink-0">
		                          Live
		                        </Badge>
		                      </div>

		                      <div className="grid gap-2 sm:grid-cols-2">
		                        <Button
		                          size="sm"
		                          variant="secondary"
		                          asChild
		                          className="w-full justify-between"
		                        >
		                          <Link href={`/ip/${published.ipId}`}>
		                            <span className="flex items-center gap-2">
		                              <Globe className="h-4 w-4" />
		                              View public page
		                            </span>
		                            <ArrowRight className="h-4 w-4" />
		                          </Link>
		                        </Button>
		                        <Button size="sm" asChild className="w-full justify-between">
		                          <Link href={`/assets/${published.ipId}?tab=royalties`}>
		                            <span className="flex items-center gap-2">
		                              <LayoutDashboard className="h-4 w-4" />
		                              Open asset dashboard
		                            </span>
		                            <ArrowRight className="h-4 w-4" />
		                          </Link>
		                        </Button>
		                      </div>

		                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
		                        <div className="min-w-0 space-y-0.5">
		                          <p className="text-[11px] font-medium text-muted-foreground">
		                            IP Asset ID
		                          </p>
		                          <p className="truncate font-mono text-xs text-foreground/90">
		                            {published.ipId}
		                          </p>
		                        </div>
		                        <div className="flex items-center gap-2">
		                          <Button
		                            size="sm"
		                            variant="ghost"
		                            className="h-8 px-2 text-xs"
		                            onClick={() => handleCopy(published.ipId)}
		                          >
		                            <Copy className="h-4 w-4" />
		                            Copy
		                          </Button>
		                          <Button
		                            size="sm"
		                            variant="ghost"
		                            className="h-8 px-2 text-xs"
		                            asChild
		                          >
		                            <a
		                              href={getStoryIpaExplorerUrl({ ipId: published.ipId })}
		                              target="_blank"
		                              rel="noreferrer"
		                            >
		                              <ExternalLink className="h-4 w-4" />
		                              Story Explorer
		                            </a>
		                          </Button>
		                        </div>
		                      </div>

		                      {marketplaceSyncStatus === "syncing" && marketplaceSyncMessage ? (
		                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
		                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
		                          {marketplaceSyncMessage}
		                        </div>
		                      ) : null}

		                      {marketplaceSyncStatus === "error" ? (
		                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-destructive/5 px-3 py-2">
		                          <p className="text-xs text-destructive">
		                            {marketplaceSyncMessage ??
		                              "Marketplace sync failed. You can retry once Convex is available."}
		                          </p>
		                          <Button
		                            size="sm"
		                            variant="outline"
		                            onClick={() => void handleRetryMarketplaceSync()}
		                          >
		                            Retry marketplace sync
		                          </Button>
		                        </div>
		                      ) : null}
		                    </div>
		                  ) : null}
	                </CardContent>
	              </Card>
	            </form>

	          </div>
	        </div>
	      )}
    </div>
  );
}
