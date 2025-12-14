After you finish every task, I want you to give me one line or one sentence GitHub commit message so that I can manually commit all of the changes that you've done using the commit message in just one line or one sentence.

# Agent Playbook (Living Document)

This file is the authoritative reference for platform architecture and agent expectations. It must always describe the current, production-ready state of the system—never legacy behavior. Update this file alongside any material feature change. Only capture structural, user-visible, or integration-impacting details; omit trivia. When we remove/replace something, like a feature, I DO NOT want you to document the removal or replacement here, but instead, if that feature is documented here currently, I want you to just remove it if we done removal and replace it with teh new feature if we did replacement. The reason is that I only want to support latest versions of my application here without documenting the previous iterations, this file should serve as the current machination explanation of my codebase and not for changelogs. If any previous version explanation is present here, then it should be removed. Do not also imply that we just implemented a certain feature here, by using words like "we now have this X feature" since I only want to imply that the features we have iin our application was in here already initially, without any implications of the new changes we made.

## Documentation Expectations

- Update this document whenever routes, flows, data contracts, or integration requirements change.
- Describe the latest behavior succinctly; avoid references to prior implementations.
- Skip minor cosmetic tweaks—limit entries to structural or behavioral updates that affect future engineering work.

## Engineering Principles

1. **Import cleanly, delete legacy.** Never add re‑exports or preserve legacy APIs. Always import from canonical sources and remove unused branches, empty blocks, or deprecated files during every change.

2. **Extend before you create.** Before writing new functions, components, or libraries, analyze existing ones in `src/lib`, shared UI, and feature modules. Check related files for possible extension points—props, return types, or configuration options. Prefer enhancing them by adding parameters or return variants rather than duplicating logic. Only build something new when there’s *no existing code* that can be extended without harm.

3. **Simplify through reuse.** If you or the AI analysis discover that a piece of code can be simplified by calling an existing component, function, or library instead of re‑implementing logic, refactor it. Merge redundant utilities or components when their behavior overlaps and eliminate unnecessary abstractions. The codebase should always converge toward fewer, more capable building blocks.

4. **Be minimal and accessible.** All new pages and components should follow the modern, minimal UI style—clean, responsive, and accessible (ARIA labels, focus states, keyboard navigation, color contrast). Avoid over‑engineering or speculative flexibility.

5. **Type‑sound and consistent.** Run `pnpm typecheck` before merging. Maintain consistent naming, small API surfaces, and clear defaults. Remove unused files and ensure new or extended helpers live in canonical locations to encourage immediate reuse. Also run `pnpm build` after all changes you made and fix all errors before finalizing everything.

### Examples

* Instead of creating `formatDate2`, extend `formatDate` with `options: { locale?: string; format?: string }`.
* Replace custom loaders with an existing `Spinner` component configured via props rather than duplicating markup.
* If two button variants differ only in color and spacing, merge them into one component with configurable variants.
* When adding a new fetch utility, inspect existing APIs—if a related `fetchData` exists, add optional parameters or expand return types instead of building another function.

### Guiding Mindset

Analyze → Extend → Simplify → Delete. Every change should either improve clarity, reduce duplication, or enable reuse. Only create new code when absolutely necessary and back it with clear reasoning in the PR description.

# Next.js 15 App Router Project Structure Guide

You are an AI coding assistant that builds **production-grade, scalable Next.js 15 App Router** applications.

When creating or editing a project, assume this blueprint as the default unless explicitly told otherwise:

- Use **Next.js 15** with the **App Router** under `src/app`.
- Use **TypeScript** everywhere (`.ts`, `.tsx`).
- Use a **`src/`-based layout**: application code under `src`, configuration at the project root.
- Treat components in `app/` as **Server Components by default**; add `"use client"` only when necessary.
- Use **`middleware.ts`** at `src/middleware.ts` to run logic before a request is completed (auth, redirects, rewrites, logging).
- Manage environment variables with **workspace-scoped `.env` files**:
  - Root `.env.local` / `.env.*` for the Next.js app and cross-cutting services.
  - `blockchain/.env` for on-chain tooling (Hardhat/Foundry), with `blockchain/.env.example` as a template.
- Support **at most one off-chain backend stack per project** (or none):
  - **Supabase + Drizzle/Postgres** (SQL stack), or  
  - **Convex** (managed backend stack).
