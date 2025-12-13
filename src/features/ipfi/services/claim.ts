"use client";

import type { StoryClient } from "@story-protocol/core-sdk";
import { clientEnv } from "@/lib/env/client";

export async function getClaimableWipRevenue(params: {
  client: StoryClient;
  ipId: `0x${string}`;
  claimer: `0x${string}`;
}) {
  const { client, ipId, claimer } = params;
  return client.royalty.claimableRevenue({
    ipId,
    claimer,
    token: clientEnv.NEXT_PUBLIC_WIP_TOKEN_ADDRESS as `0x${string}`,
  });
}

export async function claimAllWipRevenue(params: {
  client: StoryClient;
  ancestorIpId: `0x${string}`;
  claimer: `0x${string}`;
}) {
  const { client, ancestorIpId, claimer } = params;
  return client.royalty.claimAllRevenue({
    ancestorIpId,
    claimer,
    childIpIds: [],
    royaltyPolicies: [],
    currencyTokens: [clientEnv.NEXT_PUBLIC_WIP_TOKEN_ADDRESS as `0x${string}`],
    claimOptions: {
      autoTransferAllClaimedTokensFromIp: true,
      autoUnwrapIpTokens: true,
    },
  });
}
