import { Player } from "@remotion/player";
import Composition from "./sequence/composition";
import { useAppSelector, useAppDispatch } from "@/app/store";
import { useEffect, useMemo, useState } from "react";
import {
  setCurrentTime,
  setIsMuted,
  setIsPlaying,
} from "@/app/store/slices/projectSlice";
import MoveableOverlay from "./MoveableOverlay";
import { useEditorPlayer } from "./EditorPlayerContext";
import { Button } from "@/components/ui/button";
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCurrentPlayerFrame } from "./useCurrentPlayerFrame";

export const PreviewPlayer = () => {
  const projectState = useAppSelector((state) => state.projectState);
  const { duration, currentTime, isPlaying, isMuted, fps } = projectState;
  const { playerRef, player, registerPlayer } = useEditorPlayer();
  const dispatch = useAppDispatch();
  const safeFps =
    typeof fps === "number" && Number.isFinite(fps) && fps > 0 ? fps : 30;
  const playerFrame = useCurrentPlayerFrame(player);
  const playheadTime = playerFrame / safeFps;
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // update frame when current time with marker
  useEffect(() => {
    const safeTime =
      typeof currentTime === "number" && Number.isFinite(currentTime)
        ? currentTime
        : 0;
    const desiredFrame = Math.round(safeTime * safeFps);
    const player = playerRef.current;
    if (!player || isPlaying) return;
    player.pause();
    const currentFrame = player.getCurrentFrame();
    if (currentFrame !== desiredFrame) {
      player.seekTo(desiredFrame);
    }
  }, [currentTime, isPlaying, playerRef, safeFps]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handlePlay = () => dispatch(setIsPlaying(true));
    const handlePause = () => {
      dispatch(setIsPlaying(false));
      const frame = playerRef.current?.getCurrentFrame() ?? 0;
      dispatch(setCurrentTime(frame / safeFps));
    };

    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);
    return () => {
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
    };
  }, [dispatch, playerRef, safeFps]);

  // to control with keyboard
  useEffect(() => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.play();
    } else {
      playerRef.current.pause();
    }
  }, [isPlaying, playerRef]);

  useEffect(() => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.mute();
    } else {
      playerRef.current.unmute();
    }
  }, [isMuted, playerRef]);

  useEffect(() => {
    if (!player) return;
    const value = player.getVolume();
    if (Number.isFinite(value)) setVolume(value);
  }, [player]);

  useEffect(() => {
    const update = () => {
      const player = playerRef.current;
      setIsFullscreen(player?.isFullscreen() ?? false);
    };
    update();
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, [playerRef]);

  const durationSeconds = useMemo(() => {
    const safe = typeof duration === "number" && Number.isFinite(duration) ? duration : 0;
    return Math.max(0, safe);
  }, [duration]);

  const formatTime = (seconds: number) => {
    const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    const rounded = Math.floor(safe);
    const minutes = Math.floor(rounded / 60);
    const rem = rounded % 60;
    return `${minutes}:${rem.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative min-h-0 flex-1">
        <Player
          ref={registerPlayer}
          component={Composition}
          inputProps={{}}
          durationInFrames={
            Math.floor(
              (typeof duration === "number" &&
              Number.isFinite(duration) &&
              duration > 0
                ? duration
                : 1) * safeFps,
            ) + 1
          }
          compositionWidth={1920}
          compositionHeight={1080}
          fps={safeFps}
          style={{ width: "100%", height: "100%" }}
          controls={false}
          clickToPlay={false}
        />
        <MoveableOverlay />
      </div>

      <div className="border-t border-white/10 bg-black/60 px-3 py-2">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => dispatch(setIsPlaying(!isPlaying))}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => {
              dispatch(setIsMuted(!isMuted));
            }}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Volume2 className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const player = playerRef.current;
              const next = Number(e.target.value);
              if (!player || !Number.isFinite(next)) return;
              player.setVolume(next);
              setVolume(next);
              if (next > 0 && player.isMuted()) dispatch(setIsMuted(false));
            }}
            className="h-2 w-24 cursor-pointer accent-white/80"
            aria-label="Playback volume"
          />

          <div className="flex items-center gap-2 text-xs tabular-nums text-white/70">
            <span>{formatTime(playheadTime)}</span>
            <span className="text-white/30">/</span>
            <span>{formatTime(durationSeconds)}</span>
          </div>

          <div className="min-w-0 flex-1">
            <input
              type="range"
              min={0}
              max={Math.max(0, durationSeconds)}
              step={1 / safeFps}
              value={Math.min(durationSeconds, playheadTime)}
              onChange={(e) => {
                const player = playerRef.current;
                const nextTime = Number(e.target.value);
                if (!player || !Number.isFinite(nextTime)) return;
                dispatch(setIsPlaying(false));
                dispatch(setCurrentTime(nextTime));
                player.seekTo(Math.round(nextTime * safeFps));
              }}
              className="h-2 w-full cursor-pointer accent-white/80"
              aria-label="Seek"
            />
          </div>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => {
              const player = playerRef.current;
              if (!player) return;
              if (player.isFullscreen()) player.exitFullscreen();
              else player.requestFullscreen();
            }}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
