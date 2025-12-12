## Cliplore

Cliplore is a Sora-powered, IP-native video studio built on Next.js. It combines Remotion for real-time preview, ffmpeg.wasm for high-quality exports, and Story Protocol integration so every final cut can be registered and licensed on-chain.

## Features

- 🎞️ Real-time Preview: Remotion-based preview so edits are instant.
- 🧰 Browser render: Export with ffmpeg.wasm (CPU) or Diffusion Studio Core (hardware‑accelerated WebCodecs) for faster final renders.
- 🤖 Sora generation: Server-side Videos API endpoints to create and poll Sora jobs.
- 🪪 Story IP: Helpers to register IP Assets, attach PIL terms, and mint license tokens on Story.
- 👤 Wallet + profile: `/sign-in` links a wallet, saves a Convex-backed profile, and sets default license presets.
- 📊 Dashboard: `/dashboard` surfaces wallet status, Convex project/IP stats, and quick links into the editor.
- 🪙 IP registration: `/projects/[id]/ip` uploads metadata to IPFS and registers IP Assets on Story via the connected wallet with commercial/noncommercial presets.
- 💸 Monetization: `/projects/[id]/monetization` sends tips (`payRoyaltyOnBehalf`), checks claimable revenue, and triggers `claimAllRevenue`.
- 🧪 Demo-friendly: load a sample project with a single click on `/projects` to try the timeline without uploading media.
- 🕹️ Timeline editor: Arrange, trim, and control media through the custom timeline.
- 🛠️ Element controls: Adjust position, opacity, z-index, volume, and text overlays.
- 🔌 Wallet-ready: Wagmi + RainbowKit wired to Story testnet.

## Installation

Clone the repo, install dependencies:

```bash
pnpm install
```
Then run the development server:
```bash
pnpm run dev
```
Or build and start in production mode:

```bash
pnpm run build
pnpm start
```

Convex endpoints (profile + project stats) use `NEXT_PUBLIC_CONVEX_URL`. Point this at your Convex deployment URL; the project includes functions for users and projects under `convex/functions`.

Alternatively, use Docker:

```bash
# Build the Docker image
docker build -t cliplore .

# Run the container
docker run -p 3000:3000 cliplore
```
Then navigate to [http://localhost:3000](http://localhost:3000)

### Environment

Set these in `.env.local`:

```
OPENAI_API_KEY=sk-...
PINATA_JWT=Bearer ...

CONVEX_DEPLOYMENT=dev:your-deployment-slug # used by Convex CLI for local dev
CONVEX_RESET_TOKEN= # optional, required for `pnpm run convex:reset`
CONVEX_RESET_BATCH=128

NEXT_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
NEXT_PUBLIC_STORY_RPC_URL=https://aeneid.storyrpc.io
NEXT_PUBLIC_STORY_CHAIN_ID=1315
NEXT_PUBLIC_SPG_NFT_CONTRACT_ADDRESS=0x... # SPG collection to mint into
NEXT_PUBLIC_WIP_TOKEN_ADDRESS=0x... # WIP token for PIL mint fees
NEXT_PUBLIC_DIFFUSION_LICENSE_KEY=... # optional, removes Diffusion Core watermark for GPU renders
```