- Optionally support a **blockchain workspace** under `blockchain/`:
  - **Hardhat** *or* **Foundry** as the primary smart-contract tool (choose at most one by default),
  - A shared `blockchain/contracts/` folder as the canonical Solidity source of truth,
  - Optional frontend integration in `src/lib/contracts/`.
- Keep **caching explicit** in Next.js 15:
  - `GET` Route Handlers are **not cached by default**.
  - `fetch` is **`no-store` by default** in many server contexts.
  - Opt into caching via route segment config (`dynamic`, `revalidate`, etc.) and `fetch` options.
  - Centralize caching decisions in a small number of modules instead of scattering them.

Everything below defines **where to place each file**, **what belongs in each folder**, and **how to avoid redundant files**.

---

## 1. Target Project Tree (Baseline Template)

Use this as the **default template**. Extend or trim as needed. Folders marked `# OPTIONAL` are add-ons.

~~~txt
.
├─ public/
│  ├─ favicon.ico
│  ├─ icons/
│  ├─ images/
│  └─ manifest.webmanifest
├─ blockchain/                   # OPTIONAL: smart-contract workspace (only if using blockchain)
│  ├─ .env.example               # Template for blockchain/.env (Hardhat/Foundry secrets)
│  ├─ contracts/                 # Shared Solidity contracts (source of truth)
│  ├─ hardhat/                   # OPTIONAL: choose Hardhat OR Foundry (not both by default)
│  │  ├─ hardhat.config.ts
│  │  ├─ package.json
│  │  ├─ scripts/
│  │  ├─ test/
│  │  ├─ ignition/               # OPTIONAL: Hardhat Ignition modules
│  │  ├─ artifacts/              # generated (usually gitignored)
│  │  └─ cache/                  # generated (usually gitignored)
│  └─ foundry/                   # OPTIONAL: choose Foundry OR Hardhat (not both by default)
│     ├─ foundry.toml
│     ├─ script/
│     ├─ test/
│     ├─ lib/
│     ├─ out/                    # generated (build output, often gitignored)
│     └─ cache/                  # generated (often gitignored)
├─ drizzle/                      # OPTIONAL: Drizzle SQL migrations output
├─ supabase/                     # OPTIONAL: Supabase CLI config + SQL migrations
│  ├─ config.toml
│  └─ migrations/
├─ convex/                       # OPTIONAL: Convex backend (schema + functions)
│  ├─ schema.ts
│  ├─ functions/
│  └─ auth/
├─ scripts/                      # One-off CLIs and dev helpers
│  ├─ convex-dev.cjs             # Starts Convex dev server
│  ├─ disable-sentry.cjs         # Disables Sentry for local/dev builds
│  └─ reset-convex.ts            # Resets Convex tables via admin mutation
├─ infra/                        # IaC: Terraform/Pulumi/Docker/etc.
├─ docs/                         # Architecture docs, ADRs, runbooks
├─ e2e/                          # Playwright/Cypress tests
├─ .github/
│  └─ workflows/                 # CI/CD pipelines
├─ .gitignore                    # Git ignore rules
├─ package.json
├─ next.config.js                # Next.js config
├─ tsconfig.json                 # TypeScript config
├─ postcss.config.js             # PostCSS/Tailwind pipeline
├─ tailwind.config.ts            # Tailwind theme (if used)
├─ .eslintrc.json                # ESLint config
├─ .env.example                  # Documented root env variables (Next.js + services)
├─ next-env.d.ts                 # Generated by Next
└─ src/
   ├─ app/
   │  ├─ (marketing)/            # Marketing / public routes
   │  │  ├─ layout.tsx
   │  │  ├─ page.tsx
   │  │  └─ ...
   │  ├─ (app)/                  # Authenticated workspace routes
   │  │  ├─ layout.tsx
   │  │  ├─ dashboard/
   │  │  │  ├─ page.tsx
   │  │  │  └─ components/
   │  │  └─ settings/
   │  │     ├─ page.tsx
   │  │     └─ components/
   │  ├─ (auth)/                 # Sign-in / sign-up / reset flows
   │  │  ├─ layout.tsx
   │  │  ├─ sign-in/
   │  │  │  └─ page.tsx
   │  │  └─ sign-up/
   │  │     └─ page.tsx
   │  ├─ api/                    # Route Handlers (server-only endpoints)
   │  │  ├─ auth/
   │  │  │  └─ route.ts
   │  │  ├─ webhooks/
   │  │  │  └─ route.ts
   │  │  └─ health/
   │  │     └─ route.ts
   │  ├─ layout.tsx              # Root layout (wraps entire app)
   │  ├─ page.tsx                # "/" route (usually marketing home)
   │  ├─ loading.tsx             # Root loading UI
   │  ├─ error.tsx               # Root segment error boundary
   │  ├─ global-error.tsx        # Global error boundary
   │  ├─ not-found.tsx           # 404 for App Router
   │  ├─ sitemap.ts              # Dynamic sitemap
   │  └─ robots.ts               # Dynamic robots.txt
   ├─ components/                # Cross-route, reusable UI
   │  ├─ ui/                     # Design-system primitives (Button, Input, Dialog)
   │  ├─ layout/                 # Shells, navbars, sidebars, footers
   │  ├─ data-display/           # Charts, tables, cards, lists
   │  ├─ feedback/               # Toasts, alerts, skeletons, spinners
   │  └─ form/                   # Reusable form controls & wrappers
   ├─ features/                  # Vertical domain slices
   │  └─ <feature>/
   │     ├─ components/          # Feature-specific UI (forms, panels, modals)
   │     ├─ hooks/               # Feature hooks
   │     ├─ services/            # Feature data access & orchestration
   │     ├─ state/               # Feature-level stores
   │     ├─ types/               # Feature-only types
   │     └─ tests/               # Feature tests (if not colocated)
   ├─ hooks/                     # Shared hooks reusable across features/routes
   ├─ lib/                       # Framework-agnostic helpers & integrations
   │  ├─ api/                    # Fetch clients, server actions, API SDKs
   │  ├─ auth/                   # Auth/session helpers, guards
   │  ├─ cache/                  # Caching helpers, cache tags
   │  ├─ config/                 # Runtime config builders/constants
   │  ├─ db/                     # Database layer (choose one stack per project)
   │  │  ├─ drizzle/             # Drizzle ORM (if used)
   │  │  │  ├─ schema/           # Drizzle tables & relations
   │  │  │  ├─ client.ts         # Drizzle client factory (server-only)
   │  │  │  └─ migrations.ts     # Helpers for migrations
   │  │  ├─ supabase/            # Supabase client adapters
   │  │  │  ├─ client-server.ts  # SSR/server Supabase client
   │  │  │  ├─ client-browser.ts # Browser Supabase client
   │  │  │  └─ types.ts          # Generated Supabase types
   │  │  └─ convex/              # Convex client adapter (if used)
   │  │     └─ client.ts
   │  ├─ contracts/              # OPTIONAL: frontend smart-contract integration
   │  │  ├─ abi/                 # ABI JSON files imported by the frontend
   │  │  ├─ clients/             # Typed contract clients (viem/wagmi/ethers)
   │  │  └─ addresses.ts         # Chain → contract address mapping
   │  ├─ env/                    # Zod-validated environment variables
   │  ├─ observability/          # Logging, tracing, metrics
   │  ├─ queue/                  # Background job clients
   │  ├─ security/               # Crypto, permissions, rate limiting
   │  ├─ storage/                # File/object storage adapters
   │  ├─ utils/                  # Pure helpers (dates, formatting, ids)
   │  └─ validation/             # Zod/Yup schemas used across app
   ├─ services/                  # Cross-cutting service clients (email, payments)
   ├─ state/                     # Global app-level stores (rare)
   ├─ types/
   │  ├─ domain/                 # Domain model types shared across features
   │  ├─ api/                    # DTOs and API contracts
   │  └─ global.d.ts             # Global type declarations, module shims
   ├─ styles/
   │  ├─ globals.css             # Imported once in app/layout.tsx
   │  ├─ tailwind.css            # Tailwind entry (if applicable)
   │  └─ tokens.css              # CSS tokens (or tokens.ts)
   ├─ content/
   │  ├─ mdx/                    # MD/MDX content (blog, docs, marketing)
   │  └─ locales/                # i18n translation files
   ├─ assets/
   │  ├─ images/                 # Importable images (non-direct URL)
   │  ├─ icons/                  # SVGs, icon sprites
   │  └─ fonts/                  # Self-hosted fonts
   ├─ mocks/
   │  ├─ msw/                    # MSW handlers for dev/tests
   │  ├─ data/                   # Fixture data / factories
   │  └─ handlers.ts             # MSW setup
   ├─ tests/
   │  ├─ setup/                  # Jest/Vitest/Playwright setup
   │  └─ utils/                  # Shared test helpers
   ├─ workers/
   │  ├─ edge/                   # Edge-specific workers/helpers
   │  └─ queue/                  # Background job processors
   ├─ middleware.ts              # Next.js Middleware (runs before routes)
   ├─ instrumentation.ts         # Server-side instrumentation
   └─ instrumentation-client.ts  # Client-side instrumentation
