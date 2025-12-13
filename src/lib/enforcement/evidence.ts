import { z } from "zod";

const evmAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const sha256Hex = z.string().regex(/^0x[a-fA-F0-9]{64}$/);

export const evidenceBundleSchema = z
  .object({
    schema: z.literal("cliplore.enforcement.evidence.v1"),
    createdAt: z.string().datetime(),
    reporterWallet: evmAddress,
    targetIpId: evmAddress,
    protectedIpId: evmAddress.optional(),
    targetTag: z.string().min(1),
    suspect: z.object({
      url: z.string().url().optional(),
      sha256: sha256Hex.optional(),
      fileName: z.string().min(1).max(512).optional(),
      fileType: z.string().min(1).max(256).optional(),
      bytes: z.number().int().nonnegative().optional(),
    }),
    verification: z
      .object({
        c2pa: z
          .object({
            present: z.boolean(),
            activeManifestLabel: z.string().min(1).max(256).optional(),
            issuer: z.string().min(1).max(512).optional(),
          })
          .optional(),
      })
      .optional(),
    notes: z.string().max(5000).optional(),
  })
  .refine((val) => Boolean(val.suspect.url || val.suspect.sha256), {
    message: "Provide suspect.url or suspect.sha256",
    path: ["suspect"],
  });

export type EvidenceBundle = z.infer<typeof evidenceBundleSchema>;

