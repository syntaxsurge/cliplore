import { z } from "zod";

const emptyToUndefined = (val: unknown) => (val === "" ? undefined : val);

const clientSchema = z.object({
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
  NEXT_PUBLIC_STORY_RPC_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().default("https://aeneid.storyrpc.io"),
  ),
  NEXT_PUBLIC_STORY_CHAIN_ID: z.preprocess(
    emptyToUndefined,
    z.coerce.number().default(1315),
  ),
  NEXT_PUBLIC_SPG_NFT_CONTRACT_ADDRESS: z.preprocess(
    emptyToUndefined,
    z.string().min(1).default("0x0000000000000000000000000000000000000000"),
  ),
  NEXT_PUBLIC_WIP_TOKEN_ADDRESS: z.preprocess(
    emptyToUndefined,
    z.string().min(1).default("0x0000000000000000000000000000000000000000"),
  ),
  NEXT_PUBLIC_DIFFUSION_LICENSE_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
});

export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  NEXT_PUBLIC_STORY_RPC_URL: process.env.NEXT_PUBLIC_STORY_RPC_URL,
  NEXT_PUBLIC_STORY_CHAIN_ID: process.env.NEXT_PUBLIC_STORY_CHAIN_ID,
  NEXT_PUBLIC_SPG_NFT_CONTRACT_ADDRESS:
    process.env.NEXT_PUBLIC_SPG_NFT_CONTRACT_ADDRESS,
  NEXT_PUBLIC_WIP_TOKEN_ADDRESS: process.env.NEXT_PUBLIC_WIP_TOKEN_ADDRESS,
  NEXT_PUBLIC_DIFFUSION_LICENSE_KEY:
    process.env.NEXT_PUBLIC_DIFFUSION_LICENSE_KEY,
});