~~~

---

## 2. Placement Rules for New Files and Folders

When adding or modifying code, follow these steps.

### 2.1 Determine the correct layer

1. **Route UI**  
   → `src/app/**`
2. **Shared UI** (reused across routes/features)  
   → `src/components/**`
3. **Feature-specific UI or domain logic**  
   → `src/features/<feature>/**`
4. **Hook**  
   - Feature-specific → `src/features/<feature>/hooks`  
   - Cross-cutting → `src/hooks`
5. **Data access / env / caching / auth / contracts / utilities**  
   - Cross-cutting infra → `src/lib/**`  
   - Domain workflow → `src/features/<feature>/services`
6. **Vendor service client** (payments, email, analytics)  
   → `src/services/**`
7. **Global app state**  
   → `src/state/**` (only if truly global)
8. **Smart-contract code/tooling**  
   - Solidity contracts → `blockchain/contracts`  
   - Hardhat files → `blockchain/hardhat/**`  
   - Foundry files → `blockchain/foundry/**`  
   - Frontend ABIs/addresses/clients → `src/lib/contracts/**`
9. **Environment configuration**  
   - Next.js app + services → root `.env.*` + `src/lib/env/**`  
   - Blockchain tooling → `blockchain/.env` (template: `blockchain/.env.example`)

