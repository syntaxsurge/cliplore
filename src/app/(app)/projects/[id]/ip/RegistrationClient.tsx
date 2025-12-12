"use client";

import { useState, useTransition } from "react";
import { PILFlavor } from "@story-protocol/core-sdk";
import { parseEther } from "viem";
import { useStoryClient } from "@/lib/story/useStoryClient";
import { createConvexIpAsset } from "@/lib/api/convex";
import { uploadIpMetadataAction } from "./actions";
import { clientEnv } from "@/lib/env/client";
import { useAccount } from "wagmi";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import Link from "next/link";

type LicensePreset = "commercial-5" | "commercial-10" | "noncommercial";

const LICENSE_PRESETS: Record<
  LicensePreset,
  { label: string; share?: number; fee?: string }
> = {
  "commercial-5": {
    label: "Commercial remix · 5% rev share · 1 WIP fee",
    share: 5,
    fee: "1",
  },
  "commercial-10": {
    label: "Commercial remix · 10% rev share · 1 WIP fee",
    share: 10,
    fee: "1",
  },
  noncommercial: { label: "Non-commercial remix", share: 0 },
};

type Props = { projectId: string };

export default function RegistrationClient({ projectId }: Props) {
  const { getClient } = useStoryClient();
  const { address } = useAccount();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [license, setLicense] = useState<LicensePreset>("commercial-5");
  const [status, setStatus] = useState<
    "idle" | "uploading" | "registering" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [ipId, setIpId] = useState<string | null>(null);
  const [licenseTermsId, setLicenseTermsId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIpId(null);
    setLicenseTermsId(null);
    try {
      setStatus("uploading");
      const meta = await uploadIpMetadataAction({
        title,
        description,
        videoUrl,
        thumbnailUrl,
      });

      const client = await getClient();
      const preset = LICENSE_PRESETS[license];
      const terms =
        preset.share && preset.share > 0
          ? PILFlavor.commercialRemix({
              commercialRevShare: preset.share,
              defaultMintingFee: parseEther(preset.fee ?? "1"),
              currency:
                clientEnv.NEXT_PUBLIC_WIP_TOKEN_ADDRESS as `0x${string}`,
            })
          : PILFlavor.nonCommercialSocialRemixing();

      setStatus("registering");
      const res = await client.ipAsset.registerIpAsset({
        nft: {
          type: "mint",
          spgNftContract:
            clientEnv.NEXT_PUBLIC_SPG_NFT_CONTRACT_ADDRESS as `0x${string}`,
        },
        ipMetadata: {
          ipMetadataURI: meta.ipMetadataURI,
          ipMetadataHash: meta.ipMetadataHash,
          nftMetadataURI: meta.nftMetadataURI,
          nftMetadataHash: meta.nftMetadataHash,
        },
        licenseTermsData: [
          {
            terms,
          },
        ],
      });

      const mintedIpId = (res.ipId as string | undefined) ?? null;
      setIpId(mintedIpId);
      const ltId =
        (res.licenseTermsIds && res.licenseTermsIds[0]?.toString()) ?? null;
      setLicenseTermsId(ltId);

      if (mintedIpId && address) {
        try {
          await createConvexIpAsset({
            wallet: address,
            localProjectId: projectId,
            ipId: mintedIpId,
            title,
            summary: description,
            terms: preset.label,
            videoUrl,
            thumbnailUrl: thumbnailUrl || undefined,
            licenseTermsId: ltId || undefined,
            txHash: (res as any).txHash,
          });
        } catch (err) {
          console.debug("Convex IP asset sync failed", err);
        }
      }

      setStatus("success");
      setMessage("IP registered on Story Protocol.");
    } catch (error: any) {
      console.error(error);
      setStatus("error");
      setMessage(error?.message ?? "Failed to register IP.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Project</p>
        <h1 className="text-3xl font-semibold text-foreground">
          Register IP Asset
        </h1>
        <p className="text-muted-foreground">
          Finalize your render, upload metadata to IPFS, and mint + register an
          IP Asset on Story with attached PIL terms. Project ID: {projectId}
        </p>
      </div>

      <form
        onSubmit={(e) => startTransition(() => handleRegister(e))}
        className="space-y-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Neon courier edit"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="videoUrl">Video URL</Label>
            <Input
              id="videoUrl"
              required
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://your-cdn.com/final.mp4"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short summary of this cut and what remixers can do."
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="thumbnailUrl">Thumbnail URL (optional)</Label>
            <Input
              id="thumbnailUrl"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://your-cdn.com/thumb.jpg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="license">License terms</Label>
            <select
              id="license"
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              value={license}
              onChange={(e) => setLicense(e.target.value as LicensePreset)}
            >
              {Object.entries(LICENSE_PRESETS).map(([value, preset]) => (
                <option key={value} value={value} className="text-black">
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Status:{" "}
              <span className="font-semibold text-foreground">
                {status === "idle" && "Idle"}
                {status === "uploading" && "Uploading metadata to IPFS"}
                {status === "registering" && "Registering on-chain"}
                {status === "success" && "Success"}
                {status === "error" && "Error"}
              </span>
            </p>
            {message && (
              <p
                className={`text-sm ${
                  status === "error"
                    ? "text-destructive"
                    : "text-emerald-600 dark:text-emerald-300"
                }`}
              >
                {message}
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={
              isPending || status === "uploading" || status === "registering"
            }
            className="min-w-[200px]"
          >
            {status === "uploading"
              ? "Uploading..."
              : status === "registering"
                ? "Registering..."
                : "Register IP on Story"}
          </Button>
        </div>
      </form>

      {(ipId || licenseTermsId) && (
        <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {ipId && <Badge variant="outline">IP ID: {ipId}</Badge>}
            {licenseTermsId && (
              <Badge variant="outline">
                License Terms ID: {licenseTermsId}
              </Badge>
            )}
          </div>
          {ipId && (
            <Link
              href={`https://explorer.story.foundation/ip-assets/${ipId}`}
              target="_blank"
              className="text-sm text-emerald-600 dark:text-emerald-300 hover:underline"
            >
              View on Story Explorer
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
