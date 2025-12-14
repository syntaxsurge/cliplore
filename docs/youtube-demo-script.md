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
- **Shot:** Studio Projects list with “New project”; then full-screen editor with Library → AI Studio; then Settings “AI (Bring your own OpenAI key)” masked input; then back to editor where “Generate” opens a prompt modal.
- **Steps:**
  1. **Current page:** https://cliplore.com/demo/horror — confirm the header shows “Studio”.
  2. **Current page:** https://cliplore.com/demo/horror — **Navigate:** Click “Studio” in the header → lands on https://cliplore.com/projects — confirm a “Projects” heading (or projects list) is visible.
  3. **Current page:** https://cliplore.com/projects — **Action:** Click “New project” → confirm you are redirected to https://cliplore.com/projects/[id] and the left tool rail shows “Library”, “Text”, “Export”.
  4. **Current page:** https://cliplore.com/projects/[id] — **Action:** Click “Library”, then click “Generate” in “AI Studio” → confirm you are redirected to https://cliplore.com/settings and “AI (Bring your own OpenAI key)” is visible.
  5. **Current page:** https://cliplore.com/settings — **Enter values:**
     - OpenAI API key = [OPENAI_API_KEY=sk-proj-REDACTED_FOR_DEMO]
     Click “Save key” — wait for a saved confirmation message (“Saved” / “Key saved”).
  6. **Verify on-screen:** **Current page:** https://cliplore.com/settings — click “Studio” in the header → lands on https://cliplore.com/projects — click your newest project row to return to https://cliplore.com/projects/[id] — click “Library” then “Generate” → confirm the Generate modal opens with a “Prompt” field visible.
- **Voiceover:**
  > “I open Studio, create a new project, and land in the full-screen editor. When I click Library → Generate, ClipLore redirects me to Settings because it’s bring-your-own-key. I paste my OpenAI key—masked—and click ‘Save key’, then return to the editor. Now when I click Generate again, the prompt modal opens and we can generate Sora clips.”

## 4. Editor: generate a Sora clip, drag it to the timeline, add a title, and edit inline
- **URL:** https://cliplore.com/projects/[id]
- **Shot:** Full-screen editor with AI Studio Generate + History; a generated clip in History; drag-and-drop into timeline layers; Text tool; inline text editing on canvas with selection handles.
- **Steps:**
  1. **Current page:** https://cliplore.com/projects/[id] — confirm the Generate modal is open with a “Prompt” field visible.
  2. **Current page:** https://cliplore.com/projects/[id] — **Enter values:**
     - Prompt = [SORA_PROMPT="Premium minimalist studio commercial, clean UI scan animation, proof seal stamp moment, cinematic lighting, no logos"]
     - Seconds = [SECONDS=8]
     Click “Generate” — wait for a new row in “History” with a visible status/progress indicator.
  3. **Current page:** https://cliplore.com/projects/[id] — **Action:** After History shows completion, drag the new clip from Library into the timeline layer area → confirm a clip block appears on the timeline.
  4. **Current page:** https://cliplore.com/projects/[id] — **Action:** Click “Text” → confirm “Title” is visible.
  5. **Current page:** https://cliplore.com/projects/[id] — **Action:** Click “Title” → confirm a new text clip appears on the timeline and a text element appears on the canvas.
  6. **Verify on-screen:** Double-click the text on the canvas → confirm the caret appears for inline editing and the timeline selection highlights the same layer.
- **Voiceover:**
  > “I generate an 8-second Sora clip with a single prompt, watch it appear in History, and drag it straight onto the timeline. Then I add a Title and double-click it directly on the canvas to edit inline. This proves the Creative Front-End core: a clean workflow from AI generation to real timeline editing.”

## 5. Export: render the timeline, then go straight to Publish
- **URL:** https://cliplore.com/projects/[id]
- **Shot:** Export panel with an “Export”/“Render” action; visible progress; export completion dialog including a “Publish” button.
- **Steps:**
  1. **Current page:** https://cliplore.com/projects/[id] — confirm the timeline shows at least one video clip and one text clip.
  2. **Current page:** https://cliplore.com/projects/[id] — **Navigate:** Click “Export” → confirm the Export panel opens.
  3. **Current page:** https://cliplore.com/projects/[id] — **Action:** Click “Export” (or “Render”) → wait for a progress indicator.
  4. **Current page:** https://cliplore.com/projects/[id] — **Action:** Wait for export completion → confirm an export completion dialog/card shows the exported file details.
  5. **Current page:** Export completion dialog — **Action:** Click “Publish” → lands on https://cliplore.com/projects/[id]/publish.
  6. **Verify on-screen:** Confirm the Publish page shows a visible “Publish” heading and the selected export is displayed.
