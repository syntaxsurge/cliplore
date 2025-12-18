import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default function MarketingHomePage() {
  const demoVideoUrl = process.env.DEMO_VIDEO_URL?.trim() ?? "";
  const pitchDeckUrl = process.env.PITCH_DECK_URL?.trim() ?? "";
  return <HomeClient demoVideoUrl={demoVideoUrl} pitchDeckUrl={pitchDeckUrl} />;
}
