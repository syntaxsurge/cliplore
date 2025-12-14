"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useAccount } from "wagmi";
import { parseEther } from "viem";
import { PILFlavor } from "@story-protocol/core-sdk";
import { uploadIpMetadataAction } from "@/lib/story/actions/upload-ip-metadata";
import { createConvexIpAsset } from "@/lib/api/convex";
import { clientEnv } from "@/lib/env/client";
import { getStoryIpaExplorerUrl } from "@/lib/story/explorer";
import { useStoryClient } from "@/lib/story/useStoryClient";
import { LICENSE_PRESETS, type LicensePreset } from "@/lib/story/license-presets";
import { sha256HexFromFile } from "@/lib/crypto/sha256";
import { uploadFileToB2, type StorageUploadScope } from "@/lib/storage/upload-client";
import { cn, formatBytes } from "@/lib/utils";
import { CopyIconButton } from "@/components/data-display/CopyIconButton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ArrowLeft,
  CircleAlert,
  CheckCircle2,
  FileText,
  Globe,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  UploadCloud,
} from "lucide-react";

const DATASET_SCHEMA_VERSION = "cliplore.dataset.v1" as const;

const DATASET_TYPE_OPTIONS = [
  { value: "pov-video", label: "PoV video" },
  { value: "drone-footage", label: "Drone footage" },
  { value: "stereo-video", label: "Stereo video" },
  { value: "mocap", label: "Motion capture" },
  { value: "robotics-teleop", label: "Robotics teleoperation" },
  { value: "industrial-sensor", label: "Industrial sensor" },
  { value: "medical-imaging", label: "Medical imaging" },
  { value: "mixed", label: "Mixed modalities" },
] as const;

type DatasetType = (typeof DATASET_TYPE_OPTIONS)[number]["value"];

const MODALITY_OPTIONS = [
  "video",
  "audio",
  "image",
  "depth",
  "imu",
  "lidar",
  "pose",
  "text",
  "events",
] as const;

type DatasetModality = (typeof MODALITY_OPTIONS)[number];

type MetadataTab = "basics" | "capture" | "notes";

const CAPTURE_METHOD_OPTIONS = [
  { value: "handheld", label: "Handheld" },
  { value: "drone", label: "Drone" },
  { value: "tripod", label: "Tripod" },
  { value: "multicam", label: "Multi-cam" },
  { value: "screen-record", label: "Screen record" },
  { value: "robot-mounted", label: "Robot mounted" },
  { value: "other", label: "Other" },
] as const;

type CaptureMethod = (typeof CAPTURE_METHOD_OPTIONS)[number]["value"];

const LOCATION_PRIVACY_OPTIONS = [
  { value: "none", label: "None" },
  { value: "coarse", label: "Coarse" },
  { value: "redacted", label: "Redacted" },
] as const;

type LocationPrivacy = (typeof LOCATION_PRIVACY_OPTIONS)[number]["value"];

const SENSOR_TYPE_OPTIONS = [
  { value: "rgb-camera", label: "RGB camera" },
  { value: "stereo-camera", label: "Stereo camera" },
  { value: "thermal", label: "Thermal" },
  { value: "depth", label: "Depth" },
  { value: "imu", label: "IMU" },
  { value: "lidar", label: "LiDAR" },
  { value: "microphone", label: "Microphone" },
  { value: "other", label: "Other" },
] as const;

type SensorType = (typeof SENSOR_TYPE_OPTIONS)[number]["value"];

const RELEASE_PROOF_TYPE_OPTIONS = [
  { value: "model", label: "Model release" },
  { value: "property", label: "Property release" },
  { value: "music", label: "Music clearance" },
  { value: "other", label: "Other" },
] as const;

type ReleaseProofType = (typeof RELEASE_PROOF_TYPE_OPTIONS)[number]["value"];

const ARTIFACT_ROLE_OPTIONS = [
  { value: "preview", label: "Preview" },
  { value: "raw", label: "Raw" },
  { value: "labels", label: "Labels" },
  { value: "calibration", label: "Calibration" },
  { value: "docs", label: "Docs" },
  { value: "checksums", label: "Checksums" },
] as const;

type ArtifactRole = (typeof ARTIFACT_ROLE_OPTIONS)[number]["value"];

type UploadProgress = {
  uploadedBytes: number;
  totalBytes: number;
  partNumber: number;
  totalParts: number;
};

type PublishResult = {
  ipId: string;
  txHash?: string;
  licenseTermsId?: string;
  ipMetadataUri: string;
  nftMetadataUri: string;
  mediaUrl: string;
  thumbnailUrl: string;
};

type SensorDraft = {
  id: string;
  sensorType: SensorType;
  make: string;
  model: string;
  lens: string;
  calibrationUrl: string;
  calibrationHash: string;
};

type ReleaseProofDraft = {
  id: string;
  type: ReleaseProofType;
  uri: string;
  hash: string;
};

type ArtifactDraft = {
  id: string;
  role: ArtifactRole;
  uri: string;
  hash: string;
  mimeType: string;
  sizeBytes: string;
};

function parseTags(input: string) {
  const tags = input
    .split(/[,\n]/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 32);
  return Array.from(new Set(tags));
}

function toTrimmedOrUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function toOptionalInt(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return undefined;
  const int = Math.trunc(num);
  return int >= 0 ? int : undefined;
}

function toggleInArray<T extends string>(arr: T[], value: T) {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

async function hashRemoteUrl(input: string) {
  const url = input.trim();
  if (!url) throw new Error("URL is required.");

  const res = await fetch("/api/enforcement/hash-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, maxBytes: 200 * 1024 * 1024, maxRedirects: 3 }),
  });

  const data = (await res.json().catch(() => ({}))) as
    | { sha256: string; bytes?: number; contentType?: string }
    | { error?: string };

  if (!res.ok || !("sha256" in data) || typeof data.sha256 !== "string") {
    const message = "error" in data && data.error ? data.error : "Failed to hash URL.";
    throw new Error(message);
  }

  return {
    sha256: data.sha256,
    bytes: typeof data.bytes === "number" ? data.bytes : undefined,
    contentType: typeof data.contentType === "string" ? data.contentType : undefined,
  };
}

function CheckboxRow(props: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  title: string;
  description: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border bg-background p-3",
        props.invalid && "border-destructive/50 bg-destructive/5",
      )}
    >
      <Checkbox
        id={props.id}
        checked={props.checked}
        onCheckedChange={(next) => props.onChange(Boolean(next))}
        disabled={props.disabled}
        className="mt-1"
      />
      <div className="grid gap-1">
        <Label
          htmlFor={props.id}
          className="cursor-pointer text-sm font-medium text-foreground"
        >
          {props.title}
        </Label>
        <p className="text-xs text-muted-foreground">{props.description}</p>
      </div>
    </div>
  );
}

