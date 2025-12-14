import { clientEnv } from "@/lib/env/client";

const STORY_AENEID_CHAIN_ID = 1315;

export function getStoryProtocolExplorerBaseUrl(chainId: number) {
  if (chainId === STORY_AENEID_CHAIN_ID) {
    return "https://aeneid.explorer.story.foundation";
  }
  return "https://explorer.story.foundation";
}

export function getStoryProtocolTxExplorerBaseUrl(chainId: number) {
  if (chainId === STORY_AENEID_CHAIN_ID) {
    return "https://aeneid.storyscan.io";
  }
  return "https://storyscan.io";
}

export function getStoryIpaExplorerUrl(params: {
  ipId: string;
  chainId?: number;
}) {
  const chainId = params.chainId ?? clientEnv.NEXT_PUBLIC_STORY_CHAIN_ID;
  const baseUrl = getStoryProtocolExplorerBaseUrl(chainId);
  return `${baseUrl}/ipa/${encodeURIComponent(params.ipId)}`;
}

export function getStoryTxExplorerUrl(params: {
  txHash: string;
  chainId?: number;
}) {
  const chainId = params.chainId ?? clientEnv.NEXT_PUBLIC_STORY_CHAIN_ID;
  const baseUrl = getStoryProtocolTxExplorerBaseUrl(chainId);
  return `${baseUrl}/tx/${encodeURIComponent(params.txHash)}`;
}
