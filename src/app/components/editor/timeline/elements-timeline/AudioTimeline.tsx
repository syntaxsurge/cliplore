"use client";

import MediaTimelineTrack from "./MediaTimelineTrack";
import { Music } from "lucide-react";

export default function AudioTimeline() {
  return (
    <MediaTimelineTrack
      mediaType="audio"
      icon={<Music className="h-5 w-5" />}
    />
  );
}