### 2.2 Prefer extending existing modules over creating new ones

Before creating a new helper or service file:

1. Search existing modules:
   - `src/lib/utils`
   - `src/lib/api`
   - `src/lib/env`
   - `src/lib/db`
   - `src/lib/contracts`
   - `src/features/<feature>/services`
2. If similar behavior exists:
   - Extend the existing module:
     - Add a new function or overload.
     - Add options/parameters.
     - Add code paths that preserve existing behavior by default.
3. Only create new files when:
   - Responsibility is clearly distinct.
   - Extending existing modules would reduce clarity.

### 2.3 Server vs client boundaries

- Do **not** import:
  - `src/lib/db/**`,
  - `src/lib/env/**`,
  - `blockchain/**`  
  in client-only components or hooks.
- Client components may:
  - Call server actions in `src/lib/api`.
  - Use browser-safe clients like `src/lib/db/supabase/client-browser.ts` or contract clients designed for the browser.
- Secrets, DB access, and low-level contract deployment logic must stay in:
  - Server Components.
  - Route handlers.
  - Server actions.
  - Scripts.
  - Feature services invoked from server contexts.

### 2.4 Routing-specific decisions

- Use route groups `(marketing)`, `(app)`, `(auth)` to organize sections.
- Use dynamic segments `[id]` for resource-specific pages.
- Introduce additional route groups as needed (`(admin)`, `(studio)`, etc.).
- Keep URLs stable; refactor internals via groups and feature refactors rather than URL churn.

### 2.5 Caching and performance (Next.js 15)

- Centralize expensive logic in:
  - `src/lib/cache`, `src/lib/db`, or feature services.
- Remember:
  - `GET` Route Handlers are uncached by default.
  - `fetch` defaults to no-store in many server scenarios.
- Opt into caching explicitly using:
  - Route config (`dynamic`, `revalidate`).
  - `fetch` options.
- Avoid copy-pasting caching logic; prefer shared helpers.

### 2.6 Database and services

- For Drizzle+Supabase:
  - Tables and relations in `src/lib/db/drizzle/schema`.
  - Supabase clients in `src/lib/db/supabase`.
  - Domain-specific queries in feature services or DB helper modules.
- For Convex:
  - Schema and functions under `convex/`.
  - Client helpers under `src/lib/db/convex/client.ts`.

Select **one** backend stack (Drizzle+Supabase or Convex) per project by default.

### 2.7 Blockchain workspace (if present)

