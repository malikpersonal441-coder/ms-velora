import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Upload, RotateCcw, ZoomIn, ZoomOut, Download, Loader2, ShieldCheck, Move, AlertTriangle } from 'lucide-react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { kindInfo, type TryOnKind } from '../../lib/tryon/kinds';
import { cameraSupported, detect, getLandmarker, webglSupported, type RunMode } from '../../lib/tryon/tracker';
import { computePlacements, smooth, type Placement } from '../../lib/tryon/placement';
import type { PreparedJewel } from '../../lib/tryon/cutout';

type Source = 'none' | 'camera' | 'photo';
type Status =
  | { kind: 'idle' }
  | { kind: 'loading'; text: string }
  | { kind: 'tracking' }
  | { kind: 'searching' }
  | { kind: 'error'; text: string };

interface Props {
  tryOnKind: TryOnKind | null;
  jewel: PreparedJewel | null;
  jewelLoading: boolean;
}

/** Camera / photo stage that tracks the face or hand and draws the selected jewellery on it. */
export const TryOnStudio: React.FC<Props> = ({ tryOnKind, jewel, jewelLoading }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastPlacement = useRef<Placement[] | null>(null);
  const photoLandmarks = useRef<NormalizedLandmark[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [source, setSource] = useState<Source>('none');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // fraction of canvas size
  const [compare, setCompare] = useState(1); // 1 = jewellery everywhere, 0 = original everywhere
  const [photoTick, setPhotoTick] = useState(0); // bumps when new photo landmarks arrive
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Live values for the render loop without restarting it on every change
  const live = useRef({ tryOnKind, jewel, scale, offset, compare });
  live.current = { tryOnKind, jewel, scale, offset, compare };

  const info = tryOnKind ? kindInfo(tryOnKind) : null;

  const stopLoop = () => cancelAnimationFrame(rafRef.current);

  const stopCamera = useCallback(() => {
    stopLoop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  /** Draws the frame, then the jewellery at each placement (clipped for the before/after slider). */
  const draw = useCallback((frame: CanvasImageSource, fw: number, fh: number, mirror: boolean, placements: Placement[] | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width !== fw || canvas.height !== fh) {
      canvas.width = fw;
      canvas.height = fh;
    }
    const ctx = canvas.getContext('2d')!;
    ctx.save();
    if (mirror) {
      ctx.translate(fw, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(frame, 0, 0, fw, fh);
    ctx.restore();

    const { jewel: j, scale: s, offset: o, compare: cmp } = live.current;
    if (!j || !placements?.length || cmp <= 0) return;
    ctx.save();
    if (cmp < 1) {
      ctx.beginPath();
      ctx.rect(fw * (1 - cmp), 0, fw * cmp, fh);
      ctx.clip();
    }
    for (const p of placements) {
      const w = p.width * s;
      const h = w * (j.canvas.height / j.canvas.width);
      ctx.save();
      ctx.translate(p.x + o.x * fw, p.y + o.y * fh);
      ctx.rotate(p.angle);
      ctx.shadowColor = 'rgba(0,0,0,0.28)';
      ctx.shadowBlur = Math.max(2, w * 0.04);
      ctx.shadowOffsetY = Math.max(1, w * 0.02);
      ctx.drawImage(j.canvas, -w / 2, -h * p.anchor, w, h);
      ctx.restore();
    }
    ctx.restore();
    if (cmp < 1) {
      ctx.fillStyle = '#C5A059';
      ctx.fillRect(fw * (1 - cmp) - 1.5, 0, 3, fh);
    }
  }, []);

  /** Camera loop: detect on each new video frame, smooth, draw. */
  const runCameraLoop = useCallback(async () => {
    const kind = live.current.tryOnKind;
    const video = videoRef.current;
    if (!kind || !video) return;
    const type = kindInfo(kind).tracker;
    setStatus({ kind: 'loading', text: 'Loading the try-on engine…' });
    let landmarker;
    try {
      landmarker = await getLandmarker(type, 'VIDEO');
    } catch {
      setStatus({ kind: 'error', text: 'The try-on engine could not load. Check your connection and try again.' });
      return;
    }
    setStatus({ kind: 'searching' });
    let lastTime = -1;
    let found = false;
    const tick = () => {
      const v = videoRef.current;
      if (!v || !streamRef.current) return;
      const k = live.current.tryOnKind;
      if (v.readyState >= 2 && k === kind) {
        if (v.currentTime !== lastTime) {
          lastTime = v.currentTime;
          const lm = detect(landmarker, type, v, 'VIDEO', performance.now());
          if (lm) {
            lastPlacement.current = smooth(lastPlacement.current, computePlacements(kind, lm, v.videoWidth, v.videoHeight, true));
            if (!found) setStatus({ kind: 'tracking' });
            found = true;
          } else {
            lastPlacement.current = null;
            if (found) setStatus({ kind: 'searching' });
            found = false;
          }
        }
        draw(v, v.videoWidth, v.videoHeight, true, lastPlacement.current);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    stopLoop();
    rafRef.current = requestAnimationFrame(tick);
  }, [draw]);

  /** Photo: detect once, then redraw whenever the controls change. */
  const runPhoto = useCallback(async () => {
    const kind = live.current.tryOnKind;
    const img = photoRef.current;
    if (!img) return;
    draw(img, img.naturalWidth, img.naturalHeight, false, null);
    if (!kind) return;
    const type = kindInfo(kind).tracker;
    setStatus({ kind: 'loading', text: 'Finding where to place the jewellery…' });
    try {
      const landmarker = await getLandmarker(type, 'IMAGE' as RunMode);
      photoLandmarks.current = detect(landmarker, type, img, 'IMAGE', 0);
    } catch {
      setStatus({ kind: 'error', text: 'The try-on engine could not load. Check your connection and try again.' });
      return;
    }
    if (!photoLandmarks.current) {
      setStatus({ kind: 'error', text: type === 'face' ? 'No face found in this photo. Try a clear, front-facing photo.' : 'No hand found in this photo. Try a photo of one open hand.' });
      return;
    }
    setStatus({ kind: 'tracking' });
    setPhotoTick((n) => n + 1);
  }, [draw]);

  // Redraw the photo when controls or the selected piece change
  useEffect(() => {
    if (source !== 'photo' || !photoRef.current) return;
    const img = photoRef.current;
    const lm = photoLandmarks.current;
    const placements = lm && tryOnKind ? computePlacements(tryOnKind, lm, img.naturalWidth, img.naturalHeight, false) : null;
    draw(img, img.naturalWidth, img.naturalHeight, false, placements);
  }, [source, tryOnKind, jewel, scale, offset, compare, photoTick, draw]);

  // Switching between face and hand jewellery needs a different tracker
  const trackerType = info?.tracker;
  useEffect(() => {
    lastPlacement.current = null;
    if (source === 'camera') runCameraLoop();
    if (source === 'photo') runPhoto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackerType, tryOnKind]);

  const startCamera = async () => {
    if (!cameraSupported()) {
      setStatus({ kind: 'error', text: 'This browser cannot open the camera. Try Chrome, Safari or Edge, or upload a photo instead.' });
      return;
    }
    setStatus({ kind: 'loading', text: 'Waiting for camera permission…' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      stopCamera();
      streamRef.current = stream;
      const video = videoRef.current ?? document.createElement('video');
      videoRef.current = video;
      video.playsInline = true;
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      photoRef.current = null;
      photoLandmarks.current = null;
      setSource('camera');
      runCameraLoop();
    } catch (err: any) {
      const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
      const missing = err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError';
      setStatus({
        kind: 'error',
        text: denied
          ? 'Camera permission was denied. Allow camera access in your browser settings, or upload a photo instead.'
          : missing
          ? 'No camera was found on this device. You can upload a photo instead.'
          : 'The camera could not start. Close other apps using it and try again.',
      });
    }
  };

  const handleStop = () => {
    stopCamera();
    setSource('none');
    setStatus({ kind: 'idle' });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatus({ kind: 'error', text: 'Please choose an image file (JPG, PNG or WebP).' });
      return;
    }
    // The photo stays in this browser tab: it is read locally and never uploaded
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      stopCamera();
      // Keep very large phone photos manageable
      const max = 1600;
      if (Math.max(img.naturalWidth, img.naturalHeight) > max) {
        const s = max / Math.max(img.naturalWidth, img.naturalHeight);
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * s);
        c.height = Math.round(img.naturalHeight * s);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        const small = new Image();
        small.onload = () => {
          photoRef.current = small;
          setSource('photo');
          runPhoto();
        };
        small.src = c.toDataURL('image/jpeg', 0.92);
      } else {
        photoRef.current = img;
        setSource('photo');
        runPhoto();
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => setStatus({ kind: 'error', text: 'That image could not be opened.' });
    img.src = url;
  };

  const reset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setCompare(1);
  };

  const download = () => {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement('a');
    a.download = 'ms-velora-try-on.jpg';
    a.href = c.toDataURL('image/jpeg', 0.92);
    a.click();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (source === 'none') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    setOffset({
      x: Math.max(-0.3, Math.min(0.3, drag.current.ox + (e.clientX - drag.current.x) / r.width)),
      y: Math.max(-0.3, Math.min(0.3, drag.current.oy + (e.clientY - drag.current.y) / r.height)),
    });
  };
  const onPointerUp = () => (drag.current = null);

  const ctrl =
    'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-[0.12em] transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  const hasStage = source !== 'none';
  const noGpu = typeof document !== 'undefined' && !webglSupported();

  return (
    <div className="space-y-4">
      {/* Stage */}
      <div className="relative rounded-3xl overflow-hidden bg-[#1A1A1E] aspect-[4/3] sm:aspect-video shadow-xl ring-1 ring-black/5">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-contain ${hasStage ? 'cursor-grab active:cursor-grabbing touch-none' : 'hidden'}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-label="Try-on preview"
          role="img"
        />

        {!hasStage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-[radial-gradient(ellipse_at_50%_30%,rgba(197,160,89,0.25),transparent_65%)]">
            <span className="w-16 h-16 rounded-full bg-white/10 text-[#DFBD78] flex items-center justify-center mb-4">
              <Camera className="w-7 h-7" />
            </span>
            <p className="font-serif-luxury text-2xl sm:text-3xl text-white">Your mirror, reimagined</p>
            <p className="mt-2 text-sm text-white/60 max-w-sm">
              {tryOnKind ? 'Start your camera or upload a photo to see this piece on you.' : 'Choose a piece from the collection to begin.'}
            </p>
          </div>
        )}

        {/* Status pill */}
        {hasStage && status.kind !== 'idle' && (
          <div className="absolute top-3 left-3 right-3 flex justify-center pointer-events-none">
            <span
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold backdrop-blur-md ${
                status.kind === 'tracking'
                  ? 'bg-emerald-500/85 text-white'
                  : status.kind === 'error'
                  ? 'bg-red-600/90 text-white'
                  : 'bg-black/55 text-white'
              }`}
              role="status"
              aria-live="polite"
            >
              {status.kind === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {status.kind === 'error' && <AlertTriangle className="w-3.5 h-3.5" />}
              {status.kind === 'loading'
                ? status.text
                : status.kind === 'error'
                ? status.text
                : status.kind === 'tracking'
                ? info?.tracker === 'face' ? 'Face found — drag to fine-tune' : 'Hand found — drag to fine-tune'
                : info?.tracker === 'face' ? 'Looking for your face…' : 'Looking for your hand…'}
            </span>
          </div>
        )}
        {jewelLoading && hasStage && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/55 text-white text-[11px] backdrop-blur-md">
            <Loader2 className="w-3 h-3 animate-spin" /> Preparing jewellery…
          </span>
        )}
        {hasStage && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/45 text-white/80 text-[11px] backdrop-blur-md pointer-events-none">
            <Move className="w-3 h-3" /> Drag to reposition
          </span>
        )}
      </div>

      {/* Error outside the stage (e.g. permission denied before anything was shown) */}
      {!hasStage && status.kind === 'error' && (
        <p className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-800" role="alert">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {status.text}
        </p>
      )}
      {!hasStage && status.kind === 'loading' && (
        <p className="flex items-center gap-2 text-sm text-neutral-600" role="status">
          <Loader2 className="w-4 h-4 animate-spin text-[#9E7B36]" />
          {status.text}
        </p>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {source === 'camera' ? (
          <button type="button" onClick={handleStop} className={`${ctrl} bg-white border border-neutral-200 text-[#0D0D0D] hover:border-[#C5A059]`}>
            <CameraOff className="w-4 h-4" /> Stop Camera
          </button>
        ) : (
          <button type="button" onClick={startCamera} disabled={!tryOnKind} className={`${ctrl} bg-[#0D0D0D] text-white hover:bg-[#C5A059] hover:text-[#0D0D0D]`}>
            <Camera className="w-4 h-4" /> Start Camera
          </button>
        )}
        <button type="button" onClick={() => fileRef.current?.click()} disabled={!tryOnKind} className={`${ctrl} bg-white border border-neutral-200 text-[#0D0D0D] hover:border-[#C5A059]`}>
          <Upload className="w-4 h-4" /> Upload Photo
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <button type="button" onClick={reset} disabled={!hasStage} className={`${ctrl} text-neutral-600 hover:bg-neutral-100`}>
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
        <button type="button" onClick={download} disabled={!hasStage || status.kind !== 'tracking'} className={`${ctrl} text-neutral-600 hover:bg-neutral-100 sm:ml-auto`}>
          <Download className="w-4 h-4" /> Save Look
        </button>
      </div>

      {/* Adjustments */}
      {hasStage && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-white border border-neutral-200/80">
          <label className="block">
            <span className="flex items-center justify-between text-[11px] uppercase tracking-[0.12em] font-semibold text-neutral-500 mb-2">
              Size <span className="font-mono-code normal-case tracking-normal">{Math.round(scale * 100)}%</span>
            </span>
            <span className="flex items-center gap-3">
              <button type="button" onClick={() => setScale((s) => Math.max(0.5, +(s - 0.1).toFixed(2)))} aria-label="Smaller" className="text-neutral-500 hover:text-[#9E7B36]">
                <ZoomOut className="w-4 h-4" />
              </button>
              <input type="range" min={0.5} max={2} step={0.05} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="flex-1 accent-[#9E7B36]" aria-label="Jewellery size" />
              <button type="button" onClick={() => setScale((s) => Math.min(2, +(s + 0.1).toFixed(2)))} aria-label="Larger" className="text-neutral-500 hover:text-[#9E7B36]">
                <ZoomIn className="w-4 h-4" />
              </button>
            </span>
          </label>
          <label className="block">
            <span className="flex items-center justify-between text-[11px] uppercase tracking-[0.12em] font-semibold text-neutral-500 mb-2">
              Before / After <span className="normal-case tracking-normal">{compare === 1 ? 'With jewellery' : compare === 0 ? 'Original' : 'Compare'}</span>
            </span>
            <input type="range" min={0} max={1} step={0.01} value={compare} onChange={(e) => setCompare(Number(e.target.value))} className="w-full accent-[#9E7B36]" aria-label="Before and after comparison" />
          </label>
        </div>
      )}

      {/* Privacy */}
      <p className="flex items-start gap-2.5 text-xs text-neutral-500 leading-relaxed">
        <ShieldCheck className="w-4 h-4 text-[#9E7B36] shrink-0 mt-0.5" />
        <span>
          Camera access is optional. Your camera feed and photos are processed only on this device and are never uploaded or stored by MS Velora.
          {noGpu && ' Your browser has limited graphics support, so tracking may run slowly.'}
        </span>
      </p>
    </div>
  );
};