- **Voiceover:**
  > “Now we export like a real editor. I open Export, click Render, and wait for the completion card. From that completion screen, I click Publish immediately—so the workflow is always Create → Edit → Export → Publish.”

## 6. Publish wizard: upload to storage, pin IPFS metadata, register on Story
- **URL:** https://cliplore.com/projects/[id]/publish
- **Shot:** Publish wizard with “Upload & Register” CTA; success view showing Storage URLs, IPFS metadata URIs, SHA-256 hashes, and Next Steps (“Copy IP ID”, “Story Explorer”, “View marketplace page”, “Open Asset Dashboard”).
- **Steps:**
  1. **Current page:** https://cliplore.com/projects/[id]/publish — confirm the primary CTA “Upload & Register” is visible.
  2. **Current page:** https://cliplore.com/projects/[id]/publish — **Action:** Click “Upload & Register” — wait for the success state.
  3. **Current page:** Publish success state — **Action:** Locate “Storage” → confirm “Video URL” and “Thumbnail URL” are visible and clickable.
  4. **Current page:** Publish success state — **Action:** Locate “IPFS metadata” → confirm “IP metadata” and “NFT metadata” show ipfs://… URIs and “SHA-256: 0x…” hashes.
  5. **Current page:** Publish success state — **Action:** Click “Story Explorer” → confirm a new tab opens to Story Explorer.
  6. **Verify on-screen:** Back on the success state, confirm “Copy IP ID” is visible and the IP ID is shown in the results.
- **Voiceover:**
  > “This Publish wizard is the Story integration surface. I click ‘Upload & Register’ to upload the export to storage, pin metadata to IPFS with SHA-256 fingerprints, and register the final cut as a Story IP asset.”

## 7. Explore marketplace + public IP page (where licenses are minted)
- **URL:** https://cliplore.com/explore
- **Shot:** Explore marketplace listing cards with IP IDs and “View details”; public IP page showing license terms and a “Mint license token” CTA.
- **Steps:**
  1. **Current page:** https://cliplore.com/projects/[id]/publish — confirm “View marketplace page” is visible in Next Steps.
  2. **Current page:** https://cliplore.com/projects/[id]/publish — **Navigate:** Click “View marketplace page” → lands on https://cliplore.com/explore — confirm heading “Explore” / “Explore IP” is visible.
  3. **Current page:** https://cliplore.com/explore — **Action:** Click “View details” on your newly published listing → lands on https://cliplore.com/ip/[ipId] — confirm “IP Asset ID” (0x…) is visible.
  4. **Current page:** https://cliplore.com/ip/[ipId] — **Action:** Scroll to the licensing area → confirm “Mint license token” is visible.
  5. **Current page:** https://cliplore.com/ip/[ipId] — **Action:** Click “Copy IP ID” (if present) → confirm a “Copied” toast or icon state appears.
  6. **Verify on-screen:** Confirm the public IP page shows the IP ID and the “Mint license token” CTA.
- **Voiceover:**
  > “Explore lists published IP with on-chain IDs, and each public IP page exposes licensing with a clear ‘Mint license token’ CTA.”

## 8. IPFi proof: mint a license from a second wallet (MetaMask approval + confirm)
- **URL:** https://cliplore.com/ip/[ipId]
- **Shot:** Public IP page visible; then a second browser window (incognito) connected to a different wallet; a mint flow that triggers MetaMask confirmation.
- **Steps:**
  1. **Current page:** https://cliplore.com/ip/[ipId] — confirm “Mint license token” is visible.
  2. **Current page:** https://cliplore.com/ip/[ipId] — **Navigate:** Open a new incognito browser window → open URL directly: https://cliplore.com/ip/[ipId] — confirm the same “IP Asset ID” is visible.
  3. **Current page:** Incognito https://cliplore.com/ip/[ipId] — **Action:** Click “Connect wallet” → click “MetaMask” → confirm the connected address is different from your creator wallet (starts with “0x…”).
  4. **Current page:** Incognito https://cliplore.com/ip/[ipId] — **Action:** Click “Mint license token” → confirm MetaMask opens a transaction.
  5. **Current page:** MetaMask popup — **Action:** Click “Confirm” — wait for a “Transaction submitted” / “License minted” success toast on the public page.
  6. **Verify on-screen:** Confirm the public IP page shows a success confirmation (toast, “Minted” state, or a tx hash link shown after mint).
