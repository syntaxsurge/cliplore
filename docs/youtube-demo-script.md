Project: ClipLore  
One-liner: A wallet-first, Sora-assisted video editor that exports and publishes Story Protocol IP—with licensing, IPFi royalties, datasets, and enforcement tools.

## 1. Connect wallet immediately (start of demo)
- **URL:** https://cliplore.com/
- **Shot:** Homepage hero with header nav (“Home”, “Explore”, “Datasets”, “Demo”, “Studio”, “Assets”, “Enforcement”, “Settings”) and a RainbowKit “Connect wallet” button in the header.
- **Steps:**
  1. **Current page:** https://cliplore.com/ — confirm the hero headline and the header nav are visible.
  2. **Current page:** https://cliplore.com/ — **Navigate:** Click “Connect wallet” in the header → confirm the wallet modal opens.
  3. **Current page:** Wallet modal — **Action:** Click “MetaMask” → confirm MetaMask prompts for connection.
  4. **Current page:** MetaMask popup — **Action:** Click “Connect” → confirm the site shows a connected wallet chip/address (starts with “0x…”) in the header.
  5. **Current page:** https://cliplore.com/ — **Action:** Point to the header nav items “Demo”, “Studio”, “Explore”, “Datasets”, “Assets”, “Enforcement”, “Settings” → confirm they’re visible.
  6. **Verify on-screen:** Confirm the connected wallet indicator is visible in the header (0x…).
- **Voiceover:**
  > “We’re on ClipLore’s homepage—click ‘Connect wallet’, choose MetaMask.”

## 2. Generative Video demos (hub + one genre detail)
- **URL:** https://cliplore.com/demo
- **Shot:** “Demos” page with five genre cards (Anime, Horror, Sci-Fi + Fantasy, Commercial / Spec-Ads, Brainrot), each with “Open demo” and “YouTube”.
- **Steps:**
  1. **Current page:** https://cliplore.com/ — confirm the header shows “Demo”.
  2. **Current page:** https://cliplore.com/ — **Navigate:** Click “Demo” in the header → lands on https://cliplore.com/demo — confirm heading “Demos” is visible.
  3. **Current page:** https://cliplore.com/demo — **Action:** Scroll slightly to show all five demo cards → confirm each card shows “Open demo” and “YouTube”.
  4. **Current page:** https://cliplore.com/demo — **Action:** Click “Open demo” on the “Horror” card → lands on https://cliplore.com/demo/horror — confirm the heading “Horror” is visible.
  5. **Current page:** https://cliplore.com/demo/horror — **Action:** Scroll to “Prompts used” → confirm “CLIP 1” and “CLIP 2” prompt blocks are visible with a “Copy” button.
  6. **Verify on-screen:** Confirm the YouTube embed is visible on the page and the “Story Portal asset” and “Story Explorer” link buttons are visible in the Links panel.
- **Voiceover:**
  > “I open Demo to show five genres. I click into Horror, where the final YouTube cut is embedded, Story links are one click away, and the exact prompts used are published and copyable.”

## 3. Studio: create a project, hit BYOK redirect, set key, return to editor, then generate
- **URL:** https://cliplore.com/projects
- **Shot:** Wallet-gated Studio Projects list with a “New project” action; then full-screen editor with Library → AI Studio section; then Settings page showing “AI (Bring your own OpenAI key)” with a masked input and “Save key”; then back to editor where “Generate” opens the prompt modal.
- **Steps:**
  1. **Current page:** https://cliplore.com/demo/horror — confirm the header shows “Studio”.
  2. **Current page:** https://cliplore.com/demo/horror — **Navigate:** Click “Studio” in the header → lands on https://cliplore.com/projects — confirm a “Projects” heading (or projects list) is visible.
  3. **Current page:** https://cliplore.com/projects — **Action:** Click “New project” → confirm you are redirected to https://cliplore.com/projects/[id] (full-screen editor) and the left tool rail shows “Library”, “Text”, “Export”.
  4. **Current page:** https://cliplore.com/projects/[id] — **Action:** Click “Library” in the left tool rail, then click “Generate” in the “AI Studio” section → confirm you are redirected to https://cliplore.com/settings and the section “AI (Bring your own OpenAI key)” is visible.
  5. **Current page:** https://cliplore.com/settings — **Enter values:**
     - OpenAI API key = [OPENAI_API_KEY=sk-proj-REDACTED_FOR_DEMO]
     Click “Save key” — wait for a saved confirmation message (e.g., “Saved” / “Key saved” status).
  6. **Verify on-screen:** **Current page:** https://cliplore.com/settings — click “Studio” in the header → lands on https://cliplore.com/projects — click your newest project row to return to https://cliplore.com/projects/[id] — click “Library” then “Generate” → confirm the Generate modal/panel opens with a “Prompt” field visible.
