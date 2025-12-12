import { defineChain } from "viem";
import { clientEnv } from "../env/client";

export const storyAeneid = defineChain({
  id: clientEnv.NEXT_PUBLIC_STORY_CHAIN_ID,
  name: "Story Aeneid",
  nativeCurrency: {
    decimals: 18,
    name: "WIP",
    symbol: "WIP",
  },
  rpcUrls: {
    default: { http: [clientEnv.NEXT_PUBLIC_STORY_RPC_URL] },
    public: { http: [clientEnv.NEXT_PUBLIC_STORY_RPC_URL] },
  },
  blockExplorers: {
    default: {
      name: "Story Explorer",
      url: "https://explorer.story.foundation/",
    },
  },
});