- **Voiceover:**
  > “To prove IPFi, I switch to another browser with a different wallet. On the same public IP page, I connect my second MetaMask and mint a license token. You’ll see the MetaMask confirmation, and then a success state on the page—this shows real, on-chain licensing from a separate user.”

## 9. Assets dashboard + IPFi actions: royalties activate, tip, claim, wrap/unwrap
- **URL:** https://cliplore.com/assets
- **Shot:** Creator Assets list → asset dashboard → Royalties tab showing Royalty Vault address, tip form, claim section, and wrap/unwrap controls.
- **Steps:**
  1. **Current page:** Incognito https://cliplore.com/ip/[ipId] — confirm the license mint succeeded (toast / tx link).
  2. **Current page:** Original browser https://cliplore.com/ip/[ipId] — **Navigate:** Click “Assets” in the header → lands on https://cliplore.com/assets — confirm heading “Assets” is visible.
  3. **Current page:** https://cliplore.com/assets — **Action:** Click your newly published asset row/card → lands on https://cliplore.com/assets/[ipId] — confirm the IP ID (0x…) is visible on the header.
  4. **Current page:** https://cliplore.com/assets/[ipId] — **Action:** Click “Royalties” tab → confirm “Royalties dashboard” is visible and the “Royalties vault” address is NOT 0x000…000.
  5. **Current page:** https://cliplore.com/assets/[ipId] — **Enter values:**
     - Wrap IP → WIP = [WRAP_AMOUNT_IP=1]
     Click “Wrap” — confirm MetaMask opens → click “Confirm” — wait for a success toast (wrap complete).
  6. **Verify on-screen:** **Current page:** https://cliplore.com/assets/[ipId] — in “Tip this IP”, set Amount (WIP) = [TIP_WIP=1] → click “Send tip” → confirm MetaMask opens → click “Confirm” — then click “Refresh claimable” and confirm “Claimable” updates from “—” to a value.
- **Voiceover:**
  > “Back in the creator asset dashboard, royalties are now activated after the first license mint. On the Royalties tab, the vault address is live. I wrap 1 IP into WIP, then send a 1 WIP tip to the IP vault, refresh claimable, and you can see revenue appear—this demonstrates the full IPFi loop.”

## 10. IPFi claim + fractionalize (transfer royalty tokens)
- **URL:** https://cliplore.com/assets/[ipId]
- **Shot:** Asset dashboard Royalties tab showing “Claim revenue” and “Fractionalize royalties (transfer Royalty Tokens)” with recipient + percent.
- **Steps:**
  1. **Current page:** https://cliplore.com/assets/[ipId] — confirm “Royalties dashboard” is visible and “Claimable” shows a number (not “—”).
  2. **Current page:** https://cliplore.com/assets/[ipId] — **Action:** Click “Claim revenue” — confirm MetaMask opens a transaction.
  3. **Current page:** MetaMask popup — **Action:** Click “Confirm” — wait for a success toast and confirm “Claimable” decreases or resets after “Refresh claimable”.
  4. **Current page:** https://cliplore.com/assets/[ipId] — **Enter values:**
     - Recipient = [RECIPIENT_WALLET=0xYOUR_SECOND_WALLET]
     - Percent = [PERCENT=5]
     Click “Transfer” — confirm MetaMask opens → click “Confirm” — wait for a success toast.
  5. **Current page:** https://cliplore.com/assets/[ipId] — **Action:** Click “Files & metadata” tab → confirm Storage URLs and IPFS metadata URIs/hashes are visible for audit.
  6. **Verify on-screen:** Confirm the transfer action shows a success confirmation (toast or tx hash displayed) and the Files tab shows ipfs:// URIs and SHA-256 0x… hashes.
- **Voiceover:**
  > “Now I claim the revenue to my wallet with one click and confirm the MetaMask transaction. Then I fractionalize royalties by transferring 5% of the royalty tokens to my second wallet—again confirmed on-chain. This shows licensing, revenue, claiming, and fractional rights in one end-to-end flow.”