- **Voiceover:**
  > “I open Studio, create a new project, and land in the full-screen editor. When I click Library → Generate, ClipLore redirects me to Settings because it’s bring-your-own-key. I paste my OpenAI key—masked—and click ‘Save key’, then return to the editor. Now when I click Generate again, the prompt modal opens and we can generate Sora clips.”

## 4. Editor: generate a Sora clip, drag it to the timeline, add a title, and edit inline
- **URL:** https://cliplore.com/projects/[id]
- **Shot:** Full-screen editor showing Library AI Studio (Generate + History), a generated clip appearing in History, drag-and-drop into timeline layers, Text tool, and inline text editing on the canvas with selection handles.
- **Steps:**
  1. **Current page:** https://cliplore.com/projects/[id] — confirm the Generate modal/panel is open with a “Prompt” field visible.
  2. **Current page:** https://cliplore.com/projects/[id] — **Enter values:**
     - Prompt = [SORA_PROMPT="Premium minimalist studio commercial, clean UI scan animation, proof seal stamp moment, cinematic lighting, no logos"]
     - Seconds = [SECONDS=8]
     Click “Generate” — wait for a new row to appear in “History” with a visible status/progress indicator.
  3. **Current page:** https://cliplore.com/projects/[id] — **Action:** After the History row shows completion (or a playable/ready state), drag the new clip from the Library into the timeline layer area → confirm a clip block appears on the timeline.
  4. **Current page:** https://cliplore.com/projects/[id] — **Action:** Click “Text” in the left tool rail → confirm text templates (e.g., “Title”) are visible.
  5. **Current page:** https://cliplore.com/projects/[id] — **Action:** Click “Title” → confirm a new text clip appears on the timeline and a text element appears on the canvas.
  6. **Verify on-screen:** **Current page:** https://cliplore.com/projects/[id] — double-click the text on the canvas → confirm the caret appears for inline editing and the timeline selection highlights the same layer.
- **Voiceover:**
  > “I generate an 8-second Sora clip with a single prompt, watch it appear in History, and drag it straight onto the timeline. Then I add a Title and double-click it directly on the canvas to edit inline. This proves the Creative Front-End core: a clean workflow from AI generation to real timeline editing.”

## 5. Export: render the timeline, then go straight to Publish
- **URL:** https://cliplore.com/projects/[id]
- **Shot:** Export panel open with an “Export”/“Render” action, visible export progress, and an export completion dialog that includes a “Publish” button.
- **Steps:**
  1. **Current page:** https://cliplore.com/projects/[id] — confirm the timeline shows at least one video clip block and one text clip block.
  2. **Current page:** https://cliplore.com/projects/[id] — **Navigate:** Click “Export” in the left tool rail → confirm the Export panel opens.
  3. **Current page:** https://cliplore.com/projects/[id] — **Action:** Click “Export” (or “Render”) → wait for an export progress indicator to appear.
  4. **Current page:** https://cliplore.com/projects/[id] — **Action:** Wait for export completion → confirm an export completion dialog/card appears showing the exported file details.
  5. **Current page:** Export completion dialog — **Action:** Click “Publish” → lands on https://cliplore.com/projects/[id]/publish.
  6. **Verify on-screen:** Confirm the Publish page shows a visible “Publish” heading and the selected export is displayed.
- **Voiceover:**
  > “Now we export like a real editor. I open Export, click Render, and wait for the completion card. From that completion screen, I click Publish immediately—so the workflow is always Create → Edit → Export → Publish.”