- Keep all Solidity in `blockchain/contracts`.
- Configure Hardhat/Foundry to read from this shared source directory.
- Use `scripts/` to compile/deploy contracts and keep frontend ABIs/addresses in sync when a blockchain workspace is added.
- Never import from `blockchain/**` in the Next.js runtime; rely on `src/lib/contracts/**`.


**KEEP THE HEADINGS CONTENTS BELOW UPDATED:**


# Platform Summary

Cliplore is a Next.js 15 App Router app for Sora-assisted video creation, in-browser editing, Story Protocol IP registration/licensing, and IP detection/enforcement with a wallet-first UX.

## Core Commands

- `pnpm dev`: run the Next.js dev server
- `pnpm typecheck`: TypeScript typecheck (`tsc --noEmit`)
- `pnpm build`: production build (`next build`)
- `pnpm start`: run the production server (`next start`)
- `pnpm lint` / `pnpm lint:fix`: ESLint (check / autofix)
- `pnpm format`: Prettier format
- `pnpm b2:set-cors`: set Backblaze bucket CORS rules for browser PUT (loads `.env` + `.env.local`)
- `pnpm convex:dev`: start Convex dev server
- `pnpm convex:deploy`: deploy Convex functions
- `pnpm convex:reset`: reset Convex tables (loads `.env` + `.env.local`)

## Route Inventory

- **Public routes (marketing)**
  - `/`: marketing home (product overview + CTAs)
  - `/explore`: IP marketplace list (Convex-backed)
  - `/datasets`: dataset marketplace list (Convex-backed)
  - `/demo`: demo hub (genre cards with video/prompt links)
  - `/demo/[slug]`: demo detail (YouTube embed, Story links, exact prompts)
  - `/ip/[ipId]`: IP asset detail + license minting + remix project CTA
  - `/datasets/[ipId]`: dataset detail + license minting + Story/IPFS references
- **App routes (wallet-gated)**
  - `/dashboard`: creator dashboard + Convex stats
  - `/projects`: project list (local drafts + optional Convex metadata sync)
  - `/projects/[id]`: full-screen editor (header/footer hidden)
  - `/projects/[id]/publish`: publish wizard (upload export to B2, pin Story metadata to IPFS, register on Story)
  - `/projects/[id]/ipfi`: published-export picker that links into the asset dashboard
  - `/assets`: creator asset library (published Story IP assets + local backfill sync)
  - `/assets/[ipId]`: asset dashboard (overview, licensing terms, royalties, files & metadata)
  - `/datasets/new`: dataset publisher (upload sample + cover to B2, pin Story metadata to IPFS, register on Story, sync to Convex)
  - `/enforcement`: IP detection & enforcement (verify hashes + C2PA, pin evidence, raise Story disputes)
  - `/projects/[id]/ip`: redirects to `/projects/[id]/publish`
  - `/projects/[id]/monetization`: redirects to `/projects/[id]/publish`
  - `/settings`: creator profile + default license preset + OpenAI BYOK key
- **API routes**
  - `/api/sora` (`POST` create job, `GET` job status)
  - `/api/sora/content` (`GET` video proxy for completed jobs)
  - `/api/settings/openai-key` (`GET` key status, `POST` save key, `DELETE` clear key)
  - `/api/enforcement/pin-evidence` (`POST` pin evidence bundle JSON to IPFS via Pinata)
  - `/api/enforcement/hash-url` (`POST` compute SHA-256 of a remote URL with SSRF + size limits)
  - `/api/storage/presign` (`POST` create Backblaze B2 upload strategy)
  - `/api/storage/cors/ensure` (`POST` ensure Backblaze bucket CORS for current origin in development)
  - `/api/storage/multipart/sign-part` (`POST` sign an upload part)
  - `/api/storage/multipart/list-parts` (`GET` list uploaded parts)
  - `/api/storage/multipart/complete` (`POST` finalize multipart upload)
  - `/api/storage/multipart/abort` (`POST` abort multipart upload)
  - `/api/convex/users` (`GET` fetch user, `POST` upsert user)
  - `/api/convex/projects` (`GET` list projects, `POST` create project)
  - `/api/convex/stats` (`GET` project/IP stats)
  - `/api/convex/ip-assets` (`GET` list marketplace assets / find by SHA-256, `POST` create asset)
  - `/api/convex/enforcement-reports` (`GET` list reports, `POST` create report)

## Architecture Overview