## 11. Data track: datasets marketplace, publish a dataset, and open dataset detail
- **URL:** https://cliplore.com/datasets
- **Shot:** Datasets marketplace list, “Publish a dataset” CTA, dataset publisher form, then dataset detail with Story and IPFS references.
- **Steps:**
  1. **Current page:** https://cliplore.com/assets/[ipId] — confirm the header shows “Datasets”.
  2. **Current page:** https://cliplore.com/assets/[ipId] — **Navigate:** Click “Datasets” in the header → lands on https://cliplore.com/datasets — confirm heading “Datasets” is visible.
  3. **Current page:** https://cliplore.com/datasets — **Action:** Click “Publish a dataset” → lands on https://cliplore.com/datasets/new — confirm the dataset publisher heading is visible.
  4. **Current page:** https://cliplore.com/datasets/new — **Enter values:**
     - Title = [DATASET_TITLE="POV Sidewalks v1"]
     - Description = [DATASET_DESC="Rights-cleared POV navigation sample with structured metadata, hashed artifacts, and Story licensing."]
     - Dataset type = [DATASET_TYPE="pov-video"]
     Click “Pin + Register on Story” — wait for a success block showing an IP ID (0x…).
  5. **Current page:** https://cliplore.com/datasets/new — **Action:** Click “View dataset” → lands on https://cliplore.com/datasets/[ipId].
  6. **Verify on-screen:** Confirm the dataset detail page shows the dataset IP ID (0x…) and links to Story Explorer and IPFS metadata (ipfs://…).
- **Voiceover:**
  > “ClipLore also ships the Data track: rights-cleared dataset samples registered as Story IP. I publish a dataset in one flow and open the dataset detail page where Story and IPFS references make the provenance auditable.”

## 12. Enforcement: verify a file hash and submit an IPFS evidence report (IP Detection & Enforcement)
- **URL:** https://cliplore.com/enforcement
- **Shot:** Enforcement page with Verify panel (SHA-256 output) and Report panel (Victim IP ID, Suspect URL/file, “Pin evidence & raise dispute”), then evidence URI shown.
- **Steps:**
  1. **Current page:** https://cliplore.com/datasets/[ipId] — confirm the header shows “Enforcement”.
  2. **Current page:** https://cliplore.com/datasets/[ipId] — **Navigate:** Click “Enforcement” in the header → lands on https://cliplore.com/enforcement — confirm heading “IP Detection & Enforcement” is visible.
  3. **Current page:** https://cliplore.com/enforcement — **Action:** In “Verify”, click “Upload file” and select a sample file — confirm a “SHA-256” value appears.
  4. **Current page:** https://cliplore.com/enforcement — **Action:** Click “Report” → confirm fields “Victim IP ID” and “Suspect URL” are visible.
  5. **Current page:** https://cliplore.com/enforcement — **Enter values:**
     - Victim IP ID = [VICTIM_IP_ID=0xYOUR_PUBLISHED_IP_ID]
     - Suspect URL = [SUSPECT_URL=https://example.com/suspect.mp4]
     Click “Pin evidence & raise dispute” — wait for an evidence result to appear.
  6. **Verify on-screen:** Confirm an evidence URI (ipfs://…) is displayed and a dispute submission confirmation appears (tx hash or success toast).
- **Voiceover:**
  > “For IP Detection & Enforcement, ClipLore verifies suspicious content by SHA-256, pins an evidence bundle to IPFS, and raises a Story dispute. That makes enforcement actionable, not just informational.”

## 13. Dashboard quick check (creator overview)
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
  > “Finally, the creator Dashboard ties it together: projects, published IP, and activity at a glance. From here, you can jump back into Studio to create, Assets to manage, or Enforcement to verify.”

## Final Wrap-Up
- **URL:** https://cliplore.com/demo
- **Shot:** Demo hub with five genre cards and quick nav access to Studio, Explore, Datasets, Assets, and Enforcement.
- **Steps:**
  1. **Current page:** https://cliplore.com/dashboard — confirm the header shows “Demo”.
  2. **Current page:** https://cliplore.com/dashboard — **Navigate:** Click “Demo” in the header → lands on https://cliplore.com/demo — confirm heading “Demos” is visible.
  3. **Verify final state:** Confirm the five demo cards are visible and each has “Open demo” and “YouTube”, proving Generative Video outputs + prompts are documented alongside Story links.
- **Voiceover:**
  > “We just demoed ClipLore across tracks: Generative Video demos with exact prompts, a Creative Front-End editor with Sora BYOK, Story publishing with IPFS fingerprints, IPFi licensing plus real MetaMask transactions for mint, tip, claim, and fractionalize, Data datasets registration, and IP Detection & Enforcement for verification and disputes. Try it at [DEMO_URL=https://cliplore.com/demo].”
