export type DemoSlug = "anime" | "horror" | "fantasy" | "commercial" | "brainrot";

export type DemoClip = {
  title: string;
  durationSeconds: number;
  prompt: string;
};

export type DemoEntry = {
  slug: DemoSlug;
  label: string;
  subtitle: string;
  youtubeUrl: string;
  storyPortalAssetUrl: string;
  storyExplorerUrl: string;
  clips: DemoClip[];
};

export const DEMO_ORDER: DemoSlug[] = [
  "anime",
  "horror",
  "fantasy",
  "commercial",
  "brainrot",
];

export const DEMOS: Record<DemoSlug, DemoEntry> = {
  anime: {
    slug: "anime",
    label: "Anime",
    subtitle: "High-end 2D film look, sakuga beats, Spiral Vow arc.",
    youtubeUrl: "https://youtu.be/arg3it3d3cI",
    storyPortalAssetUrl:
      "https://portal.story.foundation/assets/0x876e3422350D7A9f5Cb158909E6DD07817C3539d",
    storyExplorerUrl:
      "https://explorer.story.foundation/ipa/0x876e3422350D7A9f5Cb158909E6DD07817C3539d",
    clips: [
      {
        title: "CLIP 1 (15s) — Bamboo forest ambush",
        durationSeconds: 15,
        prompt: `Sora prompt — CLIP 1 (15s) “Bamboo forest ambush” STYLE: high-end 2D anime film look, cel-shaded with painterly backgrounds, dramatic rim light, heavy atmosphere, sakuga action beats, speed lines, impact frames, subtle film grain. SETTING: moonlit bamboo forest, thick rolling mist, wet leaves, floating paper charms, no branded symbols. MAIN CHARACTER (repeat EXACTLY): Ren (17), lean athletic build, slightly tan skin, amber eyes, small scar through right eyebrow, short spiky black hair with teal sheen. Outfit: fitted charcoal ninja undersuit; sleeveless crimson short haori jacket with orange stitched trim; black fingerless gloves; utility belt with small pouches; dark wrapped forearm bandages; shin guards over black leggings; scuffed open-toe ninja sandals. Black cloth headband with brushed steel plate engraved with an original spiral-crescent emblem (not the Leaf symbol). Short tanto strapped at lower back. EFFECTS: Spiral Chakra = electric cyan energy + red “ink-blood” calligraphy splashes (stylized, not gory). SHOT LIST (15s total): 0.00–2.00 wide moonlit bamboo forest, Ren drops in crouched, haori fluttering in mist. 2.00–3.50 insert headband plate glint; BIG overlay text: “MISSION: ESCORT” (clean white tech font) with faint red ink smear. 3.50–5.50 tracking run, parkour across bamboo trunks, speed lines; Ren carries scroll case. 5.50–7.00 impact frame: masked pursuer slices past; sparks, torn paper fragments; no gore. 7.00–9.00 close on Ren’s hand: quick thumb bite (minimal), smear seal mark on scroll; BIG overlay: “BLOOD SEAL // INIT” (red ink dripping effect). 9.00–11.00 sakuga burst: Spiral Chakra ignites around arms, cyan lightning + red calligraphy spirals. 11.00–13.00 brutal block: Ren deflects blade with forearm guard, guard cracks, he grimaces; BIG overlay: “VOW: PROTECT”. 13.00–15.00 mist parts: towering ink-spirit silhouette behind pursuer, glowing eyes; Ren turns shocked; hard cut. DIALOGUE (VO, intense): “I don’t run from fate… I run through it. Spiral Vow—activate!” SFX/MUSIC: taiko hits, sharp whooshes, bamboo creaks, low ominous note when ink-spirit appears.`,
      },
      {
        title: "CLIP 2 (15s) — Neon rooftop shrine showdown",
        durationSeconds: 15,
        prompt: `Sora prompt — CLIP 2 (15s) “Neon rooftop shrine showdown” STYLE: same anime film quality, but different palette: neon reflections + rain, stronger contrast, sakuga bursts, impact frames. SETTING: rainy neon city rooftop with small shrine gate, flickering lantern, puddles reflecting cyan and magenta, no logos. MAIN CHARACTER (repeat EXACTLY): Ren (17), lean athletic build, slightly tan skin, amber eyes, small scar through right eyebrow, short spiky black hair with teal sheen. Outfit: fitted charcoal ninja undersuit; sleeveless crimson short haori jacket with orange stitched trim; black fingerless gloves; utility belt with small pouches; dark wrapped forearm bandages; shin guards over black leggings; scuffed open-toe ninja sandals. Black cloth headband with brushed steel plate engraved with an original spiral-crescent emblem (not the Leaf symbol). Short tanto strapped at lower back. EFFECTS: Spiral Chakra electric cyan + red ink-blood calligraphy splashes (stylized). Villain’s entity = jagged black calligraphy wings, glowing red accents. SHOT LIST (15s total): 0.00–2.00 smash cut: Ren lands on neon rooftop in rain, sliding to a stop, water spray arcs. 2.00–4.00 overhead: glowing UI-like sigils form a targeting circle; BIG overlay: “LOCKED TARGET”. 4.00–6.00 villain reveal under lantern; ink-spirit blooms into calligraphy wings behind them. 6.00–8.00 chain kunai thrown; sparks scrape shrine floor, rain hiss; Ren dodges by inches. 8.00–10.00 Ren sees civilians far below (tiny silhouettes); he steps between edge and threat; BIG overlay: “TRUE STRENGTH = SHIELD”. 10.00–12.00 Ren slams palm down; Spiral Chakra erupts into a spiral barrier, cyan ring + red kanji (large, legible). 12.00–15.00 barrier absorbs strike; fractures into glowing paper-petal shards; Ren stands trembling but steady; end-frame BIG text: “PROTECT. THEN BECOME.” cut to black with thunder. DIALOGUE (VO): “Power that only wins… is weak. My vow is a shield. Spiral Vow: Guard the living.” SFX/MUSIC: rain roar, neon buzz, bass drop on barrier, thunder hit on final cut.`,
      },
    ],
  },
  horror: {
    slug: "horror",
    label: "Horror",
    subtitle: "Cursed upload dread and server corridor horror realism.",
    youtubeUrl: "https://youtu.be/nG9PKo_tlfw",
    storyPortalAssetUrl:
      "https://portal.story.foundation/assets/0x9C24ccD6256067fb26029Be3bcF0731d38535d26",
    storyExplorerUrl:
      "https://explorer.story.foundation/ipa/0x9C24ccD6256067fb26029Be3bcF0731d38535d26",
    clips: [
      {
        title: "CLIP 1 (15s) — Apartment / cursed upload",
        durationSeconds: 15,
        prompt: `PROMPT — CLIP 1 (15s) “Apartment / cursed upload” Format & Look: modern cinematic horror, hyper-real digital capture, subtle film grain, faint halation on highlights, cold fluorescent flicker, deep shadows, realistic textures. Color palette: sickly greenish fluorescents + deep blacks + sharp red UI accents + occasional VHS glitch artifacts. Environment: cramped apartment editing setup at night. Desk clutter: cables, old notes, a cracked mirror on the wall, rain tapping the window. No branding, no readable small text. Main character (repeat EXACTLY): Mara (late 20s), pale skin, tired under-eyes, sharp cheekbones, straight black hair in a chin-length bob with blunt bangs, small healed cut under left eye, dark brown eyes. Wardrobe: oversized charcoal hoodie, black matte leather jacket, dark ripped jeans, scuffed black combat boots, thin silver chain necklace, red cloth wrist wrap on right wrist. Props: cracked-screen phone, small flashlight, VISITOR badge lanyard. Cinematography: Handheld but controlled, 35mm lens for room shots, 50mm for inserts. Slow push-ins during dread moments. Quick snap focus when the glitch hits. One major slam-cut to black at the end. SHOT LIST (15s total): 0.00–2.00 — Extreme close-up of laptop screen in darkness: a big simple progress bar labeled “ASSET REGISTRY” pulses at 98%. 2.00–4.00 — Medium shot: Mara at desk, face lit by screen glow, whispering, tense shoulders. 4.00–6.00 — Insert close-up: cracked phone buzzes; huge caller ID reads “UNKNOWN”. Sound is too loud, unnatural. 6.00–8.00 — Over-shoulder: progress hits 99% and stalls; UI distorts to “CLAIMING…” in red glitch text. 8.00–10.00 — The keyboard types on its own; the laptop screen forms giant dripping blood text: “YOUR FACE IS THE KEY”. 10.00–12.00 — Mirror angle behind Mara: hallway light flickers; a near-human silhouette almost steps in, then vanishes with each flicker. 12.00–13.50 — Mara slams laptop shut; quick cut to her palm scraping broken glass near the desk; a fast smear of blood (brief, not gory). 13.50–15.00 — Mara yanks the apartment door open and runs into a hallway that stretches impossibly long; door slam; hard cut to black. Dialogue (keep short, timed): OpenAI Cookbook Mara (whisper): “It’s just a file. It’s just a file.” Mara (shaking): “Stop… uploading.” Mara (panicked, final second): “Don’t take my face.” Background sound: fluorescent hum, rain, faint hard drive whine, then a sudden digital screech as the bloody text appears.`,
      },
      {
        title: "CLIP 2 (15s) — Underground server corridor / attempted unregister",
        durationSeconds: 15,
        prompt: `PROMPT — CLIP 2 (15s) “Underground server corridor / attempted unregister” Format & Look: same cinematic horror realism, same grain + flicker + glitch language as Clip 1. Color palette: colder and harsher—blue-green fluorescents, deep black shadows, red UI and blood text as the only warm color. Environment: underground corridor lined with generic server racks and hanging cables, damp concrete floor, distant echo. No logos. Minimal readable text only in big bold letters on the kiosk screen. Main character (repeat EXACTLY): Mara (late 20s), pale skin, tired under-eyes, sharp cheekbones, straight black hair in a chin-length bob with blunt bangs, small healed cut under left eye, dark brown eyes. Wardrobe: oversized charcoal hoodie, black matte leather jacket, dark ripped jeans, scuffed black combat boots, thin silver chain necklace, red cloth wrist wrap on right wrist. Props: cracked-screen phone, small flashlight, VISITOR badge lanyard. Cinematography: Wider 28–35mm for corridor dread, tight 50mm for face-scan moment. Strobe flicker used as the “monster movement” device (each flicker = closer). End on a violent cut-to-black. SHOT LIST (15s total): 0.00–2.00 — Mara bursts through a heavy industrial door into the server corridor, breath fogging in cold air, flashlight shaking. 2.00–4.00 — Flashlight POV: cables sway; a wet dragging sound echoes; the beam catches dust motes like insects. 4.00–6.00 — Wide shot: a terminal kiosk glows at the end; giant text reads “IDENTITY MATCH REQUIRED”. 6.00–8.00 — Close-up: Mara forces her face toward the kiosk camera; eyes watering; fear and determination. 8.00–10.00 — The screen flashes bright red “APPROVED”… then the letters distort into “OWNED” in dripping blood text. 10.00–12.00 — Lights strobe: behind Mara, a tall human silhouette appears closer with each flicker (not detailed, just horrifying presence). 12.00–13.50 — Mara spins and swings flashlight—beam shows empty corridor; then an oily handprint appears on the camera lens as if touched from inside the screen. 13.50–15.00 — The kiosk emits a modem-like shriek; giant bloody text fills screen: “YOU ARE THE ASSET”; cut to black. Dialogue: OpenAI Cookbook Mara (breathless): “Unregister me. Delete me.” Mara (near tears): “I didn’t agree to this.” Mara (final beat): “Give me my face back.” Background sound: low server-room rumble, distant metallic creaks, strobe clicks, modem shriek, then silence.`,
      },
    ],
  },
  fantasy: {
    slug: "fantasy",
    label: "Sci‑Fi + Fantasy",
    subtitle: "Orbital vault heist into floating ruin + AI-dragon oath seal.",
    youtubeUrl: "https://youtu.be/yAPCginIIbY",
    storyPortalAssetUrl:
      "https://portal.story.foundation/assets/0xF0607E8F6506A6e6d6EE73A5C34eaeEF9F72156D",
    storyExplorerUrl:
      "https://explorer.story.foundation/ipa/0xF0607E8F6506A6e6d6EE73A5C34eaeEF9F72156D",
    clips: [
      {
        title: "CLIP 1 (15s) — Orbital vault heist",
        durationSeconds: 15,
        prompt: `Sora prompt — CLIP 1 (15s) “Orbital vault heist” The guide recommends writing prompts like a storyboard: framing, DOF, action in beats, lighting/palette, and keeping each shot’s action simple and timed. OpenAI Cookbook STYLE / FORMAT: photoreal cinematic sci-fi + fantasy VFX, crisp texture detail, subtle film grain, high contrast, controlled handheld energy, minimal motion blur, occasional glitch artifacts only when the Registry reacts. SETTING: cathedral-like orbital vault corridor: metallic ribs, holographic “stained glass” panels, cold vapor vents, floating security drones. Avoid logos and tiny readable text. LIGHTING + PALETTE: harsh white top light + cyan rim light; palette anchors: cyan, teal, deep violet blacks; blood-red UI accents when alarms trigger. OpenAI Cookbook MAIN CHARACTER (repeat EXACTLY): Kai (male Asian, 22), lean athletic build. Face: light-medium skin, straight black hair with an undercut and long side-swept fringe, one thin silver streak on the fringe, dark brown eyes, small mole under the left eye, faint bruising on the right cheekbone, no beard. Wardrobe: fitted black techwear bodysuit (matte), dark graphite long coat (mid-calf, high collar, slim fit) with teal luminous piping along seams, charcoal armored chest harness (two straps crossing sternum), fingerless tactical gloves, utility belt with small pouches, reinforced knee panels, black combat boots with metal toe caps. White scarf wrap (short) printed with faint glowing rune glyphs (cyan). Weapons/props: rune-katana (black blade with cyan circuit-runes), palm-sized Namecore crystal (glows cyan with red ink cracks when stressed). CINEMATOGRAPHY: Lens: 35mm for wides, 50mm for inserts. DOF: shallow on closeups, deeper on corridor. Camera movement: one clear move per shot (push-in, tracking, or whip-pan). OpenAI Cookbook SHOT LIST (15s total): 0.00–2.00 — Extreme close-up on Kai’s eyes; HUD reflections flicker; a red warning pulse appears. 2.00–4.00 — Wide tracking: Kai sprints down the orbital vault corridor; coat snaps; drones wake up. 4.00–6.00 — Medium: Kai draws rune-katana; one clean slash destroys a drone; sparks and shards fly (no gore). 6.00–8.00 — Insert: Kai grabs the Namecore from a floating containment ring; ring fractures like a broken halo. 8.00–10.00 — Over-shoulder to terminal: giant legible text flashes “AUTH FAIL” then “TRUE NAME DETECTED” in blood-red UI with slight drip effect. 10.00–12.00 — Brutal hit: turret fire grazes Kai’s shoulder; quick blood smear on glove; he stumbles one step, continues. 12.00–15.00 — Airlock: door seals; Kai leaps into vacuum; a circular rune-portal rips open in space; hard cut mid-jump. DIALOGUE / VO (short, intense): OpenAI Cookbook Kai (whisper): “They archived my name…” Kai (through teeth): “I’m taking it back.” Kai (final): “Open the gate.” SOUND: low vault hum, alarm stingers, katana energy hiss, vacuum thud + muffled heartbeat on portal tear.`,
      },
      {
        title: "CLIP 2 (15s) — Floating Ruin + AI-Dragon — OATH SEAL",
        durationSeconds: 15,
        prompt: `Sora prompt — CLIP 2 (15s) “Floating ruin + AI-dragon” TITLE: Floating Ruin + AI-Dragon — OATH SEAL (15s) STYLE / FORMAT: photoreal dark fantasy with sci-fi glitch, epic scale, crisp stone texture, floating dust motes, rune light with physics-based volumetrics, high contrast, subtle film grain, minimal motion blur. Brutal trailer pacing. SETTING: ancient floating ruin over an abyss: suspended arches, broken stairs, rune-etched stone, statues of fallen knights. No logos, no branded signage, no small readable text. LIGHTING + PALETTE: moonless darkness with cyan rune-glow as key light, violet shadows, harsh white specular highlights, occasional crimson UI overlays when the dragon locks on. Palette anchors: cyan/teal + deep violet + harsh white + crimson accents. MAIN CHARACTER (repeat EXACTLY): Kai (male Asian, 22), lean athletic build. Face: light-medium skin, straight black hair with an undercut and long side-swept fringe, one thin silver streak on the fringe, dark brown eyes, small mole under the left eye, faint bruising on the right cheekbone, no beard. Wardrobe: fitted black techwear bodysuit (matte), dark graphite long coat (mid-calf, high collar, slim fit) with teal luminous piping along seams, charcoal armored chest harness (two straps crossing sternum), fingerless tactical gloves, utility belt with small pouches, reinforced knee panels, black combat boots with metal toe caps. White scarf wrap (short) printed with faint glowing rune glyphs (cyan). Weapons/props: rune-katana (black blade with cyan circuit-runes), palm-sized Namecore crystal (glows cyan with crimson ink cracks when stressed). CREATURE: AI-dragon made of obsidian plates + cable tendons; eyes are red UI apertures; roar causes brief pixel-glitch ripples in the air; wing edges are holographic noise. CINEMATOGRAPHY: 28–35mm for scale, 50mm for Namecore closeups. One clear action per shot. Use a dramatic vertical drop camera at the start, then wide reveal, then fast dash impact. SHOT LIST (15s total): 0.00–2.00 — Kai drops through a circular rune-portal into a sunless floating ruin, lands on one knee; dust rises upward (reversed gravity). 2.00–4.00 — Closeup: Namecore pulses cyan; crimson ink cracks crawl like living circuitry; nearby stone runes ignite in sync. 4.00–6.00 — Wide: suspended arches over abyss; knight statues line path; barcode-like sigils on foreheads; faint red scanlines flicker in their eyes. 6.00–8.00 — Sky fractures: AI-dragon assembles from obsidian plates and cables; glitch ripples distort the air. 8.00–10.00 — Kai presses Namecore to chest harness; a circular biometric rune lattice blooms from his palm and scarf glyphs; giant overlay text: “OATH SEAL // VERIFIED” with a wet crimson-ink stamp effect. 10.00–12.00 — Action: Kai dash-steps and delivers one clean rune-katana slash; cyan arc trail; dragon faceplate fractures into glowing glyph shards and sparks. 12.00–15.00 — Finale: Kai plants blade tip into stone; circular rune array locks shut like a vault door; dragon is pulled into a spiral glyph vortex and collapses into burning rune fragments; end text: “A TRUE NAME IS NOT FOR SALE.” Cut to black. DIALOGUE / VO (intense, minimal): Kai: “A name isn’t property.” Kai: “It’s a promise.” Kai (final): “Witness me.” SOUND: abyss wind, distant rune choir, glitch-roar, bass hit on “OATH SEAL,” sharp impact hit on slash, heavy silence after the seal locks.`,
      },
    ],
  },
  commercial: {
    slug: "commercial",
    label: "Commercial / Spec‑Ad",
    subtitle: "Premium minimalist studio reveal + rainy neon thriller demo.",
    youtubeUrl: "https://youtu.be/PYIlIg82aLc",
    storyPortalAssetUrl:
      "https://portal.story.foundation/assets/0xC3f6c2F997aC7b2Cc7e3BdCf91398CCcDFEaDA73",
    storyExplorerUrl:
      "https://explorer.story.foundation/ipa/0xC3f6c2F997aC7b2Cc7e3BdCf91398CCcDFEaDA73",
    clips: [
      {
        title: "CLIP 1 (15s) — Studio reveal",
        durationSeconds: 15,
        prompt: `Sora Prompt — CLIP 1 (15s) “Studio reveal” STYLE: premium minimalist TV commercial, ultra-clean studio lighting, crisp macro detail, smooth camera moves, high contrast, subtle film grain, luxury UI design, no brand logos. SETTING: white cyclorama studio + black void for typography beats. PALETTE: deep black, harsh white highlights, cyan/teal UI glow, occasional crimson ink-drip stamp for 1-word emphasis. MAIN CHARACTER (repeat EXACTLY): Kai (male Asian, 22), lean athletic build. Face: light-medium skin, straight black hair with an undercut and long side-swept fringe, one thin silver streak on the fringe, dark brown eyes, small mole under the left eye, faint bruising on the right cheekbone, no beard, clean-shaven. Wardrobe: fitted black techwear bodysuit (matte), dark graphite long coat (mid-calf, high collar, slim fit) with teal luminous piping along seams, charcoal armored chest harness (two straps crossing the sternum), fingerless tactical gloves, utility belt with small pouches, reinforced knee panels, black combat boots with metal toe caps, short white scarf wrap printed with faint glowing rune-glyphs (cyan). Props: thin matte-black laptop + minimalist tablet (no logos). PRODUCT (software): MIRRORSTAMP app UI: drag-and-drop “DROP FILE”, scanning animation, “Proof Card” panel with large readable fields. TYPOGRAPHY RULES: only 1–3 words per overlay, huge bold sans-serif; accent words use crimson ink-drip texture: “SEALED”. SHOT LIST (15s): 0.00–2.00 black screen → cyan heartbeat line → wordmark “MIRRORSTAMP”. 2.00–4.00 macro laptop opening, clean UI appears: “DROP FILE”. 4.00–6.00 over-shoulder drag file into drop zone, UI: “SCANNING”. 6.00–8.00 close-up fingerprint rings form, UI: “ORIGINAL MATCH: YOU”. 8.00–10.00 Proof Card slides in: “PROOF ID / TIMELOCK / CREATOR” (big). 10.00–12.00 crimson ink-drip stamp hits: “SEALED”. 12.00–15.00 Kai in white studio holding tablet Proof Card; tagline: “PROOF. INSTANT.” cut to black. VOICEOVER: “If you create… you deserve proof. MirrorStamp. Seal it in seconds.” SOUND: clean clicks, low sub-bass, one heavy hit on “SEALED”.`,
      },
      {
        title: "CLIP 2 (15s) — Rain thriller demo",
        durationSeconds: 15,
        prompt: `Sora Prompt — CLIP 2 (15s) “Rain thriller demo” STYLE: cinematic night commercial, rain, neon reflections, shallow depth of field, stabilized handheld, premium UI overlays, no logos. SETTING: rainy neon city walkway with a large generic public screen (no branding). PALETTE: cyan/teal highlights + violet blacks; crimson accents only for the single word “DENIED”. MAIN CHARACTER (repeat EXACTLY): Kai (male Asian, 22), lean athletic build. Face: light-medium skin, straight black hair with an undercut and long side-swept fringe, one thin silver streak on the fringe, dark brown eyes, small mole under the left eye, faint bruising on the right cheekbone, no beard, clean-shaven. Wardrobe: fitted black techwear bodysuit (matte), dark graphite long coat (mid-calf, high collar, slim fit) with teal luminous piping along seams, charcoal armored chest harness (two straps crossing the sternum), fingerless tactical gloves, utility belt with small pouches, reinforced knee panels, black combat boots with metal toe caps, short white scarf wrap printed with faint glowing rune-glyphs (cyan). Props: minimalist tablet (no logos). TYPOGRAPHY RULES: big readable overlays only: “REPOST”, “MATCH FOUND”, “SOURCE: YOU”, “PROOF PACKET READY”, “DENIED”, “NOT ORIGINAL”. SHOT LIST (15s): 0.00–2.00 smash cut to rainy neon walkway; public screen shows “REPOST”. 2.00–4.00 close on Kai looking up, rain on lashes, controlled intensity. 4.00–6.00 tablet UI: “LIVE MATCHING” with cyan scanline sweep. 6.00–8.00 UI locks to public screen: “MATCH FOUND” + “SOURCE: YOU”. 8.00–10.00 “PROOF PACKET READY” then crimson ink-drip stamp: “DENIED”. 10.00–12.00 public screen stylized freeze with overlay: “NOT ORIGINAL”. 12.00–15.00 hero: Proof Card fills frame; tagline: “MIRRORSTAMP — CONTROL THE RECEIPT.” cut to black. VOICEOVER: “Copying is easy. Proof is brutal. Denied.” SOUND: rain bed, tight whooshes, bass hit on “DENIED”, silence tail on cut-to-black.`,
      },
    ],
  },
  brainrot: {
    slug: "brainrot",
    label: "Brainrot",
    subtitle: "Hyperreal meme-edit chaos with a REGISTER portal arc.",
    youtubeUrl: "https://youtu.be/To8Z_Cvv1fk",
    storyPortalAssetUrl:
      "https://portal.story.foundation/assets/0x62d31e0dA2aA48505c5CEf0c07BA817b4764E012",
    storyExplorerUrl:
      "https://explorer.story.foundation/ipa/0x62d31e0dA2aA48505c5CEf0c07BA817b4764E012",
    clips: [
      {
        title: "CLIP 1 (15s) — BOOT + CHASE",
        durationSeconds: 15,
        prompt: `PROMPT — CLIP 1 (15s) “BOOT + CHASE” Style: Hyperreal 3D meme-edit aesthetic with VHS glitch, punchy motion, mild chromatic aberration, shallow depth of field on hero subject, crisp specular highlights, fast rhythmic cuts. Prose description: A surreal “Internet Mall” made of floating UI panels, neon vending machines, and looping GIF billboards (abstract shapes only; avoid small readable text). Palette anchors: acid green, hot pink, electric cyan, deep violet. Main character: a glossy 3D “Meme Courier” with an emoji-face helmet (no brand logos), lime-green puffer jacket, chrome sneakers, and a translucent briefcase filled with floating sticker-icons. Lighting: neon signage glow with soft rim light; occasional glitch flicker; consistent color anchors across all shots. Cinematography: Camera: handheld-but-stable “meme trailer” energy; quick whip pans, smash zooms, and one clean hero close-up. Lens: 28mm wide for running shots; 50mm for the calm close-up. Mood: chaotic, funny, escalating tension. SHOT LIST (15s total): 0.00–2.00 — Shot 1 (macro intro, 50mm): Extreme close-up inside the briefcase: a pulsing “idea orb” beats like a heart; sticker-icons drift in slow orbit. 2.00–4.00 — Shot 2 (wide chase, 28mm): Whip-pan reveal: Meme Courier sprints down the Internet Mall aisle; floating sticker-icons spill behind like confetti. 4.00–6.00 — Shot 3 (insert, 28mm): A giant abstract slot-machine sign flickers “GENRE??” in big simple shapes; the Courier slaps the lever mid-run. 6.00–8.00 — Shot 4 (rapid montage): Strobing billboard silhouettes suggest genre vibes (anime/horror/sci-fi/ad) as quick visual flashes; keep them abstract and original. 8.00–10.00 — Shot 5 (impact): The machine lands on “BRAINROT” (big bold simple letters if any); neon surges; gravity flips for one second; the Courier floats then snaps back. 10.00–12.00 — Shot 6 (calm close-up, 50mm): Sudden quiet: close-up on emoji helmet; Courier raises one finger: “shhh,” eyes wide, comedic seriousness. 12.00–15.00 — Shot 7 (match-cut setup, wide): A huge floating REGISTER portal frame appears; the Courier dives toward it; the screen tears into a clean glitch transition, ending mid-dive. Dialogue (fast, meme cadence): OpenAI Cookbook Narrator: “Bro. I found the original idea orb.” Narrator: “We’re speedrunning reality with it.” Narrator: “If it hits BRAINROT… don’t blink.” Narrator: “UPLOAD IT. NOW.” Background sound (optional): fast whooshes, bass hits on cuts, neon hum, one comedic “slot-machine ding”.`,
      },
      {
        title: "CLIP 2 (15s) — REGISTER + REALITY COLLAPSE",
        durationSeconds: 15,
        prompt: `PROMPT — CLIP 2 (15s) “REGISTER + REALITY COLLAPSE” Style: EXACT same style, palette anchors, and character description as Clip 1 for continuity. Prose description: Continue in the same surreal “Internet Mall” world. The REGISTER portal frame is now the main set piece (abstract UI frame, no brand marks). Main character remains identical: glossy 3D Meme Courier with emoji-face helmet, lime-green puffer jacket, chrome sneakers, translucent briefcase of floating sticker-icons. Palette anchors: acid green, hot pink, electric cyan, deep violet. Lighting: neon rim light + glitch flicker, consistent. Cinematography: Camera: punchy meme-edit pacing; one clear action per shot; match-cut continuity from the dive. OpenAI Cookbook +1 Lens: 28mm for action, 50mm for final freeze. SHOT LIST (15s total): 0.00–2.00 — Shot 1 (landing continuity): Start on the portal frame; Meme Courier lands from the dive, hands out like stabilizing a glitchy screen. 2.00–4.00 — Shot 2 (UI gag): The portal UI becomes a silly “progress bar worm” that eats the percentage; cartoony, cute, not gross. 4.00–6.00 — Shot 3 (stamp moment): Briefcase opens; idea orb floats up and “stamps itself” with a big simple APPROVED icon (avoid tiny text). 6.00–8.00 — Shot 4 (meme court): Smash cut: “Meme Court” in the same mall—giant traffic cone judge slams a gavel; confetti burst. 8.00–10.00 — Shot 5 (self-referential loop): Courier receives a glowing ticket; it unfolds into a tiny poster showing the Courier holding the orb (meta). 10.00–12.00 — Shot 6 (mirror sprint): Hall-of-mirrors run; reflections are increasingly chaotic variants but keep outfit/colors consistent. 12.00–15.00 — Shot 7 (clean end frame): Freeze-frame hero pose: Courier holds glowing orb like a trophy; glitch resolves into a stable, uncluttered frame (leave space bottom-center for captions you’ll add in editing). Dialogue: OpenAI Cookbook Narrator: “Chat, we are registering the brainrot.” Narrator: “The upload is… alive.” Narrator: “Verdict: original enough.” Narrator: “Cut the clip. It’s canon now.” Background sound: gavel “bonk,” crowd “oooh,” glitch zap, then a clean hold tone for the freeze-frame.`,
      },
    ],
  },
};

export function getDemo(slug: string): DemoEntry | null {
  if (!slug) return null;
  const key = slug as DemoSlug;
  return DEMOS[key] ?? null;
}

