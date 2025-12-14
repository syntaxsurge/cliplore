"use client";

import type { PlayerRef } from "@remotion/player";
import { Player } from "@remotion/player";
import React, { forwardRef, memo } from "react";
import Composition, { type CompositionProps } from "./sequence/composition";

type CanvasPlayerProps = {
  durationInFrames: number;
  fps: number;
  compositionWidth: number;
  compositionHeight: number;
  inputProps: CompositionProps;
};

const playerStyle: React.CSSProperties = { width: "100%", height: "100%" };

export const CanvasPlayer = memo(
  forwardRef<PlayerRef, CanvasPlayerProps>(function CanvasPlayer(
    { durationInFrames, fps, compositionWidth, compositionHeight, inputProps },
    ref,
  ) {
    return (
      <Player
        ref={ref}
        component={Composition}
        inputProps={inputProps}
        durationInFrames={durationInFrames}
        compositionWidth={compositionWidth}
        compositionHeight={compositionHeight}
        fps={fps}
        style={playerStyle}
        controls={false}
        clickToPlay={false}
        audioLatencyHint="playback"
      />
    );
  }),
);

CanvasPlayer.displayName = "CanvasPlayer";

