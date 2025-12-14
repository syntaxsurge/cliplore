import { z } from "zod";

const uriSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      value.startsWith("ipfs://") ||
      value.startsWith("https://") ||
      value.startsWith("http://"),
    { message: "Must be an ipfs:// or http(s):// URI" },
  );

const hashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, {
  message: "Must be a 0x-prefixed 32-byte hex hash",
});

export const DATASET_SCHEMA_VERSION = "cliplore.dataset.v1" as const;

export const datasetTypeSchema = z.enum([
  "pov-video",
  "drone-footage",
  "stereo-video",
  "mocap",
  "robotics-teleop",
  "industrial-sensor",
  "medical-imaging",
  "mixed",
]);

export type DatasetType = z.infer<typeof datasetTypeSchema>;

export const datasetModalitySchema = z.enum([
  "video",
  "audio",
  "image",
  "depth",
  "imu",
  "lidar",
  "pose",
  "text",
  "events",
]);

export type DatasetModality = z.infer<typeof datasetModalitySchema>;

export const datasetCaptureMethodSchema = z.enum([
  "handheld",
  "drone",
  "tripod",
  "multicam",
  "screen-record",
  "robot-mounted",
  "other",
]);

export const datasetLocationPrivacySchema = z.enum([
  "none",
  "coarse",
  "redacted",
]);

export const datasetCaptureSchema = z
  .object({
    captureMethod: datasetCaptureMethodSchema.optional(),
    device: z.string().min(1).max(140).optional(),
    environment: z.string().min(1).max(140).optional(),
    lighting: z.string().min(1).max(140).optional(),
    fps: z.number().positive().optional(),
    resolution: z.string().min(1).max(64).optional(),
    location: z
      .object({
        privacyLevel: datasetLocationPrivacySchema.optional(),
        country: z.string().min(2).max(56).optional(),
        region: z.string().min(1).max(80).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const datasetSensorTypeSchema = z.enum([
  "rgb-camera",
  "stereo-camera",
  "thermal",
  "depth",
  "imu",
  "lidar",
  "microphone",
  "other",
]);

export const datasetSensorSchema = z
  .object({
    sensorType: datasetSensorTypeSchema,
    make: z.string().min(1).max(80).optional(),
    model: z.string().min(1).max(80).optional(),
    lens: z.string().min(1).max(80).optional(),
    calibration: z
      .object({
        calibrationUrl: uriSchema,
        calibrationHash: hashSchema.optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const datasetReleaseProofTypeSchema = z.enum([
  "model",
  "property",
  "music",
  "other",
]);

export const datasetReleaseProofSchema = z
  .object({
    type: datasetReleaseProofTypeSchema,
    uri: uriSchema,
    hash: hashSchema.optional(),
  })
  .passthrough();

export const datasetReleasesSchema = z
  .object({
    rightsConfirmed: z.boolean(),
    containsPeople: z.boolean().optional(),
    containsSensitiveData: z.boolean().optional(),
    modelRelease: z.boolean().optional(),
    propertyRelease: z.boolean().optional(),
    thirdPartyAudioCleared: z.boolean().optional(),
    releaseProofs: z.array(datasetReleaseProofSchema).max(20).optional(),
  })
  .passthrough();

export const datasetAnnotationsSchema = z
  .object({
    hasLabels: z.boolean().optional(),
    labelFormat: z.string().min(1).max(80).optional(),
    labelTaxonomy: z.string().min(1).max(240).optional(),
    labelingTool: z.string().min(1).max(80).optional(),
    labelManifest: z
      .object({
        uri: uriSchema,
        hash: hashSchema.optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const datasetSplitsSchema = z
  .object({
    train: z.number().int().nonnegative().optional(),
    val: z.number().int().nonnegative().optional(),
    test: z.number().int().nonnegative().optional(),
  })
  .passthrough();

export const datasetManifestFormatSchema = z.enum([
  "jsonl",
  "json",
  "parquet",
  "csv",
  "tar-index",
  "custom",
]);

export type DatasetManifestFormat = z.infer<typeof datasetManifestFormatSchema>;

export const datasetManifestPointerSchema = z
  .object({
    uri: uriSchema,
    hash: hashSchema,
    format: datasetManifestFormatSchema,
  })
  .passthrough();

export const datasetArtifactRoleSchema = z.enum([
  "preview",
  "raw",
  "labels",
  "calibration",
  "docs",
  "checksums",
]);

export type DatasetArtifactRole = z.infer<typeof datasetArtifactRoleSchema>;

export const datasetArtifactSchema = z
  .object({
    role: datasetArtifactRoleSchema,
    uri: uriSchema,
    hash: hashSchema,
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().nonnegative().optional(),
  })
  .passthrough();

export const datasetProvenanceSchema = z
  .object({
    captureSigned: z.boolean().optional(),
    deviceSignature: z.string().min(1).max(240).optional(),
    c2pa: z
      .object({
        manifestUri: uriSchema,
        manifestHash: hashSchema.optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const datasetMetadataBaseSchema = z
  .object({
    schemaVersion: z.literal(DATASET_SCHEMA_VERSION),
    datasetType: datasetTypeSchema,
    version: z.string().min(1).max(32),
    modalities: z.array(datasetModalitySchema).min(1).max(16),
    capture: datasetCaptureSchema.optional(),
    sensors: z.array(datasetSensorSchema).max(20).optional(),
    releases: datasetReleasesSchema,
    annotations: datasetAnnotationsSchema.optional(),
    splits: datasetSplitsSchema.optional(),
    artifacts: z.array(datasetArtifactSchema).max(40).optional(),
    provenance: datasetProvenanceSchema.optional(),
    usageNotes: z.string().min(1).max(560).optional(),
  })
  .passthrough();

export const datasetMetadataSchema = datasetMetadataBaseSchema.extend({
  manifest: datasetManifestPointerSchema,
});

export const datasetMetadataInputSchema = datasetMetadataBaseSchema.extend({
  manifest: datasetManifestPointerSchema.optional(),
});

export type DatasetMetadata = z.infer<typeof datasetMetadataSchema>;
export type DatasetMetadataInput = z.infer<typeof datasetMetadataInputSchema>;