export default function DatasetPublishClient() {
  const { address } = useAccount();
  const client = useStoryClient();

  const [datasetId, setDatasetId] = useState(() => crypto.randomUUID());

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [datasetType, setDatasetType] = useState<DatasetType>("pov-video");
  const [datasetVersion, setDatasetVersion] = useState("1.0.0");
  const [modalities, setModalities] = useState<DatasetModality[]>(["video"]);
  const [tagsInput, setTagsInput] = useState("");
  const tags = useMemo(() => parseTags(tagsInput), [tagsInput]);

  const [captureMethod, setCaptureMethod] = useState<CaptureMethod>("handheld");
  const [captureDevice, setCaptureDevice] = useState("");
  const [captureEnvironment, setCaptureEnvironment] = useState("");
  const [captureLighting, setCaptureLighting] = useState("");
  const [captureFps, setCaptureFps] = useState("");
  const [captureResolution, setCaptureResolution] = useState("");
  const [locationPrivacy, setLocationPrivacy] = useState<LocationPrivacy>("coarse");
  const [captureCountry, setCaptureCountry] = useState("");
  const [captureRegion, setCaptureRegion] = useState("");
  const [usageNotes, setUsageNotes] = useState("");

  const [containsPeople, setContainsPeople] = useState(false);
  const [containsSensitiveData, setContainsSensitiveData] = useState(false);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [modelRelease, setModelRelease] = useState(false);
  const [propertyRelease, setPropertyRelease] = useState(false);
  const [thirdPartyAudioCleared, setThirdPartyAudioCleared] = useState(false);
  const [releaseProofs, setReleaseProofs] = useState<ReleaseProofDraft[]>([]);

  const [sensors, setSensors] = useState<SensorDraft[]>([]);

  const [hasLabels, setHasLabels] = useState(false);
  const [labelFormat, setLabelFormat] = useState("");
  const [labelTaxonomy, setLabelTaxonomy] = useState("");
  const [labelingTool, setLabelingTool] = useState("");
  const [labelManifestUri, setLabelManifestUri] = useState("");
  const [labelManifestHash, setLabelManifestHash] = useState("");

  const [splitTrain, setSplitTrain] = useState("");
  const [splitVal, setSplitVal] = useState("");
  const [splitTest, setSplitTest] = useState("");

  const [artifacts, setArtifacts] = useState<ArtifactDraft[]>([]);

  const [captureSigned, setCaptureSigned] = useState(false);
  const [deviceSignature, setDeviceSignature] = useState("");
  const [c2paManifestUri, setC2paManifestUri] = useState("");
  const [c2paManifestHash, setC2paManifestHash] = useState("");

  const [licensePreset, setLicensePreset] = useState<LicensePreset>("commercial-5");

  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const [status, setStatus] = useState<
    "idle" | "hashing" | "uploading" | "pinning" | "registering" | "syncing" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [uploadDatasetProgress, setUploadDatasetProgress] = useState<UploadProgress | null>(null);
  const [uploadThumbnailProgress, setUploadThumbnailProgress] = useState<UploadProgress | null>(null);
  const [marketplaceSyncError, setMarketplaceSyncError] = useState<string | null>(null);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [hashJobs, setHashJobs] = useState<Record<string, boolean>>({});
  const [metadataTab, setMetadataTab] = useState<MetadataTab>("basics");
  const [showValidation, setShowValidation] = useState(false);
  const [pendingScroll, setPendingScroll] = useState<{ sectionId: string; focusId?: string } | null>(
    null,
  );

  const canPublish = Boolean(
    address &&
      datasetFile &&
      thumbnailFile &&
      title.trim().length >= 3 &&
      description.trim().length >= 5 &&
      datasetVersion.trim().length >= 1 &&
      modalities.length >= 1 &&
      rightsConfirmed &&
      status !== "hashing" &&
      status !== "uploading" &&
      status !== "pinning" &&
      status !== "registering" &&
      status !== "syncing",
  );

  useEffect(() => {
    if (!pendingScroll) return;
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const el = document.getElementById(pendingScroll.focusId ?? pendingScroll.sectionId);
    el?.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "start",
    });
    if (pendingScroll.focusId) {
      const focusEl = document.getElementById(pendingScroll.focusId);
      if (focusEl instanceof HTMLElement) {
        focusEl.focus({ preventScroll: true });
      }
    }
    setPendingScroll(null);
  }, [metadataTab, pendingScroll]);

  const computeHashForUrl = async (jobId: string, url: string) => {
    if (!url.trim()) {
      toast.error("Enter a URL first.");
      return null;
    }
    setHashJobs((prev) => ({ ...prev, [jobId]: true }));
    try {
      const res = await hashRemoteUrl(url);
      toast.success("SHA-256 computed.");
      return res;
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to compute SHA-256.");
      return null;
    } finally {
      setHashJobs((prev) => ({ ...prev, [jobId]: false }));
    }
  };

  const handlePublish = async () => {
    setError(null);
    setMarketplaceSyncError(null);
    setResult(null);

    if (!address) {
      setError("Connect a wallet to publish.");
      return;
    }
    if (!datasetFile || !thumbnailFile) {
      setError("Select a dataset file and a cover image.");
      return;
    }
    if (datasetVersion.trim().length < 1) {
      setError("Dataset version is required.");
      return;
    }
    if (!modalities.length) {
      setError("Select at least one modality.");
      return;
    }
    if (captureFps.trim()) {
      const num = Number(captureFps.trim());
      if (!Number.isFinite(num) || num <= 0) {
        setError("FPS must be a positive number.");
        return;
      }
    }
    for (const value of [splitTrain, splitVal, splitTest]) {
      if (!value.trim()) continue;
      const num = Number(value.trim());
      if (!Number.isFinite(num) || num < 0 || Math.trunc(num) !== num) {
        setError("Split counts must be non-negative integers.");
        return;
      }
    }
    for (const artifact of artifacts) {
      const uri = artifact.uri.trim();
      if (!uri) continue;
      if (!artifact.mimeType.trim()) {
        setError("Each artifact URL must include a MIME type.");
        return;
      }
      if (!artifact.hash.trim()) {
        setError("Each artifact URL must include a SHA-256 hash.");
        return;
      }
      if (artifact.sizeBytes.trim()) {
        const num = Number(artifact.sizeBytes.trim());
        if (!Number.isFinite(num) || num < 0 || Math.trunc(num) !== num) {
          setError("Artifact size must be a non-negative integer.");
          return;
        }
      }
    }
    if (!rightsConfirmed) {
      setError("Confirm you have rights to license this dataset sample.");
      return;
    }
    if (!client) {
      setError("Wallet client not ready yet. Try again in a moment.");
      return;
    }

    const wallet = address as `0x${string}`;
    const scope: StorageUploadScope = { scope: "dataset", datasetId };

    try {
      setStatus("hashing");
      const [mediaHash, imageHash] = await Promise.all([
        sha256HexFromFile(datasetFile),
        sha256HexFromFile(thumbnailFile),
      ]);

      const cleanedSensors = sensors
        .map((sensor) => ({
          sensorType: sensor.sensorType,
          make: toTrimmedOrUndefined(sensor.make),
          model: toTrimmedOrUndefined(sensor.model),
          lens: toTrimmedOrUndefined(sensor.lens),
          calibration: sensor.calibrationUrl.trim()
            ? {
                calibrationUrl: sensor.calibrationUrl.trim(),
                calibrationHash: toTrimmedOrUndefined(sensor.calibrationHash) as
                  | `0x${string}`
                  | undefined,
              }
            : undefined,
        }))
        .filter((sensor) => sensor.sensorType);

      const cleanedReleaseProofs = releaseProofs
        .map((proof) => ({
          type: proof.type,
          uri: proof.uri.trim(),
          hash: toTrimmedOrUndefined(proof.hash) as `0x${string}` | undefined,
        }))
        .filter((proof) => Boolean(proof.uri));

      const cleanedArtifacts = artifacts
        .map((artifact) => ({
          role: artifact.role,
          uri: artifact.uri.trim(),
          hash: artifact.hash.trim() as `0x${string}`,
          mimeType: artifact.mimeType.trim(),
          sizeBytes: toOptionalInt(artifact.sizeBytes),
        }))
        .filter((artifact) => Boolean(artifact.uri));

      const datasetPayload = {
        schemaVersion: DATASET_SCHEMA_VERSION,
        datasetType,
        version: datasetVersion.trim(),
        modalities,
        releases: {
          rightsConfirmed: true,
          containsPeople,
          containsSensitiveData,
          modelRelease,
          propertyRelease,
          thirdPartyAudioCleared,
          releaseProofs: cleanedReleaseProofs.length ? cleanedReleaseProofs : undefined,
        },
        capture: {
          captureMethod,
          device: toTrimmedOrUndefined(captureDevice),
          environment: toTrimmedOrUndefined(captureEnvironment),
          lighting: toTrimmedOrUndefined(captureLighting),
          fps: (() => {
            const raw = captureFps.trim();
            if (!raw) return undefined;
            const num = Number(raw);
            return Number.isFinite(num) && num > 0 ? num : undefined;
          })(),
          resolution: toTrimmedOrUndefined(captureResolution),
          location:
            captureCountry.trim() || captureRegion.trim()
              ? {
                  privacyLevel: locationPrivacy,
                  country: toTrimmedOrUndefined(captureCountry),
                  region: toTrimmedOrUndefined(captureRegion),
                }
              : undefined,
        },
        sensors: cleanedSensors.length ? cleanedSensors : undefined,
        annotations: hasLabels || labelFormat.trim() || labelTaxonomy.trim() || labelingTool.trim() || labelManifestUri.trim()
          ? {
              hasLabels,
              labelFormat: toTrimmedOrUndefined(labelFormat),
              labelTaxonomy: toTrimmedOrUndefined(labelTaxonomy),
              labelingTool: toTrimmedOrUndefined(labelingTool),
              labelManifest: labelManifestUri.trim()
                ? {
                    uri: labelManifestUri.trim(),
                    hash: toTrimmedOrUndefined(labelManifestHash) as
                      | `0x${string}`
                      | undefined,
                  }
                : undefined,
            }
          : undefined,
        splits:
          splitTrain.trim() || splitVal.trim() || splitTest.trim()
            ? {
                train: toOptionalInt(splitTrain),
                val: toOptionalInt(splitVal),
                test: toOptionalInt(splitTest),
              }
            : undefined,
        artifacts: cleanedArtifacts.length ? cleanedArtifacts : undefined,
        provenance:
          captureSigned || deviceSignature.trim() || c2paManifestUri.trim()
            ? {
                captureSigned,
                deviceSignature: toTrimmedOrUndefined(deviceSignature),
                c2pa: c2paManifestUri.trim()
                  ? {
                      manifestUri: c2paManifestUri.trim(),
                      manifestHash: toTrimmedOrUndefined(c2paManifestHash) as
                        | `0x${string}`
                        | undefined,
                    }
                  : undefined,
              }
            : undefined,
        usageNotes: toTrimmedOrUndefined(usageNotes),
      };

      setStatus("uploading");
      setUploadDatasetProgress(null);
      setUploadThumbnailProgress(null);

      const [mediaUpload, thumbnailUpload] = await Promise.all([
        uploadFileToB2({
          wallet,
          scope,
          kind: "dataset",
          file: datasetFile,
          onProgress: (progress) => setUploadDatasetProgress(progress),
        }),
        uploadFileToB2({
          wallet,
          scope,
          kind: "thumbnail",
          file: thumbnailFile,
          onProgress: (progress) => setUploadThumbnailProgress(progress),
        }),
      ]);

      setStatus("pinning");
      const meta = await uploadIpMetadataAction({
        title: title.trim(),
        description: description.trim(),
        creatorAddress: wallet,
        ipType: "dataset",
        tags,
        mediaUri: mediaUpload.url,
        mediaHash,
        mediaMimeType: datasetFile.type || "application/octet-stream",
        mediaSizeBytes: datasetFile.size,
        thumbnailUri: thumbnailUpload.url,
        imageHash,
        thumbnailMimeType: thumbnailFile.type || "image/png",
        thumbnailSizeBytes: thumbnailFile.size,
        dataset: datasetPayload,
      });

      setStatus("registering");
      const preset = LICENSE_PRESETS[licensePreset];
      const terms =
        preset.share && preset.share > 0
          ? PILFlavor.commercialRemix({
              commercialRevShare: preset.share,
              defaultMintingFee: parseEther(preset.fee ?? "1"),
              currency: clientEnv.NEXT_PUBLIC_WIP_TOKEN_ADDRESS as `0x${string}`,
            })
          : PILFlavor.nonCommercialSocialRemixing();

      const registration = await client.ipAsset.registerIpAsset({
        nft: {
          type: "mint",
          spgNftContract: clientEnv.NEXT_PUBLIC_SPG_NFT_CONTRACT_ADDRESS as `0x${string}`,
        },
        ipMetadata: {
          ipMetadataURI: meta.ipMetadataUri,
          ipMetadataHash: meta.ipMetadataHash,
          nftMetadataURI: meta.nftMetadataUri,
          nftMetadataHash: meta.nftMetadataHash,
        },
        licenseTermsData: [{ terms }],
      });

      const ipId = (registration.ipId as string | undefined) ?? null;
      if (!ipId) {
        throw new Error("Story registration returned no ipId.");
      }

      const licenseTermsId =
        (registration.licenseTermsIds && registration.licenseTermsIds[0]?.toString()) || undefined;
      const txHash = (registration as any).txHash as string | undefined;

      setStatus("syncing");
      try {
        await createConvexIpAsset({
          wallet,
          assetKind: "dataset",
          datasetType,
          tags,
          mediaMimeType: datasetFile.type || "application/octet-stream",
          mediaSizeBytes: datasetFile.size,
          ipId,
          title: title.trim(),
          summary: description.trim(),
          terms: preset.label,
          videoUrl: mediaUpload.url,
          thumbnailUrl: thumbnailUpload.url,
          licenseTermsId,
          txHash,
          chainId: clientEnv.NEXT_PUBLIC_STORY_CHAIN_ID,
          ipMetadataUri: meta.ipMetadataUri,
          ipMetadataHash: meta.ipMetadataHash,
          nftMetadataUri: meta.nftMetadataUri,
          nftMetadataHash: meta.nftMetadataHash,
          videoKey: mediaUpload.key,
          thumbnailKey: thumbnailUpload.key,
          videoSha256: mediaHash,
          thumbnailSha256: imageHash,
        });
      } catch (syncErr: any) {
        console.debug("Dataset marketplace sync failed", syncErr);
        setMarketplaceSyncError(
          syncErr?.message ??
            "Marketplace sync failed. Confirm NEXT_PUBLIC_CONVEX_URL points to your deployment.",
        );
      }

      setResult({
        ipId,
        txHash,
        licenseTermsId,
        ipMetadataUri: meta.ipMetadataUri,
        nftMetadataUri: meta.nftMetadataUri,
        mediaUrl: mediaUpload.url,
        thumbnailUrl: thumbnailUpload.url,
      });
      setStatus("success");
      toast.success("Dataset registered on Story.");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setError(err?.message ?? "Dataset publish failed.");
      toast.error("Dataset publish failed.");
    }
  };

  const statusLabel =
    status === "hashing"
      ? "Hashing…"
      : status === "uploading"
        ? "Uploading…"
        : status === "pinning"
          ? "Pinning metadata…"
          : status === "registering"
            ? "Registering on Story…"
            : status === "syncing"
              ? "Syncing to marketplace…"
              : status === "success"
                ? "Published"
                : status === "error"
                  ? "Error"
                  : "Ready";

  const busy = status !== "idle" && status !== "success" && status !== "error";
  const statusBadgeVariant =
    status === "success" ? "success" : status === "error" ? "warning" : "outline";

  const datasetTypeLabel =
    DATASET_TYPE_OPTIONS.find((opt) => opt.value === datasetType)?.label ??
    datasetType;
  const captureMethodLabel =
    CAPTURE_METHOD_OPTIONS.find((opt) => opt.value === captureMethod)?.label ??
    captureMethod;
  const licenseLabel = LICENSE_PRESETS[licensePreset]?.label ?? licensePreset;

  const datasetUploadPercent = uploadDatasetProgress
    ? Math.round(
        (uploadDatasetProgress.uploadedBytes /
          Math.max(uploadDatasetProgress.totalBytes, 1)) *
          100,
      )
    : null;
  const thumbnailUploadPercent = uploadThumbnailProgress
    ? Math.round(
        (uploadThumbnailProgress.uploadedBytes /
          Math.max(uploadThumbnailProgress.totalBytes, 1)) *
          100,
      )
    : null;

  const requirements = [
    {
      key: "wallet",
      ok: Boolean(address),
      title: "Wallet connected",
      hint: "Connect a wallet to register on Story.",
    },
    {
      key: "dataset",
      ok: Boolean(datasetFile),
      title: "Dataset sample selected",
      hint: "Choose the primary dataset sample file.",
    },
    {
      key: "cover",
      ok: Boolean(thumbnailFile),
      title: "Cover image selected",
      hint: "Add a cover image for marketplace previews.",
    },
    {
      key: "title",
      ok: title.trim().length >= 3,
      title: "Title",
      hint: "Use at least 3 characters.",
    },
    {
      key: "description",
      ok: description.trim().length >= 5,
      title: "Description",
      hint: "Use at least 5 characters.",
    },
    {
      key: "version",
      ok: datasetVersion.trim().length >= 1,
      title: "Version",
      hint: "Set a version like 1.0.0.",
    },
    {
      key: "modalities",
      ok: modalities.length >= 1,
      title: "Modalities",
      hint: "Select at least one modality.",
    },
    {
      key: "rights",
      ok: rightsConfirmed,
      title: "Rights confirmed",
      hint: "Confirm you have rights to license this dataset sample.",
    },
  ] as const;

  const missingCount = requirements.filter((item) => !item.ok).length;

  type RequirementKey = (typeof requirements)[number]["key"];

  const jumpTo = (opts: { sectionId: string; focusId?: string; metadataTab?: MetadataTab }) => {
    if (opts.metadataTab) setMetadataTab(opts.metadataTab);
    setPendingScroll({ sectionId: opts.sectionId, focusId: opts.focusId });
  };

  const requirementTargets: Record<
    RequirementKey,
    { sectionId: string; focusId?: string; metadataTab?: MetadataTab }
  > = {
    wallet: { sectionId: "dataset-review" },
    dataset: { sectionId: "dataset-files", focusId: "dataset-file" },
    cover: { sectionId: "dataset-files", focusId: "cover-file" },
    title: { sectionId: "dataset-metadata", focusId: "title", metadataTab: "basics" },
    description: { sectionId: "dataset-metadata", focusId: "description", metadataTab: "basics" },
    version: { sectionId: "dataset-metadata", focusId: "dataset-version", metadataTab: "basics" },
    modalities: { sectionId: "dataset-metadata", metadataTab: "basics" },
    rights: { sectionId: "dataset-rights", focusId: "rights-confirmed" },
  };

  const onPublishClick = () => {
    setShowValidation(true);
    const firstMissing = requirements.find((item) => !item.ok);
    if (firstMissing) jumpTo(requirementTargets[firstMissing.key]);
    void handlePublish();
  };

  const datasetFileError = showValidation && !datasetFile ? "Select a dataset sample file." : null;
  const thumbnailFileError = showValidation && !thumbnailFile ? "Select a cover image." : null;
  const titleError =
    (showValidation || title.trim().length > 0) && title.trim().length < 3
      ? "Use at least 3 characters."
      : null;
  const descriptionError =
    (showValidation || description.trim().length > 0) && description.trim().length < 5
      ? "Use at least 5 characters."
      : null;
  const datasetVersionError = datasetVersion.trim().length < 1 ? "Version is required." : null;
  const modalitiesError = modalities.length < 1 ? "Select at least one modality." : null;
  const rightsConfirmedError = showValidation && !rightsConfirmed ? "Required to publish." : null;

  const selectedLicense = LICENSE_PRESETS[licensePreset];
  const licenseSummary =
    selectedLicense?.share && selectedLicense.share > 0
      ? `${selectedLicense.share}% rev share · ${selectedLicense.fee ?? "1"} WIP fee`
      : "Non-commercial remix";

  return (
    <TooltipProvider>
      <main
        id="main"
        className="mx-auto max-w-7xl space-y-8 px-4 py-10 pb-24 sm:px-6 sm:py-12 lg:px-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Data track</p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">Publish dataset</h1>
            <p className="max-w-3xl text-muted-foreground">
              Upload a rights-cleared sample, pin Story IPA metadata to IPFS, register on Story, and
              list it for licensing.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusBadgeVariant} className="gap-1.5">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {statusLabel}
            </Badge>
            <Button asChild variant="outline">
              <Link href="/datasets">
                <ArrowLeft className="h-4 w-4" />
                Back to datasets
              </Link>
            </Button>
          </div>
        </div>

        {result ? (
          <Card>
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                  Published
                </CardTitle>
                <Badge variant="success">Story registered</Badge>
              </div>
              <CardDescription>Your dataset is registered on Story and ready to license.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>IP Asset ID</Label>
                <div className="flex items-center gap-2">
                  <code className="max-w-full truncate rounded-md border border-border bg-muted/30 px-2 py-1 font-mono text-xs">
                    {result.ipId}
                  </code>
                  <CopyIconButton value={result.ipId} label="Copy IP Asset ID" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <a
                    href={getStoryIpaExplorerUrl({ ipId: result.ipId })}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Globe className="h-4 w-4" />
                    Story Explorer
                  </a>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/datasets/${encodeURIComponent(result.ipId)}`}>View dataset page</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7 xl:col-span-8">
            <Card id="dataset-files">
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Files
                </CardTitle>
                <CardDescription>Primary data sample + cover image for marketplace previews.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-2">
                  <Label htmlFor="dataset-file">Dataset sample</Label>
                  <Input
                    id="dataset-file"
                    type="file"
                    onChange={(e) => setDatasetFile(e.target.files?.[0] ?? null)}
                    disabled={busy}
                    aria-invalid={Boolean(datasetFileError)}
                    aria-describedby={datasetFileError ? "dataset-file-error" : undefined}
                    className={cn(datasetFileError && "border-destructive focus-visible:ring-destructive")}
                  />
                  {datasetFileError ? (
                    <p id="dataset-file-error" className="text-xs text-destructive">
                      {datasetFileError}
                    </p>
                  ) : null}
                  {datasetFile ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{datasetFile.type || "application/octet-stream"}</Badge>
                      <Badge variant="outline">{formatBytes(datasetFile.size)}</Badge>
                      <Badge variant="outline" className="max-w-full truncate">
                        {datasetFile.name}
                      </Badge>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cover-file">Cover image</Label>
                  <Input
                    id="cover-file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
                    disabled={busy}
                    aria-invalid={Boolean(thumbnailFileError)}
                    aria-describedby={thumbnailFileError ? "cover-file-error" : undefined}
                    className={cn(thumbnailFileError && "border-destructive focus-visible:ring-destructive")}
                  />
                  {thumbnailFileError ? (
                    <p id="cover-file-error" className="text-xs text-destructive">
                      {thumbnailFileError}
                    </p>
                  ) : null}
                  {thumbnailFile ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{thumbnailFile.type || "image/png"}</Badge>
                      <Badge variant="outline">{formatBytes(thumbnailFile.size)}</Badge>
                      <Badge variant="outline" className="max-w-full truncate">
                        {thumbnailFile.name}
                      </Badge>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card id="dataset-metadata">
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ImageIcon className="h-4 w-4" />
                  Metadata
                </CardTitle>
                <CardDescription>Structured fields improve search, licensing, and provenance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={metadataTab} onValueChange={(v) => setMetadataTab(v as MetadataTab)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basics">Basics</TabsTrigger>
                    <TabsTrigger value="capture">Capture</TabsTrigger>
                    <TabsTrigger value="notes">Notes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basics" className="space-y-5 pt-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={busy}
                        aria-invalid={Boolean(titleError)}
                        aria-describedby={titleError ? "title-error" : undefined}
                        className={cn(titleError && "border-destructive focus-visible:ring-destructive")}
                      />
                      {titleError ? (
                        <p id="title-error" className="text-xs text-destructive">
                          {titleError}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What is this sample? How was it captured? What’s allowed/restricted?"
                        disabled={busy}
                        aria-invalid={Boolean(descriptionError)}
                        aria-describedby={descriptionError ? "description-error" : undefined}
                        className={cn(
                          "min-h-[110px]",
                          descriptionError && "border-destructive focus-visible:ring-destructive",
                        )}
                      />
                      {descriptionError ? (
                        <p id="description-error" className="text-xs text-destructive">
                          {descriptionError}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid gap-2">
                      <Label>Dataset type</Label>
                      <div className="flex flex-wrap gap-2">
                        {DATASET_TYPE_OPTIONS.map((t) => (
                          <Button
                            key={t.value}
                            type="button"
                            size="sm"
                            variant={datasetType === t.value ? "default" : "outline"}
                            onClick={() => setDatasetType(t.value)}
                            disabled={busy}
                          >
                            {t.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="dataset-version">Dataset version</Label>
                        <Input
                          id="dataset-version"
                          value={datasetVersion}
                          onChange={(e) => setDatasetVersion(e.target.value)}
                          placeholder="e.g. 1.0.0"
                          disabled={busy}
                          aria-invalid={showValidation && Boolean(datasetVersionError)}
                          className={cn(
                            showValidation &&
                              datasetVersionError &&
                              "border-destructive focus-visible:ring-destructive",
                          )}
                        />
                        {showValidation && datasetVersionError ? (
                          <p className="text-xs text-destructive">{datasetVersionError}</p>
                        ) : null}
                      </div>

                      <div className="grid gap-2">
                        <Label>Modalities</Label>
                        <div className="flex flex-wrap gap-2">
                          {MODALITY_OPTIONS.map((m) => (
                            <Button
                              key={m}
                              type="button"
                              size="sm"
                              variant={modalities.includes(m) ? "default" : "outline"}
                              onClick={() => setModalities((prev) => toggleInArray(prev, m))}
                              disabled={busy}
                            >
                              {m}
                            </Button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Select every signal present in this dataset sample.
                        </p>
                        {showValidation && modalitiesError ? (
                          <p className="text-xs text-destructive">{modalitiesError}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="tags">Tags</Label>
                      <Input
                        id="tags"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="Comma-separated (e.g. pov-video, outdoors, handheld)"
                        disabled={busy}
                      />
                      {tags.length ? (
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </TabsContent>

                  <TabsContent value="capture" className="space-y-5 pt-4">
                    <div className="grid gap-2">
                      <Label>Capture method</Label>
                      <div className="flex flex-wrap gap-2">
                        {CAPTURE_METHOD_OPTIONS.map((m) => (
                          <Button
                            key={m.value}
                            type="button"
                            size="sm"
                            variant={captureMethod === m.value ? "default" : "outline"}
                            onClick={() => setCaptureMethod(m.value)}
                            disabled={busy}
                          >
                            {m.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="capture-device">Capture device</Label>
                        <Input
                          id="capture-device"
                          value={captureDevice}
                          onChange={(e) => setCaptureDevice(e.target.value)}
                          placeholder="e.g. GoPro Hero 12, DJI Air 3, Quest 3"
                          disabled={busy}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="capture-environment">Environment</Label>
                        <Input
                          id="capture-environment"
                          value={captureEnvironment}
                          onChange={(e) => setCaptureEnvironment(e.target.value)}
                          placeholder="e.g. indoor lab, coastal trail, city streets"
                          disabled={busy}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="capture-lighting">Lighting</Label>
                        <Input
                          id="capture-lighting"
                          value={captureLighting}
                          onChange={(e) => setCaptureLighting(e.target.value)}
                          placeholder="e.g. daylight, low light, mixed"
                          disabled={busy}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="capture-fps">FPS</Label>
                        <Input
                          id="capture-fps"
                          inputMode="decimal"
                          value={captureFps}
                          onChange={(e) => setCaptureFps(e.target.value)}
                          placeholder="e.g. 30"
                          disabled={busy}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="capture-resolution">Resolution</Label>
                        <Input
                          id="capture-resolution"
                          value={captureResolution}
                          onChange={(e) => setCaptureResolution(e.target.value)}
                          placeholder="e.g. 1920x1080"
                          disabled={busy}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="grid gap-2">
                        <Label htmlFor="location-privacy">Location privacy</Label>
                        <Select
                          value={locationPrivacy}
                          onValueChange={(value) => setLocationPrivacy(value as LocationPrivacy)}
                        >
                          <SelectTrigger id="location-privacy" disabled={busy}>
                            <SelectValue placeholder="Select privacy level" />
                          </SelectTrigger>
                          <SelectContent>
                            {LOCATION_PRIVACY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="capture-country">Country</Label>
                        <Input
                          id="capture-country"
                          value={captureCountry}
                          onChange={(e) => setCaptureCountry(e.target.value)}
                          placeholder="e.g. US"
                          disabled={busy}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="capture-region">Region</Label>
                        <Input
                          id="capture-region"
                          value={captureRegion}
                          onChange={(e) => setCaptureRegion(e.target.value)}
                          placeholder="e.g. Metro Manila"
                          disabled={busy}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="notes" className="space-y-4 pt-4">
                    <div className="grid gap-2">
                      <Label htmlFor="usage-notes">Usage notes</Label>
                      <Textarea
                        id="usage-notes"
                        value={usageNotes}
                        onChange={(e) => setUsageNotes(e.target.value)}
                        placeholder="Any constraints, model-training intent, or special handling notes."
                        className="min-h-[120px]"
                        disabled={busy}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card id="dataset-rights">
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4" />
                  Rights & compliance
                </CardTitle>
                <CardDescription>
                  Encode rights-clearing signals and optionally attach proof URLs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="space-y-1">
                    <CheckboxRow
                      id="rights-confirmed"
                      checked={rightsConfirmed}
                      onChange={setRightsConfirmed}
                      title="I have the rights to license this data sample"
                      description="You own the content and/or have releases/consent required to grant Story license terms."
                      disabled={busy}
                      invalid={Boolean(rightsConfirmedError)}
                    />
                    {rightsConfirmedError ? (
                      <p className="text-xs text-destructive">{rightsConfirmedError}</p>
                    ) : null}
                  </div>
                  <CheckboxRow
                    id="contains-people"
                    checked={containsPeople}
                    onChange={setContainsPeople}
                    title="Contains identifiable people"
                    description="Used to signal that releases/consent may be required for downstream use."
                    disabled={busy}
                  />
                  <CheckboxRow
                    id="contains-sensitive"
                    checked={containsSensitiveData}
                    onChange={setContainsSensitiveData}
                    title="Contains sensitive data"
                    description="Examples: medical info, biometrics, license plates, or other personal identifiers."
                    disabled={busy}
                  />
                  <CheckboxRow
                    id="model-release"
                    checked={modelRelease}
                    onChange={setModelRelease}
                    title="Model releases obtained (if applicable)"
                    description="Use when identifiable people appear and releases are required for licensing/training."
                    disabled={busy}
                  />
                  <CheckboxRow
                    id="property-release"
                    checked={propertyRelease}
                    onChange={setPropertyRelease}
                    title="Property releases obtained (if applicable)"
                    description="Use when private property requires clearance."
                    disabled={busy}
                  />
                  <CheckboxRow
                    id="audio-cleared"
                    checked={thirdPartyAudioCleared}
                    onChange={setThirdPartyAudioCleared}
                    title="Third-party audio cleared (if applicable)"
                    description="Use when music/voice content is present and cleared for licensing."
                    disabled={busy}
                  />
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="release-proofs">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        Release proofs (optional)
                        {releaseProofs.length ? (
                          <Badge variant="outline" className="tabular-nums">
                            {releaseProofs.length}
                          </Badge>
                        ) : null}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          Add URLs to documents (IPFS or HTTPS). Hashing is recommended for verification.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setReleaseProofs((prev) => [
                              ...prev,
                              { id: crypto.randomUUID(), type: "model", uri: "", hash: "" },
                            ])
                          }
                          disabled={busy}
                        >
                          Add proof
                        </Button>
                      </div>

                      {releaseProofs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No proofs added.</p>
                      ) : (
                        <div className="space-y-3">
                          {releaseProofs.map((proof) => (
                            <div key={proof.id} className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-medium text-foreground">Proof</p>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setReleaseProofs((prev) => prev.filter((p) => p.id !== proof.id))
                                  }
                                  disabled={busy}
                                >
                                  Remove
                                </Button>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="grid gap-2">
                                  <Label htmlFor={`proof-type-${proof.id}`}>Type</Label>
                                  <Select
                                    value={proof.type}
                                    onValueChange={(value) =>
                                      setReleaseProofs((prev) =>
                                        prev.map((p) =>
                                          p.id === proof.id ? { ...p, type: value as ReleaseProofType } : p,
                                        ),
                                      )
                                    }
                                  >
                                    <SelectTrigger id={`proof-type-${proof.id}`} disabled={busy}>
                                      <SelectValue placeholder="Select proof type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {RELEASE_PROOF_TYPE_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="grid gap-2">
                                  <Label htmlFor={`proof-hash-${proof.id}`}>SHA-256 (optional)</Label>
                                  <Input
                                    id={`proof-hash-${proof.id}`}
                                    value={proof.hash}
                                    onChange={(e) =>
                                      setReleaseProofs((prev) =>
                                        prev.map((p) => (p.id === proof.id ? { ...p, hash: e.target.value } : p)),
                                      )
                                    }
                                    placeholder="0x…"
                                    disabled={busy}
                                  />
                                </div>
                              </div>

                              <div className="grid gap-2">
                                <Label htmlFor={`proof-uri-${proof.id}`}>URL</Label>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                  <Input
                                    id={`proof-uri-${proof.id}`}
                                    value={proof.uri}
                                    onChange={(e) =>
                                      setReleaseProofs((prev) =>
                                        prev.map((p) => (p.id === proof.id ? { ...p, uri: e.target.value } : p)),
                                      )
                                    }
                                    placeholder="ipfs://… or https://…"
                                    disabled={busy}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={busy || Boolean(hashJobs[`proof:${proof.id}`]) || !proof.uri.trim()}
                                    onClick={async () => {
                                      const res = await computeHashForUrl(`proof:${proof.id}`, proof.uri);
                                      if (!res) return;
                                      setReleaseProofs((prev) =>
                                        prev.map((p) => (p.id === proof.id ? { ...p, hash: res.sha256 } : p)),
                                      );
                                    }}
                                  >
                                    {hashJobs[`proof:${proof.id}`] ? "Hashing…" : "Compute hash"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <Card id="dataset-optional">
              <CardHeader className="space-y-2">
                <CardTitle className="text-base">Optional details</CardTitle>
                <CardDescription>
                  Add sensors, labels, artifacts, and provenance pointers to improve reuse.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  <AccordionItem value="sensors">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        Sensors
                        {sensors.length ? (
                          <Badge variant="outline" className="tabular-nums">
                            {sensors.length}
                          </Badge>
                        ) : null}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      {sensors.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Add sensors to make the dataset easier to evaluate and reuse.
                        </p>
                      ) : null}

                      <div className="space-y-4">
                        {sensors.map((sensor) => (
                          <div key={sensor.id} className="rounded-lg border border-border bg-muted/10 p-4 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium text-foreground">Sensor</p>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setSensors((prev) => prev.filter((s) => s.id !== sensor.id))}
                                disabled={busy}
                              >
                                Remove
                              </Button>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="grid gap-2">
                                <Label htmlFor={`sensor-type-${sensor.id}`}>Type</Label>
                                <Select
                                  value={sensor.sensorType}
                                  onValueChange={(value) =>
                                    setSensors((prev) =>
                                      prev.map((s) =>
                                        s.id === sensor.id ? { ...s, sensorType: value as SensorType } : s,
                                      ),
                                    )
                                  }
                                >
                                  <SelectTrigger id={`sensor-type-${sensor.id}`} disabled={busy}>
                                    <SelectValue placeholder="Select sensor type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SENSOR_TYPE_OPTIONS.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="grid gap-2">
                                <Label htmlFor={`sensor-make-${sensor.id}`}>Make</Label>
                                <Input
                                  id={`sensor-make-${sensor.id}`}
                                  value={sensor.make}
                                  onChange={(e) =>
                                    setSensors((prev) =>
                                      prev.map((s) => (s.id === sensor.id ? { ...s, make: e.target.value } : s)),
                                    )
                                  }
                                  placeholder="e.g. DJI, GoPro"
                                  disabled={busy}
                                />
                              </div>

                              <div className="grid gap-2">
                                <Label htmlFor={`sensor-model-${sensor.id}`}>Model</Label>
                                <Input
                                  id={`sensor-model-${sensor.id}`}
                                  value={sensor.model}
                                  onChange={(e) =>
                                    setSensors((prev) =>
                                      prev.map((s) => (s.id === sensor.id ? { ...s, model: e.target.value } : s)),
                                    )
                                  }
                                  placeholder="e.g. Air 3, HERO 12"
                                  disabled={busy}
                                />
                              </div>

                              <div className="grid gap-2">
                                <Label htmlFor={`sensor-lens-${sensor.id}`}>Lens</Label>
                                <Input
                                  id={`sensor-lens-${sensor.id}`}
                                  value={sensor.lens}
                                  onChange={(e) =>
                                    setSensors((prev) =>
                                      prev.map((s) => (s.id === sensor.id ? { ...s, lens: e.target.value } : s)),
                                    )
                                  }
                                  placeholder="e.g. wide, 24mm"
                                  disabled={busy}
                                />
                              </div>
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor={`sensor-calib-url-${sensor.id}`}>Calibration URL (optional)</Label>
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <Input
                                  id={`sensor-calib-url-${sensor.id}`}
                                  value={sensor.calibrationUrl}
                                  onChange={(e) =>
                                    setSensors((prev) =>
                                      prev.map((s) =>
                                        s.id === sensor.id ? { ...s, calibrationUrl: e.target.value } : s,
                                      ),
                                    )
                                  }
                                  placeholder="ipfs://… or https://…"
                                  disabled={busy}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={
                                    busy ||
                                    Boolean(hashJobs[`sensor:${sensor.id}`]) ||
                                    !sensor.calibrationUrl.trim()
                                  }
                                  onClick={async () => {
                                    const res = await computeHashForUrl(`sensor:${sensor.id}`, sensor.calibrationUrl);
                                    if (!res) return;
                                    setSensors((prev) =>
                                      prev.map((s) => (s.id === sensor.id ? { ...s, calibrationHash: res.sha256 } : s)),
                                    );
                                  }}
                                >
                                  {hashJobs[`sensor:${sensor.id}`] ? "Hashing…" : "Compute hash"}
                                </Button>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="grid gap-2">
                                  <Label htmlFor={`sensor-calib-hash-${sensor.id}`}>Calibration hash (optional)</Label>
                                  <Input
                                    id={`sensor-calib-hash-${sensor.id}`}
                                    value={sensor.calibrationHash}
                                    onChange={(e) =>
                                      setSensors((prev) =>
                                        prev.map((s) =>
                                          s.id === sensor.id ? { ...s, calibrationHash: e.target.value } : s,
                                        ),
                                      )
                                    }
                                    placeholder="0x…"
                                    disabled={busy}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setSensors((prev) => [
                            ...prev,
                            {
                              id: crypto.randomUUID(),
                              sensorType: "rgb-camera",
                              make: "",
                              model: "",
                              lens: "",
                              calibrationUrl: "",
                              calibrationHash: "",
                            },
                          ])
                        }
                        disabled={busy}
                      >
                        Add sensor
                      </Button>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="labels-splits">
                    <AccordionTrigger>Labels & splits</AccordionTrigger>
                    <AccordionContent className="space-y-5">
                      <CheckboxRow
                        id="has-labels"
                        checked={hasLabels}
                        onChange={setHasLabels}
                        title="Includes labels/annotations"
                        description="Turn this on if you provide labeled data (boxes, masks, keypoints, pose, etc.)."
                        disabled={busy}
                      />

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="label-format">Label format</Label>
                          <Input
                            id="label-format"
                            value={labelFormat}
                            onChange={(e) => setLabelFormat(e.target.value)}
                            placeholder="e.g. COCO, YOLO, custom"
                            disabled={busy}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="labeling-tool">Labeling tool</Label>
                          <Input
                            id="labeling-tool"
                            value={labelingTool}
                            onChange={(e) => setLabelingTool(e.target.value)}
                            placeholder="e.g. CVAT, Label Studio"
                            disabled={busy}
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="label-taxonomy">Label taxonomy</Label>
                        <Textarea
                          id="label-taxonomy"
                          value={labelTaxonomy}
                          onChange={(e) => setLabelTaxonomy(e.target.value)}
                          placeholder="e.g. pedestrians, vehicles, signs, crosswalks"
                          className="min-h-[80px]"
                          disabled={busy}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="label-manifest-uri">Label manifest URL (optional)</Label>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Input
                            id="label-manifest-uri"
                            value={labelManifestUri}
                            onChange={(e) => setLabelManifestUri(e.target.value)}
                            placeholder="ipfs://… or https://…"
                            disabled={busy}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            disabled={busy || Boolean(hashJobs["labels:manifest"]) || !labelManifestUri.trim()}
                            onClick={async () => {
                              const res = await computeHashForUrl("labels:manifest", labelManifestUri);
                              if (!res) return;
                              setLabelManifestHash(res.sha256);
                            }}
                          >
                            {hashJobs["labels:manifest"] ? "Hashing…" : "Compute hash"}
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="label-manifest-hash">Label manifest SHA-256 (optional)</Label>
                        <Input
                          id="label-manifest-hash"
                          value={labelManifestHash}
                          onChange={(e) => setLabelManifestHash(e.target.value)}
                          placeholder="0x…"
                          disabled={busy}
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="grid gap-2">
                          <Label htmlFor="split-train">Train count</Label>
                          <Input
                            id="split-train"
                            inputMode="numeric"
                            value={splitTrain}
                            onChange={(e) => setSplitTrain(e.target.value)}
                            placeholder="e.g. 1200"
                            disabled={busy}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="split-val">Val count</Label>
                          <Input
                            id="split-val"
                            inputMode="numeric"
                            value={splitVal}
                            onChange={(e) => setSplitVal(e.target.value)}
                            placeholder="e.g. 150"
                            disabled={busy}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="split-test">Test count</Label>
                          <Input
                            id="split-test"
                            inputMode="numeric"
                            value={splitTest}
                            onChange={(e) => setSplitTest(e.target.value)}
                            placeholder="e.g. 150"
                            disabled={busy}
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="artifacts-provenance">
                    <AccordionTrigger>Artifacts & provenance</AccordionTrigger>
                    <AccordionContent className="space-y-5">
                      <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">Extra artifacts</p>
                            <p className="text-xs text-muted-foreground">
                              Provide public URLs with SHA-256. These are embedded into the pinned IPA metadata.
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setArtifacts((prev) => [
                                ...prev,
                                {
                                  id: crypto.randomUUID(),
                                  role: "docs",
                                  uri: "",
                                  hash: "",
                                  mimeType: "application/pdf",
                                  sizeBytes: "",
                                },
                              ])
                            }
                            disabled={busy}
                          >
                            Add artifact
                          </Button>
                        </div>

                        {artifacts.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No extra artifacts.</p>
                        ) : (
                          <div className="space-y-3">
                            {artifacts.map((artifact) => (
                              <div key={artifact.id} className="rounded-md border border-border bg-background p-3 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-sm font-medium text-foreground">Artifact</p>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setArtifacts((prev) => prev.filter((a) => a.id !== artifact.id))}
                                    disabled={busy}
                                  >
                                    Remove
                                  </Button>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="grid gap-2">
                                    <Label htmlFor={`artifact-role-${artifact.id}`}>Role</Label>
                                    <Select
                                      value={artifact.role}
                                      onValueChange={(value) =>
                                        setArtifacts((prev) =>
                                          prev.map((a) =>
                                            a.id === artifact.id ? { ...a, role: value as ArtifactRole } : a,
                                          ),
                                        )
                                      }
                                    >
                                      <SelectTrigger id={`artifact-role-${artifact.id}`} disabled={busy}>
                                        <SelectValue placeholder="Select role" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ARTIFACT_ROLE_OPTIONS.map((opt) => (
                                          <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor={`artifact-mime-${artifact.id}`}>MIME type</Label>
                                    <Input
                                      id={`artifact-mime-${artifact.id}`}
                                      value={artifact.mimeType}
                                      onChange={(e) =>
                                        setArtifacts((prev) =>
                                          prev.map((a) =>
                                            a.id === artifact.id ? { ...a, mimeType: e.target.value } : a,
                                          ),
                                        )
                                      }
                                      placeholder="e.g. application/pdf"
                                      disabled={busy}
                                    />
                                  </div>
                                </div>

                                <div className="grid gap-2">
                                  <Label htmlFor={`artifact-uri-${artifact.id}`}>URL</Label>
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <Input
                                      id={`artifact-uri-${artifact.id}`}
                                      value={artifact.uri}
                                      onChange={(e) =>
                                        setArtifacts((prev) =>
                                          prev.map((a) =>
                                            a.id === artifact.id ? { ...a, uri: e.target.value } : a,
                                          ),
                                        )
                                      }
                                      placeholder="ipfs://… or https://…"
                                      disabled={busy}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      disabled={busy || Boolean(hashJobs[`artifact:${artifact.id}`]) || !artifact.uri.trim()}
                                      onClick={async () => {
                                        const res = await computeHashForUrl(`artifact:${artifact.id}`, artifact.uri);
                                        if (!res) return;
                                        setArtifacts((prev) =>
                                          prev.map((a) =>
                                            a.id === artifact.id
                                              ? {
                                                  ...a,
                                                  hash: res.sha256,
                                                  sizeBytes: typeof res.bytes === "number" ? String(res.bytes) : a.sizeBytes,
                                                  mimeType: res.contentType ?? a.mimeType,
                                                }
                                              : a,
                                          ),
                                        );
                                      }}
                                    >
                                      {hashJobs[`artifact:${artifact.id}`] ? "Hashing…" : "Hash URL"}
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="grid gap-2">
                                    <Label htmlFor={`artifact-hash-${artifact.id}`}>SHA-256</Label>
                                    <Input
                                      id={`artifact-hash-${artifact.id}`}
                                      value={artifact.hash}
                                      onChange={(e) =>
                                        setArtifacts((prev) =>
                                          prev.map((a) => (a.id === artifact.id ? { ...a, hash: e.target.value } : a)),
                                        )
                                      }
                                      placeholder="0x…"
                                      disabled={busy}
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor={`artifact-size-${artifact.id}`}>Size (bytes)</Label>
                                    <Input
                                      id={`artifact-size-${artifact.id}`}
                                      inputMode="numeric"
                                      value={artifact.sizeBytes}
                                      onChange={(e) =>
                                        setArtifacts((prev) =>
                                          prev.map((a) =>
                                            a.id === artifact.id ? { ...a, sizeBytes: e.target.value } : a,
                                          ),
                                        )
                                      }
                                      placeholder="optional"
                                      disabled={busy}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
                        <p className="text-sm font-medium text-foreground">Provenance</p>
                        <CheckboxRow
                          id="capture-signed"
                          checked={captureSigned}
                          onChange={setCaptureSigned}
                          title="Capture signed"
                          description="Enable if you have cryptographic signing/provenance for the capture pipeline."
                          disabled={busy}
                        />

                        <div className="grid gap-2">
                          <Label htmlFor="device-signature">Device signature (optional)</Label>
                          <Input
                            id="device-signature"
                            value={deviceSignature}
                            onChange={(e) => setDeviceSignature(e.target.value)}
                            placeholder="Signature or identifier"
                            disabled={busy}
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="c2pa-uri">C2PA manifest URL (optional)</Label>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                              id="c2pa-uri"
                              value={c2paManifestUri}
                              onChange={(e) => setC2paManifestUri(e.target.value)}
                              placeholder="ipfs://… or https://…"
                              disabled={busy}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              disabled={busy || Boolean(hashJobs["c2pa:manifest"]) || !c2paManifestUri.trim()}
                              onClick={async () => {
                                const res = await computeHashForUrl("c2pa:manifest", c2paManifestUri);
                                if (!res) return;
                                setC2paManifestHash(res.sha256);
                              }}
                            >
                              {hashJobs["c2pa:manifest"] ? "Hashing…" : "Compute hash"}
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="c2pa-hash">C2PA manifest SHA-256 (optional)</Label>
                          <Input
                            id="c2pa-hash"
                            value={c2paManifestHash}
                            onChange={(e) => setC2paManifestHash(e.target.value)}
                            placeholder="0x…"
                            disabled={busy}
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6 lg:col-span-5 xl:col-span-4">
            <div className="space-y-6 lg:sticky lg:top-24">
              <Card id="dataset-review">
                <CardHeader className="space-y-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UploadCloud className="h-4 w-4" />
                    Review & publish
                  </CardTitle>
                  <CardDescription>
                    Choose license terms, confirm requirements, then register the dataset on Story.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!address ? (
                    <Alert variant="warning">
                      <AlertTitle>Wallet required</AlertTitle>
                      <AlertDescription>
                        Connect your wallet to register on Story and list this dataset in the marketplace.
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Dataset type</span>
                      <span className="font-medium text-foreground">{datasetTypeLabel}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Capture method</span>
                      <span className="font-medium text-foreground">{captureMethodLabel}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Modalities</span>
                      <span className="font-medium text-foreground">{modalities.length}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Tags</span>
                      <span className="font-medium text-foreground">{tags.length}</span>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <p className="text-sm font-medium text-foreground">Jump to</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => jumpTo({ sectionId: "dataset-files", focusId: "dataset-file" })}
                      >
                        Files
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => jumpTo({ sectionId: "dataset-metadata", metadataTab: "basics" })}
                      >
                        Metadata
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => jumpTo({ sectionId: "dataset-rights" })}>
                        Rights
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => jumpTo({ sectionId: "dataset-optional" })}>
                        Optional
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="license-preset">License preset</Label>
                    <Select value={licensePreset} onValueChange={(value) => setLicensePreset(value as LicensePreset)}>
                      <SelectTrigger id="license-preset" disabled={busy}>
                        <SelectValue placeholder="Select license preset" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(LICENSE_PRESETS) as LicensePreset[]).map((key) => (
                          <SelectItem key={key} value={key}>
                            {LICENSE_PRESETS[key].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{licenseSummary}</p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">Requirements</p>
                      <Badge variant="outline" className="tabular-nums">
                        {missingCount === 0 ? "Ready" : `${missingCount} missing`}
                      </Badge>
                    </div>
                    <ul className="space-y-1">
                      {requirements.map((item) => (
                        <li key={item.key}>
                          {!item.ok ? (
                            <button
                              type="button"
                              onClick={() => jumpTo(requirementTargets[item.key])}
                              className="flex w-full gap-2 rounded-md p-1 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <CircleAlert className="mt-0.5 h-4 w-4 text-muted-foreground" />
                              <div className="min-w-0">
                                <p className="text-sm text-muted-foreground">{item.title}</p>
                                <p className="text-xs text-muted-foreground">{item.hint}</p>
                              </div>
                            </button>
                          ) : (
                            <div className="flex gap-2 p-1">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                              <p className="text-sm text-foreground">{item.title}</p>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {(uploadDatasetProgress || uploadThumbnailProgress) ? (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-foreground">Upload progress</p>

                        {uploadDatasetProgress ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5" />
                                Dataset sample
                              </span>
                              <span className="tabular-nums">
                                {formatBytes(uploadDatasetProgress.uploadedBytes)} /{" "}
                                {formatBytes(uploadDatasetProgress.totalBytes)}
                              </span>
                            </div>
                            <Progress value={datasetUploadPercent ?? 0} />
                            <p className="text-xs text-muted-foreground">
                              Part {uploadDatasetProgress.partNumber} / {uploadDatasetProgress.totalParts}
                            </p>
                          </div>
                        ) : null}

                        {uploadThumbnailProgress ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <ImageIcon className="h-3.5 w-3.5" />
                                Cover image
                              </span>
                              <span className="tabular-nums">
                                {formatBytes(uploadThumbnailProgress.uploadedBytes)} /{" "}
                                {formatBytes(uploadThumbnailProgress.totalBytes)}
                              </span>
                            </div>
                            <Progress value={thumbnailUploadPercent ?? 0} />
                            <p className="text-xs text-muted-foreground">
                              Part {uploadThumbnailProgress.partNumber} / {uploadThumbnailProgress.totalParts}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : null}

                  {error ? (
                    <Alert variant="destructive">
                      <AlertTitle>Publish failed</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : null}

                  {marketplaceSyncError ? (
                    <Alert variant="warning">
                      <AlertTitle>Marketplace sync failed</AlertTitle>
                      <AlertDescription>{marketplaceSyncError}</AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="flex flex-col gap-2">
                    <Button onClick={onPublishClick} disabled={busy} variant={canPublish ? "default" : "secondary"}>
                      {busy ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {statusLabel}
                        </>
                      ) : canPublish ? (
                        <>
                          <UploadCloud className="h-4 w-4" />
                          Register on Story
                        </>
                      ) : (
                        <>
                          <CircleAlert className="h-4 w-4" />
                          Complete required fields
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDatasetId(crypto.randomUUID());
                        setDatasetFile(null);
                        setThumbnailFile(null);
                        setTitle("");
                        setDescription("");
                        setDatasetType("pov-video");
                        setDatasetVersion("1.0.0");
                        setModalities(["video"]);
                        setTagsInput("");
                        setCaptureMethod("handheld");
                        setCaptureDevice("");
                        setCaptureEnvironment("");
                        setCaptureLighting("");
                        setCaptureFps("");
                        setCaptureResolution("");
                        setLocationPrivacy("coarse");
                        setCaptureCountry("");
                        setCaptureRegion("");
                        setUsageNotes("");
                        setContainsPeople(false);
                        setContainsSensitiveData(false);
                        setRightsConfirmed(false);
                        setModelRelease(false);
                        setPropertyRelease(false);
                        setThirdPartyAudioCleared(false);
                        setReleaseProofs([]);
                        setSensors([]);
                        setHasLabels(false);
                        setLabelFormat("");
                        setLabelTaxonomy("");
                        setLabelingTool("");
                        setLabelManifestUri("");
                        setLabelManifestHash("");
                        setSplitTrain("");
                        setSplitVal("");
                        setSplitTest("");
                        setArtifacts([]);
                        setCaptureSigned(false);
                        setDeviceSignature("");
                        setC2paManifestUri("");
                        setC2paManifestHash("");
                        setLicensePreset("commercial-5");
                        setUploadDatasetProgress(null);
                        setUploadThumbnailProgress(null);
                        setError(null);
                        setMarketplaceSyncError(null);
                        setResult(null);
                        setHashJobs({});
                        setMetadataTab("basics");
                        setShowValidation(false);
                        setPendingScroll(null);
                        setStatus("idle");
                        toast.success("Reset form");
                      }}
                      disabled={status !== "idle" && status !== "success" && status !== "error"}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/80 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
            <Button type="button" variant="outline" size="sm" onClick={() => jumpTo({ sectionId: "dataset-review" })}>
              Review
            </Button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {missingCount === 0 ? "Ready to publish" : `${missingCount} missing`}
              </p>
              <p className="text-xs text-muted-foreground">{busy ? statusLabel : licenseSummary}</p>
            </div>
            <Button
              type="button"
              size="sm"
              className="shrink-0"
              onClick={onPublishClick}
              disabled={busy}
              variant={canPublish ? "default" : "secondary"}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {status === "uploading" ? "Uploading" : "Publishing"}
                </>
              ) : canPublish ? (
                <>
                  <UploadCloud className="h-4 w-4" />
                  Publish
                </>
              ) : (
                <>
                  <CircleAlert className="h-4 w-4" />
                  Fix
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </TooltipProvider>
  );
}
