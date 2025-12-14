"use client";

import { useMemo, useState } from "react";
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
import { formatBytes } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type DatasetType = "pov" | "drone" | "mocap" | "robotics" | "medical" | "other";

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

function parseTags(input: string) {
  const tags = input
    .split(/[,\n]/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 32);
  return Array.from(new Set(tags));
}

function CheckboxRow(props: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label htmlFor={props.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
      <input
        id={props.id}
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-primary"
      />
      <span className="space-y-1">
        <span className="block text-sm font-medium text-foreground">{props.title}</span>
        <span className="block text-xs text-muted-foreground">{props.description}</span>
      </span>
    </label>
  );
}

export default function DatasetPublishClient() {
  const { address } = useAccount();
  const client = useStoryClient();

  const [datasetId, setDatasetId] = useState(() => crypto.randomUUID());

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [datasetType, setDatasetType] = useState<DatasetType>("pov");
  const [tagsInput, setTagsInput] = useState("");
  const tags = useMemo(() => parseTags(tagsInput), [tagsInput]);

  const [captureDevice, setCaptureDevice] = useState("");
  const [captureLocation, setCaptureLocation] = useState("");
  const [usageNotes, setUsageNotes] = useState("");

  const [containsPeople, setContainsPeople] = useState(false);
  const [containsSensitiveData, setContainsSensitiveData] = useState(false);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);

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

  const canPublish = Boolean(
    address &&
      datasetFile &&
      thumbnailFile &&
      title.trim().length >= 3 &&
      description.trim().length >= 5 &&
      rightsConfirmed &&
      status !== "hashing" &&
      status !== "uploading" &&
      status !== "pinning" &&
      status !== "registering" &&
      status !== "syncing",
  );

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
        dataset: {
          type: datasetType,
          tags,
          captureDevice: captureDevice.trim() || undefined,
          captureLocation: captureLocation.trim() || undefined,
          usageNotes: usageNotes.trim() || undefined,
          containsPeople,
          containsSensitiveData,
          rightsConfirmed: true,
        },
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Data track</p>
          <h1 className="text-4xl font-semibold text-foreground">Publish dataset</h1>
          <p className="max-w-2xl text-muted-foreground">
            Upload a rights-cleared sample, pin Story IPA metadata to IPFS, register on Story, and
            list it for licensing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status === "error" ? "warning" : status === "success" ? "success" : "outline"}>
            {statusLabel}
          </Badge>
          <Button asChild variant="outline">
            <Link href="/datasets">Back to datasets</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1) Files</CardTitle>
          <CardDescription>Primary data sample + cover image for marketplace previews.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="dataset-file">Dataset sample</Label>
            <Input
              id="dataset-file"
              type="file"
              onChange={(e) => setDatasetFile(e.target.files?.[0] ?? null)}
            />
            {datasetFile ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{datasetFile.type || "application/octet-stream"}</Badge>
                <Badge variant="outline">{formatBytes(datasetFile.size)}</Badge>
                <Badge variant="outline">{datasetFile.name}</Badge>
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
            />
            {thumbnailFile ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{thumbnailFile.type || "image/png"}</Badge>
                <Badge variant="outline">{formatBytes(thumbnailFile.size)}</Badge>
                <Badge variant="outline">{thumbnailFile.name}</Badge>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2) Metadata</CardTitle>
          <CardDescription>Structured fields to improve search, licensing, and provenance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this sample? How was it captured? What’s allowed/restricted?"
              className="min-h-[110px]"
            />
          </div>

          <div className="grid gap-2">
            <Label>Dataset type</Label>
            <div className="flex flex-wrap gap-2">
              {(["pov", "drone", "mocap", "robotics", "medical", "other"] as const).map((t) => (
                <Button
                  key={t}
                  type="button"
                  size="sm"
                  variant={datasetType === t ? "default" : "outline"}
                  onClick={() => setDatasetType(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Comma-separated (e.g. pov, outdoors, handheld)"
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

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="capture-device">Capture device</Label>
              <Input
                id="capture-device"
                value={captureDevice}
                onChange={(e) => setCaptureDevice(e.target.value)}
                placeholder="e.g. GoPro Hero 12, DJI Air 3, Quest 3"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="capture-location">Capture location</Label>
              <Input
                id="capture-location"
                value={captureLocation}
                onChange={(e) => setCaptureLocation(e.target.value)}
                placeholder="e.g. Tokyo, indoor lab, coastal trail"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="usage-notes">Usage notes</Label>
            <Textarea
              id="usage-notes"
              value={usageNotes}
              onChange={(e) => setUsageNotes(e.target.value)}
              placeholder="Any constraints, model-training intent, or special handling notes."
              className="min-h-[90px]"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3) Rights & safety</CardTitle>
          <CardDescription>These confirmations are embedded into IPA metadata under `dataset`.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <CheckboxRow
            id="rights-confirmed"
            checked={rightsConfirmed}
            onChange={setRightsConfirmed}
            title="I have the rights to license this data sample"
            description="You own the content and/or have releases/consent required to grant Story license terms."
          />
          <CheckboxRow
            id="contains-people"
            checked={containsPeople}
            onChange={setContainsPeople}
            title="Contains identifiable people"
            description="Used to signal that releases/consent may be required for downstream use."
          />
          <CheckboxRow
            id="contains-sensitive"
            checked={containsSensitiveData}
            onChange={setContainsSensitiveData}
            title="Contains sensitive data"
            description="Examples: medical info, biometrics, license plates, or other personal identifiers."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4) License preset</CardTitle>
          <CardDescription>Attached on-chain as PIL terms during registration.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {(Object.keys(LICENSE_PRESETS) as LicensePreset[]).map((key) => (
            <Button
              key={key}
              type="button"
              variant={licensePreset === key ? "default" : "outline"}
              onClick={() => setLicensePreset(key)}
              className="justify-start"
            >
              {LICENSE_PRESETS[key].label}
            </Button>
          ))}
        </CardContent>
      </Card>

      {uploadDatasetProgress || uploadThumbnailProgress ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload progress</CardTitle>
            <CardDescription>Backblaze B2 upload (single or multipart).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {uploadDatasetProgress ? (
              <div>
                Dataset: {formatBytes(uploadDatasetProgress.uploadedBytes)} /{" "}
                {formatBytes(uploadDatasetProgress.totalBytes)} · Part{" "}
                {uploadDatasetProgress.partNumber} / {uploadDatasetProgress.totalParts}
              </div>
            ) : null}
            {uploadThumbnailProgress ? (
              <div>
                Cover: {formatBytes(uploadThumbnailProgress.uploadedBytes)} /{" "}
                {formatBytes(uploadThumbnailProgress.totalBytes)} · Part{" "}
                {uploadThumbnailProgress.partNumber} / {uploadThumbnailProgress.totalParts}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {marketplaceSyncError ? (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {marketplaceSyncError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void handlePublish()} disabled={!canPublish}>
          Register dataset on Story
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
            setDatasetType("pov");
            setTagsInput("");
            setCaptureDevice("");
            setCaptureLocation("");
            setUsageNotes("");
            setContainsPeople(false);
            setContainsSensitiveData(false);
            setRightsConfirmed(false);
            setLicensePreset("commercial-5");
            setUploadDatasetProgress(null);
            setUploadThumbnailProgress(null);
            setError(null);
            setMarketplaceSyncError(null);
            setResult(null);
            setStatus("idle");
            toast.success("Reset form");
          }}
          disabled={status !== "idle" && status !== "success" && status !== "error"}
        >
          Reset
        </Button>
      </div>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>Published</CardTitle>
            <CardDescription>Your dataset is registered on Story and ready to license.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success">IP ID</Badge>
              <code className="break-all rounded-md bg-muted px-2 py-1 text-xs text-foreground">
                {result.ipId}
              </code>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <a href={getStoryIpaExplorerUrl({ ipId: result.ipId })} target="_blank" rel="noreferrer">
                  Open Story Explorer
                </a>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link href={`/datasets/${encodeURIComponent(result.ipId)}`}>View dataset page</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
