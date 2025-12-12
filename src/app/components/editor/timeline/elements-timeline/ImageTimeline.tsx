"use client";

import MediaTimelineTrack from "./MediaTimelineTrack";
import { Image as ImageIcon } from "lucide-react";

export default function ImageTimeline() {
  return (
    <MediaTimelineTrack
      mediaType="image"
      icon={<ImageIcon className="h-5 w-5" />}
    />
  );
}
