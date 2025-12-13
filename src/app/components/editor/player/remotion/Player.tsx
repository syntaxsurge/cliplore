import { Player } from "@remotion/player";
import Composition from "./sequence/composition";
import { useAppSelector, useAppDispatch } from "@/app/store";
import { useEffect } from "react";
import { setCurrentTime, setIsPlaying } from "@/app/store/slices/projectSlice";
import MoveableOverlay from "./MoveableOverlay";
import { useEditorPlayer } from "./EditorPlayerContext";

export const PreviewPlayer = () => {
  const projectState = useAppSelector((state) => state.projectState);
  const { duration, currentTime, isPlaying, isMuted, fps } = projectState;
  const { playerRef, registerPlayer } = useEditorPlayer();
  const dispatch = useAppDispatch();
  const safeFps =
    typeof fps === "number" && Number.isFinite(fps) && fps > 0 ? fps : 30;

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

  return (
    <div className="relative w-full h-full">
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
        controls
        clickToPlay={false}
      />
      <MoveableOverlay />
    </div>
  );
};
