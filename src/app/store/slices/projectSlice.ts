import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  TextElement,
  MediaFile,
  ActiveElement,
  ExportConfig,
  ProjectState,
  ProjectHistoryEntry,
  ProjectExport,
  ProjectPublishRecord,
  RenderEngine,
  SoraJob,
  SoraJobStatus,
  TimelineTrack,
  TimelineMarker,
  TrackKind,
} from "../../types";
import {
  isSoraSizeAllowed,
  SORA_DEFAULTS,
  type SoraModel,
  type SoraSeconds,
  type SoraSize,
} from "@/features/ai/sora/capabilities";

const MAX_HISTORY = 50;

const createTrack = (index: number): TimelineTrack => ({
  id: crypto.randomUUID(),
  kind: "layer",
  name: `Layer ${index}`,
});

const normalizeTracks = (value: unknown): TimelineTrack[] => {
  const raw = Array.isArray(value) ? (value as unknown[]) : [];
  const sanitized: TimelineTrack[] = raw
    .filter(
      (track) =>
        track &&
        typeof track === "object" &&
        typeof (track as any).id === "string",
    )
    .map((track, idx) => ({
      id: String((track as any).id),
      kind: "layer" as TrackKind,
      name:
        typeof (track as any).name === "string"
          ? String((track as any).name)
          : `Layer ${idx + 1}`,
      muted:
        typeof (track as any).muted === "boolean"
          ? (track as any).muted
          : undefined,
      locked:
        typeof (track as any).locked === "boolean"
          ? (track as any).locked
          : undefined,
      hidden:
        typeof (track as any).hidden === "boolean"
          ? (track as any).hidden
          : undefined,
    }));

  const withMinimum =
    sanitized.length >= 2
      ? sanitized
      : [
          ...sanitized,
          ...Array.from({ length: 2 - sanitized.length }, (_, i) =>
            createTrack(sanitized.length + i + 1),
          ),
        ];

  return withMinimum.map((track, idx) => ({ ...track, name: `Layer ${idx + 1}` }));
};

const normalizeMarkers = (value: unknown): TimelineMarker[] => {
  const raw = Array.isArray(value) ? (value as TimelineMarker[]) : [];
  const markers = raw
    .filter(
      (marker) =>
        marker &&
        typeof marker === "object" &&
        typeof marker.id === "string" &&
        typeof (marker as any).time === "number" &&
        Number.isFinite((marker as any).time),
    )
    .map((marker) => ({
      id: marker.id,
      time: Math.max(0, marker.time),
      label: typeof marker.label === "string" ? marker.label : undefined,
      color: typeof marker.color === "string" ? marker.color : undefined,
    }))
    .sort((a, b) => a.time - b.time);

  return markers;
};

const defaultExportSettings: ExportConfig = {
  resolution: "1080p",
  quality: "high",
  speed: "fastest",
  fps: 30,
  format: "mp4",
  includeSubtitles: false,
  renderEngine: "ffmpeg",
};

export const createProjectState = (
  overrides: Partial<ProjectState> = {},
): ProjectState => {
  const { exportSettings: exportSettingsOverrides, ...restOverrides } = overrides;
  const now = new Date().toISOString();
  const next: ProjectState = {
    id: crypto.randomUUID(),
    projectName: "",
    createdAt: now,
    lastModified: now,
    mediaFiles: [],
    textElements: [],
    tracks: normalizeTracks(undefined),
    markers: normalizeMarkers(undefined),
    soraJobs: [],
    exports: [],
    currentTime: 0,
    isPlaying: false,
    isMuted: false,
    duration: 0,
    filesID: [],
    zoomLevel: 1,
    timelineZoom: 100,
    enableMarkerTracking: true,
    activeSection: "media",
    activeElement: null,
    activeElementIndex: 0,
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    aspectRatio: "16:9",
    history: [],
    future: [],
    historyLockDepth: 0,
    ...restOverrides,
    exportSettings: {
      ...defaultExportSettings,
      ...(exportSettingsOverrides ?? {}),
    },
  };
  next.tracks = normalizeTracks(next.tracks);
  next.markers = normalizeMarkers((next as any).markers);
  return next;
};

