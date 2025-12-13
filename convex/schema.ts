import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    wallet: v.string(),
    displayName: v.optional(v.string()),
    defaultLicensePreset: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_wallet", ["wallet"]),
  projects: defineTable({
    owner: v.id("users"),
    localId: v.optional(v.string()),
    title: v.string(),
    status: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["owner"])
    .index("by_owner_localId", ["owner", "localId"]),
  assets: defineTable({
    projectId: v.id("projects"),
    kind: v.string(), // sora | upload | text
    url: v.string(),
    thumbUrl: v.optional(v.string()),
    duration: v.optional(v.number()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),
  ipAssets: defineTable({
    projectId: v.id("projects"),
    ipId: v.string(),
    title: v.string(),
    summary: v.string(),
    terms: v.string(),
    videoUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),
    videoSha256: v.optional(v.string()),
    thumbnailSha256: v.optional(v.string()),
    licensorWallet: v.string(),
    licenseTermsId: v.optional(v.string()),
    txHash: v.optional(v.string()),
    chainId: v.optional(v.number()),
    ipMetadataUri: v.optional(v.string()),
    ipMetadataHash: v.optional(v.string()),
    nftMetadataUri: v.optional(v.string()),
    nftMetadataHash: v.optional(v.string()),
    videoKey: v.optional(v.string()),
    thumbnailKey: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_ipId", ["ipId"])
    .index("by_licensorWallet", ["licensorWallet"])
    .index("by_videoSha256", ["videoSha256"])
    .index("by_thumbnailSha256", ["thumbnailSha256"]),
  enforcementReports: defineTable({
    reporterWallet: v.string(),
    targetIpId: v.string(),
    protectedIpId: v.optional(v.string()),
    targetTag: v.string(),
    liveness: v.number(),
    bond: v.optional(v.string()),
    suspectUrl: v.optional(v.string()),
    suspectSha256: v.optional(v.string()),
    suspectFileName: v.optional(v.string()),
    suspectFileType: v.optional(v.string()),
    evidenceCid: v.string(),
    evidenceUri: v.string(),
    disputeId: v.optional(v.string()),
    disputeTxHash: v.optional(v.string()),
    chainId: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_reporterWallet", ["reporterWallet"])
    .index("by_targetIpId", ["targetIpId"]),
  soraJobs: defineTable({
    projectId: v.id("projects"),
    jobId: v.string(),
    status: v.string(),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),
});
