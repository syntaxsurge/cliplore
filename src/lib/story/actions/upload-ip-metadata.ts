"use server";

import { uploadJsonToIPFS } from "@/lib/storage/pinata";
import {
  DATASET_SCHEMA_VERSION,
  datasetMetadataSchema,
  type DatasetMetadata,
  type DatasetMetadataInput,
} from "@/lib/story/dataset-metadata";
import {
  buildStoryIpMetadata,
  buildStoryNftMetadata,
  sha256Json,
  uploadIpMetadataSchema,
  type UploadIpMetadataInput,
} from "@/lib/story/ip-metadata";

function isDatasetPayload(
  input: UploadIpMetadataInput,
): input is UploadIpMetadataInput & {
  ipType: "dataset";
  dataset: DatasetMetadataInput;
} {
  return input.ipType === "dataset" && Boolean(input.dataset);
}

function buildDatasetManifest(input: {
  title: string;
  description: string;
  createdAt: string;
  dataset: DatasetMetadataInput;
  media: {
    uri: string;
    hash: string;
    mimeType: string;
    sizeBytes?: number;
  };
  cover?: {
    uri: string;
    hash?: string;
    mimeType: string;
    sizeBytes?: number;
  };
}) {
  const { title, description, createdAt, dataset, media, cover } = input;

  return {
    schemaVersion: "cliplore.dataset.manifest.v1",
    createdAt,
    title,
    description,
    datasetType: dataset.datasetType,
    version: dataset.version,
    modalities: dataset.modalities,
    media,
    cover,
    releases: dataset.releases,
    capture: dataset.capture,
    sensors: dataset.sensors,
    annotations: dataset.annotations,
    splits: dataset.splits,
    artifacts: dataset.artifacts,
    provenance: dataset.provenance,
  };
}

function mergeDatasetArtifacts(
  input: DatasetMetadataInput,
  base: NonNullable<DatasetMetadata["artifacts"]>,
) {
  const merged = [...base, ...(input.artifacts ?? [])];
  const seen = new Set<string>();
  const out: NonNullable<DatasetMetadata["artifacts"]> = [];
  for (const artifact of merged) {
    const key = `${artifact.role}:${artifact.uri}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(artifact);
  }
  return out.length ? out : undefined;
}

export async function uploadIpMetadataAction(input: unknown) {
  const parsed = uploadIpMetadataSchema.parse(input) as UploadIpMetadataInput;

  let enriched: UploadIpMetadataInput = parsed;

  if (isDatasetPayload(parsed)) {
    if (parsed.dataset.schemaVersion !== DATASET_SCHEMA_VERSION) {
      throw new Error(
        `Invalid dataset schemaVersion (expected ${DATASET_SCHEMA_VERSION}).`,
      );
    }

    const createdAt = new Date().toISOString();
    const mediaMimeType = parsed.mediaMimeType ?? "application/octet-stream";

    const manifestPayload = buildDatasetManifest({
      title: parsed.title,
      description: parsed.description,
      createdAt,
      dataset: parsed.dataset,
      media: {
        uri: parsed.mediaUri,
        hash: parsed.mediaHash,
        mimeType: mediaMimeType,
        sizeBytes: parsed.mediaSizeBytes,
      },
      cover: parsed.thumbnailUri
        ? {
            uri: parsed.thumbnailUri,
            hash: parsed.imageHash ?? undefined,
            mimeType: parsed.thumbnailMimeType ?? "image/png",
            sizeBytes: parsed.thumbnailSizeBytes,
          }
        : undefined,
    });

    const manifestUri = await uploadJsonToIPFS(manifestPayload);
    const manifestHash = sha256Json(manifestPayload);

    const baseArtifacts: NonNullable<DatasetMetadata["artifacts"]> = [
      {
        role: "raw",
        uri: parsed.mediaUri,
        hash: parsed.mediaHash,
        mimeType: mediaMimeType,
        sizeBytes: parsed.mediaSizeBytes,
      },
    ];

    if (parsed.thumbnailUri && parsed.imageHash) {
      baseArtifacts.push({
        role: "preview",
        uri: parsed.thumbnailUri,
        hash: parsed.imageHash,
        mimeType: parsed.thumbnailMimeType ?? "image/png",
        sizeBytes: parsed.thumbnailSizeBytes,
      });
    }

    const dataset: DatasetMetadata = datasetMetadataSchema.parse({
      ...parsed.dataset,
      manifest: {
        uri: manifestUri,
        hash: manifestHash,
        format: "json",
      },
      artifacts: mergeDatasetArtifacts(parsed.dataset, baseArtifacts),
    });

    enriched = {
      ...parsed,
      ipType: "dataset",
      tags: Array.from(new Set([...(parsed.tags ?? []), "dataset"])),
      dataset,
    };
  }

  const ipMetadata = buildStoryIpMetadata(enriched);
  const nftMetadata = buildStoryNftMetadata(enriched);

  const [ipMetadataUri, nftMetadataUri] = await Promise.all([
    uploadJsonToIPFS(ipMetadata),
    uploadJsonToIPFS(nftMetadata),
  ]);

  return {
    ipMetadataUri,
    nftMetadataUri,
    ipMetadataHash: sha256Json(ipMetadata),
    nftMetadataHash: sha256Json(nftMetadata),
  };
}