const snapshotState = (state: ProjectState): ProjectHistoryEntry => {
  const {
    history,
    future,
    historyLockDepth,
    currentTime,
    isPlaying,
    isMuted,
    timelineZoom,
    enableMarkerTracking,
    activeSection,
    activeElement,
    activeElementIndex,
    soraJobs,
    ...rest
  } = state;
  return JSON.parse(JSON.stringify(rest));
};

const pushHistory = (state: ProjectState) => {
  if (state.historyLockDepth > 0) return;
  const snap = snapshotState(state);
  state.history = [...state.history, snap].slice(-MAX_HISTORY);
  state.future = [];
  state.lastModified = new Date().toISOString();
};

export const initialState: ProjectState = createProjectState();

const calculateTotalDuration = (
  mediaFiles: MediaFile[],
  textElements: TextElement[],
): number => {
  const mediaDurations = mediaFiles.map((v) => v.positionEnd);
  const textDurations = textElements.map((v) => v.positionEnd);
  return Math.max(0, ...mediaDurations, ...textDurations);
};

const pruneEmptyTracks = (state: ProjectState) => {
  const usedTrackIds = new Set<string>();
  for (const clip of state.mediaFiles) {
    if (typeof clip.trackId === "string") usedTrackIds.add(clip.trackId);
  }
  for (const clip of state.textElements) {
    if (typeof clip.trackId === "string") usedTrackIds.add(clip.trackId);
  }

  state.tracks = normalizeTracks(state.tracks).filter(
    (track, idx) => idx < 2 || usedTrackIds.has(track.id),
  );
};

