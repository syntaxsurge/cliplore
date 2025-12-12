import { Player, PlayerRef } from "@remotion/player";
import Composition from "./sequence/composition";
import { useAppSelector, useAppDispatch } from "@/app/store";
import { useRef, useEffect } from "react";
import { setIsPlaying } from "@/app/store/slices/projectSlice";
import MoveableOverlay from "./MoveableOverlay";

const fps = 30;

export const PreviewPlayer = () => {
  const projectState = useAppSelector((state) => state.projectState);
  const { duration, currentTime, isPlaying, isMuted } = projectState;
  const playerRef = useRef<PlayerRef>(null);
  const dispatch = useAppDispatch();

  // update frame when current time with marker
  useEffect(() => {
    const safeTime =
      typeof currentTime === "number" && Number.isFinite(currentTime)
        ? currentTime
        : 0;
    const frame = Math.round(safeTime * fps);
    if (playerRef.current && !isPlaying) {
      playerRef.current.pause();
      playerRef.current.seekTo(frame);
    }
  }, [currentTime, isPlaying]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handlePlay = () => dispatch(setIsPlaying(true));
    const handlePause = () => dispatch(setIsPlaying(false));

    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);
    return () => {
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
    };
  }, [dispatch]);

  // to control with keyboard
  useEffect(() => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.play();
    } else {
      playerRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.mute();
    } else {
      playerRef.current.unmute();
    }
  }, [isMuted]);

  return (
    <div className="relative w-full h-full">
      <Player
        ref={playerRef}
        component={Composition}
        inputProps={{}}
        durationInFrames={
          Math.floor(
            (typeof duration === "number" &&
            Number.isFinite(duration) &&
            duration > 0
              ? duration
              : 1) * fps,
          ) + 1
        }
        compositionWidth={1920}
        compositionHeight={1080}
        fps={fps}
        style={{ width: "100%", height: "100%" }}
        controls
        clickToPlay={false}
      />
      <MoveableOverlay />
    </div>
  );
};