- **Routing**: Next.js App Router under `src/app`, with `(marketing)` for public routes and `(app)` for wallet-gated routes.
- **UI**: Tailwind + shadcn-style primitives in `src/components/ui`; global header/footer under `src/app/components`.
- **Cross-origin isolation**: `/projects/*` sends COOP/COEP headers for the in-browser render stack while marketing routes keep standard third-party embed behavior.
- **State & persistence**: Redux store under `src/app/store` with projects persisted locally in the browser (import/export supported).
- **Wallet**: Wagmi + RainbowKit in `src/app/providers.tsx`; `(app)/layout.tsx` gates authenticated routes by wallet connection.
- **Backend**: Convex used for syncing user/project metadata and listing IP assets in the marketplace.
- **Story publishing**: The publish wizard pins IPA metadata-standard JSON to IPFS (Pinata) and registers the export via `client.ipAsset.registerIpAsset` with SHA-256 metadata hashes, media/thumbnail fingerprints, and license preset terms.
- **Data publishing**: `/datasets/new` registers dataset samples as Story IP Assets using IPA metadata `ipType: "dataset"` + a versioned `dataset` payload (`cliplore.dataset.v1`) that captures modalities, capture context, sensors, releases, manifest pointers, and hashed artifacts; the flow uploads sample/cover to B2, pins dataset manifest + Story metadata JSON to IPFS, and syncs marketplace records to Convex with `assetKind: "dataset"`.
- **Enforcement**: `/enforcement` verifies suspected content by SHA-256 (file upload or URL hashing) and C2PA Content Credentials, pins evidence bundles to IPFS, raises disputes via `client.dispute.raiseDispute`, and stores fingerprints + reports in Convex.
- **IPFi**: Per-asset IPFi actions live in the `/assets/[ipId]` dashboard; the Royalties tab resolves the IP Royalty Vault and gates tip/claim/royalty-token transfers until the vault is deployed, supports claiming as the IP account or wallet, and shows IP/WIP balances for wrap/unwrap.
- **AI & media**: Sora job orchestration via `src/features/ai/services/sora` and the `/api/sora*` route handlers, using a user-provided OpenAI key stored as an encrypted HTTP-only cookie (encryption secret `OPENAI_BYOK_COOKIE_SECRET`, managed via `/api/settings/openai-key`); per-project Sora generation history is tracked in the editor and continues processing in the background, saving completed clips into the media library and timeline.
- **Editor UX**: The editor uses a left tool rail (Library/Text/Export) with a resizable tools panel and a right-side inspector panel. Timeline uses ordered layer tracks (`tracks` in project state) with two base layers always present; clips (media + text) are assigned via `trackId`, cannot overlap within a layer (ripple insert shifts downstream clips), and empty non-base layers are auto-pruned; track order drives visual z-index. Video/audio clips clamp trims to the source media duration; images/text can be extended freely. Clicking empty timeline space clears selection (timeline and canvas stay in sync), and text is added via the Text tool (not by double-clicking the timeline). The Library groups Sora generation into an AI Studio section (Generate + History) and assets can be drag-dropped onto timeline layers (or added via the `+` affordance) and deletions are confirmed. The timeline toolbar separates edit actions (Marker `M`, Split `S`, Duplicate `D`, Delete `Del`) from viewport controls (Follow playhead `F` + zoom), with tooltips and per-action help dialogs; marker toggling adds/removes a marker at the playhead, markers are clickable/draggable on the ruler, Follow playhead auto-scrolls the timeline viewport, Alt/Option + scroll zooms the timeline under the cursor, Shift + scroll pans horizontally, and a shortcuts help button sits next to the zoom control. Dragging to the new-layer drop zones provides a live preview and avoids net-new empty layers by reusing an origin track when it would become empty. The canvas is a clean editing surface with playback controls below it; fullscreen expands the preview region while keeping the control bar pinned to the bottom outside the canvas. Selection supports drag/resize/rotate via Moveable handles with full-canvas center snapping guides, and transform gestures commit as a single undo step.
- **Storage**: Backblaze B2 uploads are direct-from-browser via presigned S3 URLs initialized via `/api/storage/presign` and `src/lib/storage/**`; the B2 bucket CORS rules must allow `PUT` from app origins, and development can ensure the active origin via `/api/storage/cors/ensure` or `pnpm b2:set-cors` (requires a key with bucket settings permission). Story publish metadata JSON is pinned to IPFS via Pinata (server env `PINATA_JWT`).