## 6. Publish wizard: upload to storage, pin IPFS metadata, register on Story, then open Explorer
- **URL:** https://cliplore.com/projects/[id]/publish
- **Shot:** Publish wizard showing an “Upload & Register” CTA, then a success view showing Storage URLs (Video URL, Thumbnail URL), IPFS metadata URIs (ipfs://…), SHA-256 hashes (0x…), and Next Steps buttons (“Copy IP ID”, “Story Explorer”, “View marketplace page”, “Open IPFi”).
- **Steps:**
  1. **Current page:** https://cliplore.com/projects/[id]/publish — confirm the primary CTA “Upload & Register” is visible.
  2. **Current page:** https://cliplore.com/projects/[id]/publish — **Action:** Click “Upload & Register” — wait for the success state to appear.
  3. **Current page:** Publish success state — **Action:** Locate “Storage” → confirm “Video URL” and “Thumbnail URL” are visible and clickable.
  4. **Current page:** Publish success state — **Action:** Locate “IPFS metadata” → confirm “IP metadata” and “NFT metadata” show ipfs://… URIs and “SHA-256: 0x…” hashes.
  5. **Current page:** Publish success state — **Action:** Click “Story Explorer” → confirm a new tab opens to Story Explorer.
  6. **Verify on-screen:** Back on the success state, confirm “Copy IP ID” and “Open Asset Dashboard” (or “View marketplace page”) is visible.
- **Voiceover:**
  > “This Publish wizard is the Story integration surface. I click ‘Upload & Register’ to upload the export to storage, pin metadata to IPFS with SHA-256 fingerprints, and register the final cut as a Story IP asset. The success screen shows the real storage URLs, the ipfs:// metadata, the 0x hashes, and a one-click Story Explorer link for verification.”

## 7. Explore marketplace + public IP page (Creative Front-End user-facing consumption)
- **URL:** https://cliplore.com/explore
- **Shot:** Explore marketplace listing cards with IP IDs (0x…), a “View details” button, and the public IP detail page showing license/mint CTA.
- **Steps:**
  1. **Current page:** https://cliplore.com/projects/[id]/publish — confirm “View marketplace page” is visible in Next Steps.
  2. **Current page:** https://cliplore.com/projects/[id]/publish — **Navigate:** Click “View marketplace page” → lands on https://cliplore.com/explore — confirm heading “Explore” / “Explore IP” is visible.
  3. **Current page:** https://cliplore.com/explore — **Action:** Find your newly published listing card → confirm it shows an IP ID starting with “0x…”.
  4. **Current page:** https://cliplore.com/explore — **Action:** Click “View details” → lands on https://cliplore.com/ip/[ipId] — confirm “IP Asset ID” (0x…) is visible.
  5. **Current page:** https://cliplore.com/ip/[ipId] — **Action:** Scroll to the licensing area → confirm “Mint license token” is visible.
  6. **Verify on-screen:** Confirm the public IP page shows the IP ID and the licensing/remix CTA area.
- **Voiceover:**
  > “Explore lists published IP with on-chain IDs, and each public IP page exposes licensing with a clear ‘Mint license token’ CTA.”

## 8. Assets dashboard + IPFi: licensing, royalties, files, and the project IPFi entrypoint
- **URL:** https://cliplore.com/assets
- **Shot:** Creator Assets list, then an Asset dashboard with tabs (Overview, Licensing, Royalties, Files & metadata), plus a quick jump through /projects/[id]/ipfi into the same asset.
- **Steps:**
  1. **Current page:** https://cliplore.com/explore — confirm the header shows “Assets”.
  2. **Current page:** https://cliplore.com/explore — **Navigate:** Click “Assets” in the header → lands on https://cliplore.com/assets — confirm heading “Assets” is visible.
  3. **Current page:** https://cliplore.com/assets — **Action:** Click your newly published asset row/card → lands on https://cliplore.com/assets/[ipId] — confirm the IP ID (0x…) is visible on the asset header.
  4. **Current page:** https://cliplore.com/assets/[ipId] — **Action:** Click “Licensing” tab → confirm license terms summary is visible.
  5. **Current page:** https://cliplore.com/assets/[ipId] — **Action:** Click “Royalties” tab → confirm the Royalties section is visible (either actionable buttons like “Refresh claimable”/“Claim revenue” or a “Royalties not active yet” gate message).
  6. **Verify on-screen:** **Current page:** https://cliplore.com/projects/[id]/publish — click “Open IPFi” → lands on https://cliplore.com/projects/[id]/ipfi — click the published export row and click “Open asset dashboard” → confirm you land back on https://cliplore.com/assets/[ipId] with Royalties available.
- **Voiceover:**
  > “ClipLore gives every published IP an Asset dashboard. I show Licensing and Royalties—where tips, claim flows, and finance utilities live—and Files & metadata for auditing.”

## 9. Data track: datasets marketplace, publish a dataset, and open dataset detail
- **URL:** https://cliplore.com/datasets
- **Shot:** Datasets marketplace list, “Publish a dataset” CTA, dataset publisher form, then a dataset detail page with Story and IPFS references.
- **Steps:**
  1. **Current page:** https://cliplore.com/assets/[ipId] — confirm the header shows “Datasets”.
  2. **Current page:** https://cliplore.com/assets/[ipId] — **Navigate:** Click “Datasets” in the header → lands on https://cliplore.com/datasets — confirm heading “Datasets” is visible.
  3. **Current page:** https://cliplore.com/datasets — **Action:** Click “Publish a dataset” → lands on https://cliplore.com/datasets/new — confirm the dataset publisher heading is visible.
  4. **Current page:** https://cliplore.com/datasets/new — **Enter values:**
     - Title = [DATASET_TITLE="POV Sidewalks v1"]
     - Description = [DATASET_DESC="Rights-cleared POV navigation sample with structured metadata, hashed artifacts, and Story licensing."]
     - Dataset type = [DATASET_TYPE="pov-video"]
     Click “Pin + Register on Story” — wait for a success block showing an IP ID (0x…).
  5. **Current page:** https://cliplore.com/datasets/new — **Action:** Click “View dataset” (or the success CTA that opens the dataset detail) → lands on https://cliplore.com/datasets/[ipId].
  6. **Verify on-screen:** Confirm the dataset detail page shows the dataset IP ID (0x…) and links to Story Explorer and IPFS metadata (ipfs://…).
- **Voiceover:**
  > “ClipLore publishes rights-cleared data samples as Story IP assets with structured, machine-readable metadata. I open Datasets, publish a dataset sample with one form, and then open the dataset detail page where Story and IPFS references make the provenance and licensing auditable.”

## 10. Enforcement: verify a file hash and submit an IPFS evidence report (IP Detection & Enforcement)
- **URL:** https://cliplore.com/enforcement
- **Shot:** Enforcement page with Verify panel (SHA-256 output) and Report panel (Victim IP ID, Suspect URL/file, “Pin evidence & raise dispute” button), plus an evidence result showing ipfs://… and a tx confirmation.
- **Steps:**
  1. **Current page:** https://cliplore.com/datasets/[ipId] — confirm the header shows “Enforcement”.
  2. **Current page:** https://cliplore.com/datasets/[ipId] — **Navigate:** Click “Enforcement” in the header → lands on https://cliplore.com/enforcement — confirm heading “IP Detection & Enforcement” is visible.
  3. **Current page:** https://cliplore.com/enforcement — **Action:** In “Verify”, click “Upload file” and select a sample file → confirm a “SHA-256” value appears on screen.
  4. **Current page:** https://cliplore.com/enforcement — **Action:** Click “Report” → confirm fields “Victim IP ID” and “Suspect URL” are visible.
  5. **Current page:** https://cliplore.com/enforcement — **Enter values:**
     - Victim IP ID = [VICTIM_IP_ID=0xYOUR_PUBLISHED_IP_ID]
     - Suspect URL = [SUSPECT_URL=https://example.com/suspect.mp4]
     Click “Pin evidence & raise dispute” — wait for an evidence result to appear.
  6. **Verify on-screen:** Confirm an evidence URI (ipfs://…) is displayed and a dispute submission confirmation appears (tx hash or success toast).
- **Voiceover:**
  > “For IP Detection & Enforcement, ClipLore verifies suspicious content by SHA-256 and creates an evidence bundle pinned to IPFS. Then it raises a Story dispute so enforcement is actionable, not just informational. This closes the loop from creation to compliance.”

## 11. Dashboard quick check (creator overview)
- **URL:** https://cliplore.com/dashboard
- **Shot:** Creator dashboard with stats/cards showing project count and published asset stats (Convex-backed).
- **Steps:**
  1. **Current page:** https://cliplore.com/enforcement — confirm the header shows “Dashboard”.
  2. **Current page:** https://cliplore.com/enforcement — **Navigate:** Open URL directly: https://cliplore.com/dashboard — confirm the “Dashboard” heading is visible.
  3. **Current page:** https://cliplore.com/dashboard — **Action:** Locate the stats section — confirm at least one metric card/table row is visible.
  4. **Current page:** https://cliplore.com/dashboard — **Action:** Click “Studio” in the header → lands on https://cliplore.com/projects — confirm the Projects list is visible.
  5. **Current page:** https://cliplore.com/projects — **Action:** Click “Assets” in the header → lands on https://cliplore.com/assets — confirm the Assets list is visible.
  6. **Verify on-screen:** Confirm navigation between Dashboard → Studio → Assets works without losing wallet connection (address chip remains visible).
- **Voiceover:**
  > “Finally, the creator Dashboard ties it together: projects, published IP, and activity at a glance. From here, you can jump back into Studio to create, Assets to manage, or Enforcement to verify—keeping the user journey clean and fast.”

## Final Wrap-Up
- **URL:** https://cliplore.com/demo
- **Shot:** Demo hub with five genre cards and quick nav access to Studio, Explore, Datasets, Assets, and Enforcement.
- **Steps:**
  1. **Current page:** https://cliplore.com/dashboard — confirm the header shows “Demo”.
  2. **Navigate:** Click “Demo” in the header → lands on https://cliplore.com/demo — confirm heading “Demos” is visible.
  3. **Verify final state:** Confirm the five demo cards are visible and each has “Open demo” and “YouTube”, proving Generative Video outputs + prompts are documented alongside Story links.
- **Voiceover:**
  > “We just demoed ClipLore across tracks: Generative Video demos with exact prompts, a polished Creative Front-End editor with Sora BYOK, Story publishing with IPFS fingerprints, IPFi dashboards for licensing and royalties, Data datasets registration, and IP Detection & Enforcement for verification and disputes. Try it at [DEMO_URL=https://cliplore.com/demo].”
