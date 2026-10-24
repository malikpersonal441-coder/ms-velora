/**
 * Lazy MediaPipe Tasks Vision wrapper (Apache-2.0).
 * The library, its WASM runtime and the models load only when the try-on studio needs them,
 * so the rest of the store never pays for them.
 */
import type { FaceLandmarker, HandLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';

const VERSION = '0.10.21';
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const HAND_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export type TrackerType = 'face' | 'hand';
export type RunMode = 'VIDEO' | 'IMAGE';
type Landmarker = FaceLandmarker | HandLandmarker;

const cache = new Map<string, Promise<Landmarker>>();
let visionPromise: Promise<typeof import('@mediapipe/tasks-vision')> | null = null;

const loadVision = () => (visionPromise ??= import('@mediapipe/tasks-vision'));

async function create(type: TrackerType, mode: RunMode, delegate: 'GPU' | 'CPU'): Promise<Landmarker> {
  const vision = await loadVision();
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
  if (type === 'face') {
    return vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: FACE_MODEL, delegate },
      runningMode: mode,
      numFaces: 1,
    });
  }
  return vision.HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: HAND_MODEL, delegate },
    runningMode: mode,
    numHands: 1,
  });
}

/** Returns a cached landmarker, falling back to CPU when the GPU delegate is unavailable. */
export function getLandmarker(type: TrackerType, mode: RunMode): Promise<Landmarker> {
  const key = `${type}:${mode}`;
  if (!cache.has(key)) {
    const p = create(type, mode, 'GPU').catch(() => create(type, mode, 'CPU'));
    p.catch(() => cache.delete(key)); // allow a retry after a network failure
    cache.set(key, p);
  }
  return cache.get(key)!;
}

/** Runs detection and returns the landmarks of the first face/hand, or null when none is found. */
export function detect(
  landmarker: Landmarker,
  type: TrackerType,
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  mode: RunMode,
  timestamp: number
): NormalizedLandmark[] | null {
  if (type === 'face') {
    const f = landmarker as FaceLandmarker;
    const r = mode === 'VIDEO' ? f.detectForVideo(source, timestamp) : f.detect(source);
    return r.faceLandmarks?.[0] ?? null;
  }
  const h = landmarker as HandLandmarker;
  const r = mode === 'VIDEO' ? h.detectForVideo(source, timestamp) : h.detect(source);
  return r.landmarks?.[0] ?? null;
}

export const cameraSupported = () =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function';

export const webglSupported = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};