const projectStateSlice = createSlice({
  name: "projectState",
  initialState,
  reducers: {
    applyTimelineEdit: (
      state,
      action: PayloadAction<{
        mediaFiles?: MediaFile[];
        textElements?: TextElement[];
        tracks?: TimelineTrack[];
        filesID?: string[];
      }>,
    ) => {
      pushHistory(state);
      if (Array.isArray(action.payload.mediaFiles)) {
        state.mediaFiles = action.payload.mediaFiles;
      }
      if (Array.isArray(action.payload.textElements)) {
        state.textElements = action.payload.textElements;
      }
      if (Array.isArray(action.payload.tracks)) {
        state.tracks = normalizeTracks(action.payload.tracks);
      }
      if (Array.isArray(action.payload.filesID)) {
        state.filesID = action.payload.filesID;
      }
      state.duration = calculateTotalDuration(state.mediaFiles, state.textElements);
      pruneEmptyTracks(state);
    },
    setMediaFiles: (state, action: PayloadAction<MediaFile[]>) => {
      pushHistory(state);
      state.mediaFiles = action.payload;
      // Calculate duration based on the last video's end time
      state.duration = calculateTotalDuration(
        state.mediaFiles,
        state.textElements,
      );
      pruneEmptyTracks(state);
    },
    hydrateMediaFiles: (state, action: PayloadAction<MediaFile[]>) => {
      state.mediaFiles = action.payload;
    },
    setTracks: (state, action: PayloadAction<TimelineTrack[]>) => {
      pushHistory(state);
      state.tracks = normalizeTracks(action.payload);
    },
    addMarker: (
      state,
      action: PayloadAction<{ time: number; label?: string; color?: string }>,
    ) => {
      pushHistory(state);
      const time =
        typeof action.payload.time === "number" &&
        Number.isFinite(action.payload.time)
          ? Math.max(0, action.payload.time)
          : 0;
      state.markers = normalizeMarkers([
        ...(state.markers ?? []),
        {
          id: crypto.randomUUID(),
          time,
          label: action.payload.label,
          color: action.payload.color,
        },
      ]);
    },
    updateMarker: (
      state,
      action: PayloadAction<{
        id: string;
        time?: number;
        label?: string;
        color?: string;
      }>,
    ) => {
      pushHistory(state);
      state.markers = normalizeMarkers(
        (state.markers ?? []).map((marker) => {
          if (marker.id !== action.payload.id) return marker;
          return {
            ...marker,
            ...(typeof action.payload.time === "number" &&
            Number.isFinite(action.payload.time)
              ? { time: Math.max(0, action.payload.time) }
              : {}),
            ...(typeof action.payload.label === "string"
              ? { label: action.payload.label }
              : {}),
            ...(typeof action.payload.color === "string"
              ? { color: action.payload.color }
              : {}),
          };
        }),
      );
    },
    deleteMarker: (state, action: PayloadAction<string>) => {
      pushHistory(state);
      state.markers = normalizeMarkers(
        (state.markers ?? []).filter((marker) => marker.id !== action.payload),
      );
    },
    addLayer: (
      state,
      action: PayloadAction<{ insertAt?: number; id?: string } | undefined>,
    ) => {
      pushHistory(state);
      state.tracks = normalizeTracks(state.tracks);

      const rawInsertAt = action.payload?.insertAt;
      const insertAt =
        typeof rawInsertAt === "number" && Number.isFinite(rawInsertAt)
          ? Math.max(0, Math.min(state.tracks.length, Math.floor(rawInsertAt)))
          : state.tracks.length;

      const id =
        typeof action.payload?.id === "string" ? action.payload.id : undefined;
      state.tracks.splice(insertAt, 0, {
        ...createTrack(state.tracks.length + 1),
        ...(id ? { id } : {}),
      });
      state.tracks = normalizeTracks(state.tracks);
    },
    setProjectName: (state, action: PayloadAction<string>) => {
      pushHistory(state);
      state.projectName = action.payload;
    },
    setProjectId: (state, action: PayloadAction<string>) => {
      pushHistory(state);
      state.id = action.payload;
    },
    setProjectCreatedAt: (state, action: PayloadAction<string>) => {
      pushHistory(state);
      state.createdAt = action.payload;
    },
    setProjectLastModified: (state, action: PayloadAction<string>) => {
      pushHistory(state);
      state.lastModified = action.payload;
    },

    setTextElements: (state, action: PayloadAction<TextElement[]>) => {
      pushHistory(state);
      state.textElements = action.payload;
      state.duration = calculateTotalDuration(
        state.mediaFiles,
        state.textElements,
      );
      pruneEmptyTracks(state);
    },
    setCurrentTime: (state, action: PayloadAction<number>) => {
      state.currentTime = action.payload;
    },
    setIsPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },
    setIsMuted: (state, action: PayloadAction<boolean>) => {
      state.isMuted = action.payload;
    },
    setActiveSection: (state, action: PayloadAction<ActiveElement | null>) => {
      state.activeSection = action.payload;
    },
    setActiveElement: (state, action: PayloadAction<ActiveElement | null>) => {
      state.activeElement = action.payload;
    },
    setActiveElementIndex: (state, action: PayloadAction<number>) => {
      state.activeElementIndex = action.payload;
    },
    setFilesID: (state, action: PayloadAction<string[]>) => {
      pushHistory(state);
      state.filesID = action.payload;
    },
    setExportSettings: (state, action: PayloadAction<ExportConfig>) => {
      pushHistory(state);
      state.exportSettings = action.payload;
    },
    setResolution: (state, action: PayloadAction<string>) => {
      pushHistory(state);
      state.exportSettings.resolution = action.payload;
    },
    setQuality: (state, action: PayloadAction<string>) => {
      pushHistory(state);
      state.exportSettings.quality = action.payload;
    },
    setSpeed: (state, action: PayloadAction<string>) => {
      pushHistory(state);
      state.exportSettings.speed = action.payload;
    },
    setFps: (state, action: PayloadAction<number>) => {
      pushHistory(state);
      state.exportSettings.fps = action.payload;
    },
    setRenderEngine: (state, action: PayloadAction<RenderEngine>) => {
      pushHistory(state);
      state.exportSettings.renderEngine = action.payload;
    },
    addExport: (state, action: PayloadAction<ProjectExport>) => {
      pushHistory(state);
      state.exports = [action.payload, ...state.exports];
    },
    deleteExport: (state, action: PayloadAction<string>) => {
      pushHistory(state);
      state.exports = state.exports.filter((exp) => exp.id !== action.payload);
    },
    attachPublishToExport: (
      state,
      action: PayloadAction<{ exportId: string; publish: ProjectPublishRecord }>,
    ) => {
      pushHistory(state);
      const exp = state.exports.find((e) => e.id === action.payload.exportId);
      if (!exp) return;
      exp.publish = action.payload.publish;
    },
    setTimelineZoom: (state, action: PayloadAction<number>) => {
      state.timelineZoom = action.payload;
    },
    setMarkerTrack: (state, action: PayloadAction<boolean>) => {
      state.enableMarkerTracking = action.payload;
    },
    beginHistoryTransaction: (state) => {
      if (state.historyLockDepth === 0) {
        pushHistory(state);
      }
      state.historyLockDepth += 1;
    },
    endHistoryTransaction: (state) => {
      state.historyLockDepth = Math.max(0, state.historyLockDepth - 1);
      if (state.historyLockDepth === 0) {
        state.lastModified = new Date().toISOString();
      }
    },
    addSoraJob: (state, action: PayloadAction<SoraJob>) => {
      const job = action.payload;
      state.soraJobs = [job, ...(state.soraJobs ?? [])].slice(0, 50);
    },
    updateSoraJob: (
      state,
      action: PayloadAction<{
        id: string;
        status?: SoraJobStatus;
        jobId?: string;
        message?: string | null;
        error?: string | null;
        contentUrl?: string | null;
        fileId?: string;
        mediaId?: string;
        updatedAt?: string;
      }>,
    ) => {
      state.soraJobs = (state.soraJobs ?? []).map((job) => {
        if (job.id !== action.payload.id) return job;
        return {
          ...job,
          ...(typeof action.payload.status === "string"
            ? { status: action.payload.status }
            : {}),
          ...(typeof action.payload.jobId === "string"
            ? { jobId: action.payload.jobId }
            : {}),
          ...(action.payload.message !== undefined
            ? { message: action.payload.message ?? undefined }
            : {}),
          ...(action.payload.error !== undefined
            ? { error: action.payload.error ?? undefined }
            : {}),
          ...(action.payload.contentUrl !== undefined
            ? { contentUrl: action.payload.contentUrl }
            : {}),
          ...(typeof action.payload.fileId === "string"
            ? { fileId: action.payload.fileId }
            : {}),
          ...(typeof action.payload.mediaId === "string"
            ? { mediaId: action.payload.mediaId }
            : {}),
          updatedAt:
            typeof action.payload.updatedAt === "string"
              ? action.payload.updatedAt
              : new Date().toISOString(),
        };
      });
    },
    deleteSoraJob: (state, action: PayloadAction<string>) => {
      state.soraJobs = (state.soraJobs ?? []).filter((job) => job.id !== action.payload);
    },
    clearSoraJobs: (state) => {
      state.soraJobs = [];
    },
    // Special reducer for rehydrating state from IndexedDB
    rehydrate: (state, action: PayloadAction<ProjectState>) => {
      const next = { ...state, ...action.payload };
      next.exportSettings = {
        ...state.exportSettings,
        ...action.payload.exportSettings,
      };

      const rawActiveSection = (action.payload as any).activeSection as unknown;
      next.activeSection =
        rawActiveSection === null ||
        rawActiveSection === "media" ||
        rawActiveSection === "text" ||
        rawActiveSection === "export"
          ? (rawActiveSection as any)
          : "media";
      next.isPlaying = false;
      next.currentTime =
        typeof next.currentTime === "number" && Number.isFinite(next.currentTime)
          ? Math.max(0, next.currentTime)
          : 0;
      next.historyLockDepth = 0;
      next.soraJobs = Array.isArray((action.payload as any).soraJobs)
        ? ((action.payload as any).soraJobs as unknown[])
            .filter((job) => job && typeof job === "object")
            .map((job) => {
              const size: SoraSize =
                (job as any).size === "720x1280" ||
                (job as any).size === "1280x720" ||
                (job as any).size === "1024x1792" ||
                (job as any).size === "1792x1024"
                  ? (job as any).size
                  : SORA_DEFAULTS.size;

              const seconds: SoraSeconds =
                (job as any).seconds === 4 ||
                (job as any).seconds === 8 ||
                (job as any).seconds === 12
                  ? (job as any).seconds
                  : SORA_DEFAULTS.seconds;

              const rawModel = (job as any).model as unknown;
              const model: SoraModel =
                rawModel === "sora-2" || rawModel === "sora-2-pro"
                  ? rawModel
                  : isSoraSizeAllowed(SORA_DEFAULTS.model, size)
                    ? SORA_DEFAULTS.model
                    : "sora-2-pro";

              return {
                id: typeof (job as any).id === "string" ? (job as any).id : crypto.randomUUID(),
                jobId: typeof (job as any).jobId === "string" ? (job as any).jobId : undefined,
                model,
                prompt: typeof (job as any).prompt === "string" ? (job as any).prompt : "",
                seconds,
                size,
                status:
                  (job as any).status === "queued" ||
                  (job as any).status === "creating" ||
                  (job as any).status === "polling" ||
                  (job as any).status === "downloading" ||
                  (job as any).status === "completed" ||
                  (job as any).status === "failed"
                    ? (job as any).status
                    : "failed",
                createdAt:
                  typeof (job as any).createdAt === "string"
                    ? (job as any).createdAt
                    : new Date().toISOString(),
                updatedAt:
                  typeof (job as any).updatedAt === "string"
                    ? (job as any).updatedAt
                    : new Date().toISOString(),
                message: typeof (job as any).message === "string" ? (job as any).message : undefined,
                error: typeof (job as any).error === "string" ? (job as any).error : undefined,
                contentUrl:
                  typeof (job as any).contentUrl === "string" ? (job as any).contentUrl : null,
                fileId: typeof (job as any).fileId === "string" ? (job as any).fileId : undefined,
                mediaId: typeof (job as any).mediaId === "string" ? (job as any).mediaId : undefined,
              };
            })
            .slice(0, 50)
        : [];

      next.tracks = normalizeTracks((action.payload as any).tracks);
      next.markers = normalizeMarkers((action.payload as any).markers);

      const trackIds = new Set(next.tracks.map((t) => t.id));
      const baseTrackId = next.tracks[0]?.id ?? null;
      const overlayTrackId = next.tracks[1]?.id ?? baseTrackId;

      const ensureAudioTrackId = () => {
        const existing = next.mediaFiles.find(
          (clip) =>
            clip.type === "audio" &&
            typeof clip.trackId === "string" &&
            trackIds.has(clip.trackId),
        )?.trackId;
        if (existing) return existing;

        const third = next.tracks[2]?.id;
        if (third) return third;

        const newTrack = createTrack(next.tracks.length + 1);
        next.tracks = normalizeTracks([...next.tracks, newTrack]);
        trackIds.add(newTrack.id);
        return newTrack.id;
      };

      next.mediaFiles = next.mediaFiles.map((clip) => {
        const sourceDurationSeconds =
          clip.type === "video" || clip.type === "audio"
            ? (() => {
                const existing =
                  typeof clip.sourceDurationSeconds === "number" &&
                  Number.isFinite(clip.sourceDurationSeconds) &&
                  clip.sourceDurationSeconds > 0
                    ? clip.sourceDurationSeconds
                    : 0;
                const endTime =
                  typeof clip.endTime === "number" && Number.isFinite(clip.endTime)
                    ? Math.max(0, clip.endTime)
                    : 0;
                const candidate = existing > 0 ? existing : endTime;
                return Math.max(candidate, endTime);
              })()
            : clip.sourceDurationSeconds;

        const clipWithSourceDuration =
          sourceDurationSeconds !== clip.sourceDurationSeconds
            ? { ...clip, sourceDurationSeconds }
            : clip;

        const hasValidTrack =
          typeof clipWithSourceDuration.trackId === "string" &&
          trackIds.has(clipWithSourceDuration.trackId);
        if (hasValidTrack) return clipWithSourceDuration;

        if (clipWithSourceDuration.type === "audio") {
          const trackId = ensureAudioTrackId();
          return { ...clipWithSourceDuration, trackId };
        }

        if (clipWithSourceDuration.type === "image") {
          return overlayTrackId
            ? { ...clipWithSourceDuration, trackId: overlayTrackId }
            : clipWithSourceDuration;
        }

        return baseTrackId
          ? { ...clipWithSourceDuration, trackId: baseTrackId }
          : clipWithSourceDuration;
      });

      next.textElements = next.textElements.map((clip) => {
        const hasValidTrack =
          typeof clip.trackId === "string" && trackIds.has(clip.trackId);
        if (hasValidTrack) return clip;
        return overlayTrackId ? { ...clip, trackId: overlayTrackId } : clip;
      });

      pruneEmptyTracks(next as ProjectState);

      next.exports = next.exports.map((exp) => {
        const publish = exp.publish as any;
        if (!publish || typeof publish !== "object") return exp;
        if (typeof publish.videoUrl === "string") return exp;

        const legacyVideo = publish.video as any;
        if (
          !legacyVideo ||
          typeof legacyVideo !== "object" ||
          (typeof legacyVideo.ipfsUri !== "string" &&
            typeof legacyVideo.gatewayUrl !== "string")
        ) {
          return exp;
        }

        const legacyThumb = publish.thumbnail as any;
        const migrated: ProjectPublishRecord = {
          ipId: String(publish.ipId ?? ""),
          licenseTermsId:
            typeof publish.licenseTermsId === "string"
              ? publish.licenseTermsId
              : undefined,
          txHash: typeof publish.txHash === "string" ? publish.txHash : undefined,
          title: String(publish.title ?? ""),
          summary: String(publish.summary ?? ""),
          terms: String(publish.terms ?? ""),
          videoUrl:
            typeof legacyVideo.ipfsUri === "string"
              ? legacyVideo.ipfsUri
              : legacyVideo.gatewayUrl,
          thumbnailUrl:
            legacyThumb && typeof legacyThumb === "object"
              ? typeof legacyThumb.ipfsUri === "string"
                ? legacyThumb.ipfsUri
                : typeof legacyThumb.gatewayUrl === "string"
                  ? legacyThumb.gatewayUrl
                  : undefined
              : undefined,
          ipMetadataUri: String(publish.ipMetadataUri ?? ""),
          nftMetadataUri: String(publish.nftMetadataUri ?? ""),
          createdAt: String(publish.createdAt ?? new Date().toISOString()),
        };

        return { ...exp, publish: migrated };
      });
      return next;
    },
    createNewProject: (state) => {
      return createProjectState();
    },
    undoState: (state) => {
      const last = state.history[state.history.length - 1];
      if (!last) return;
      const currentSnap = snapshotState(state);
      state.future = [currentSnap, ...state.future].slice(0, MAX_HISTORY);
      state.history = state.history.slice(0, -1);
      Object.assign(state, {
        ...last,
        history: state.history,
        future: state.future,
        historyLockDepth: 0,
      });
    },
    redoState: (state) => {
      const next = state.future[0];
      if (!next) return;
      const currentSnap = snapshotState(state);
      state.history = [...state.history, currentSnap].slice(-MAX_HISTORY);
      state.future = state.future.slice(1);
      Object.assign(state, {
        ...next,
        history: state.history,
        future: state.future,
        historyLockDepth: 0,
      });
    },
  },
});

export const {
  applyTimelineEdit,
  setMediaFiles,
  hydrateMediaFiles,
  setTextElements,
  setTracks,
  addLayer,
  addMarker,
  updateMarker,
  deleteMarker,
  setCurrentTime,
  setProjectName,
  setIsPlaying,
  setFilesID,
  setExportSettings,
  setResolution,
  setQuality,
  setSpeed,
  setFps,
  setRenderEngine,
  addExport,
  deleteExport,
  attachPublishToExport,
  setMarkerTrack,
  setIsMuted,
  setActiveSection,
  setActiveElement,
  setActiveElementIndex,
  setTimelineZoom,
  beginHistoryTransaction,
  endHistoryTransaction,
  addSoraJob,
  updateSoraJob,
  deleteSoraJob,
  clearSoraJobs,
  rehydrate,
  createNewProject,
  undoState,
  redoState,
} = projectStateSlice.actions;

export default projectStateSlice.reducer;
