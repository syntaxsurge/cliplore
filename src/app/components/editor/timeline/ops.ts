export type TimelineClipBounds = {
  id: string;
  start: number;
  end: number;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getDurationSeconds(clip: TimelineClipBounds) {
  const duration = clip.end - clip.start;
  return isFiniteNumber(duration) ? Math.max(0, duration) : 0;
}

export function computeRipplePlacement(params: {
  clips: TimelineClipBounds[];
  movingId: string;
  desiredStart: number;
  duration: number;
}): { start: number; end: number; shifts: Record<string, number> } {
  const { clips, movingId, desiredStart, duration } = params;
  const safeDuration = isFiniteNumber(duration) ? Math.max(0, duration) : 0;

  const others = clips
    .filter((clip) => clip.id !== movingId)
    .filter(
      (clip) =>
        isFiniteNumber(clip.start) &&
        isFiniteNumber(clip.end) &&
        clip.end > clip.start,
    )
    .sort((a, b) => a.start - b.start);

  const hit =
    others.find((clip) => desiredStart >= clip.start && desiredStart < clip.end) ??
    null;

  const start = hit ? hit.end : desiredStart;
  const end = start + safeDuration;

  const next = others.find((clip) => clip.start >= start) ?? null;
  if (!next || next.start >= end) {
    return { start, end, shifts: {} };
  }

  const delta = end - next.start;
  const shifts: Record<string, number> = {};
  for (const clip of others) {
    if (clip.start >= next.start) shifts[clip.id] = delta;
  }

  return { start, end, shifts };
}

export function findNeighborLimits(params: {
  clips: TimelineClipBounds[];
  movingId: string;
  desiredStart: number;
}): { minStart: number; maxEnd: number } {
  const { clips, movingId, desiredStart } = params;
  const others = clips
    .filter((clip) => clip.id !== movingId)
    .filter(
      (clip) =>
        isFiniteNumber(clip.start) &&
        isFiniteNumber(clip.end) &&
        clip.end > clip.start,
    )
    .sort((a, b) => a.start - b.start);

  let minStart = 0;
  let maxEnd = Number.POSITIVE_INFINITY;

  const prev = [...others].reverse().find((clip) => clip.end <= desiredStart) ?? null;
  const next = others.find((clip) => clip.start >= desiredStart) ?? null;

  if (prev) minStart = prev.end;
  if (next) maxEnd = next.start;

  return { minStart, maxEnd };
}

