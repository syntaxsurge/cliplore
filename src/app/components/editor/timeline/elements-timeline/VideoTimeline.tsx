"use client";

import MediaTimelineTrack from "./MediaTimelineTrack";
import { Video } from "lucide-react";

export default function VideoTimeline() {
  return (
    <MediaTimelineTrack
      mediaType="video"
      icon={<Video className="h-5 w-5" />}
    />
  );
}
