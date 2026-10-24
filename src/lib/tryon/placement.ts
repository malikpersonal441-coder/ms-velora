import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { TryOnKind } from './kinds';

/**
 * Where to draw one piece of jewellery, in canvas pixels.
 * (x, y) is the attachment point; the image hangs from it according to `anchor`.
 */
export interface Placement {
  x: number;
  y: number;
  width: number;
  angle: number; // radians
  /** Fraction of the image height above the attachment point (0 = hangs below, 0.5 = centred). */
  anchor: number;
}

type P = { x: number; y: number };

const px = (l: NormalizedLandmark, w: number, h: number, mirror: boolean): P => ({ x: (mirror ? 1 - l.x : l.x) * w, y: l.y * h });
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (a: P, b: P, t: number): P => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

// FaceLandmarker (478-point mesh) indices
const FACE = {
  rightCheekEdge: 234, // image-left side of the face (subject's right)
  leftCheekEdge: 454,
  // Face contour just below the cheek edge: level with the earlobes
  rightLobe: 93,
  leftLobe: 323,
  rightEyeOuter: 33,
  leftEyeOuter: 263,
  noseTip: 1,
  chin: 152,
  forehead: 10,
};
// HandLandmarker (21-point) indices
const HAND = { wrist: 0, indexMcp: 5, middleMcp: 9, ringMcp: 13, ringPip: 14, pinkyMcp: 17 };

/**
 * Converts landmarks into overlay placements for each jewellery kind.
 * `mirror` must match how the frame is drawn (selfie camera is mirrored, uploaded photos are not).
 */
export function computePlacements(kind: TryOnKind, lm: NormalizedLandmark[], w: number, h: number, mirror: boolean): Placement[] {
  const g = (i: number) => px(lm[i], w, h, mirror);

  if (kind === 'earrings' || kind === 'necklace') {
    const a = g(FACE.rightCheekEdge);
    const b = g(FACE.leftCheekEdge);
    const faceWidth = dist(a, b);
    const eyeA = g(FACE.rightEyeOuter);
    const eyeB = g(FACE.leftEyeOuter);
    // Roll of the head; keep the angle within ±90° whichever side is drawn first
    let roll = Math.atan2(eyeB.y - eyeA.y, eyeB.x - eyeA.x);
    if (roll > Math.PI / 2) roll -= Math.PI;
    if (roll < -Math.PI / 2) roll += Math.PI;

    if (kind === 'necklace') {
      const chin = g(FACE.chin);
      const faceHeight = dist(g(FACE.forehead), chin);
      // Neckline sits roughly 0.35 face-heights below the chin, along the head's vertical axis
      const down = { x: -Math.sin(roll), y: Math.cos(roll) };
      return [
        {
          x: chin.x + down.x * faceHeight * 0.35,
          y: chin.y + down.y * faceHeight * 0.35,
          width: faceWidth * 1.35,
          angle: roll,
          anchor: 0.05,
        },
      ];
    }

    // Earlobes sit on the face outline below the cheek edge, slightly outside it
    const nose = g(FACE.noseTip);
    const centre = lerp(a, b, 0.5);
    // Yaw: how far the nose sits between the two cheek edges (0.5 = facing forward)
    const t = (nose.x - Math.min(a.x, b.x)) / Math.max(1, Math.abs(b.x - a.x));
    const out: Placement[] = [];
    for (const [edge, lobePoint] of [
      [a, g(FACE.rightLobe)],
      [b, g(FACE.leftLobe)],
    ] as const) {
      const side = edge.x < centre.x ? 'left' : 'right';
      // Hide the earring on the ear that has turned away from the camera
      if ((side === 'left' && t < 0.3) || (side === 'right' && t > 0.7)) continue;
      const outward = (side === 'left' ? -1 : 1) * faceWidth * 0.03;
      out.push({
        x: lobePoint.x + outward * Math.cos(roll),
        y: lobePoint.y + outward * Math.sin(roll),
        width: faceWidth * 0.2,
        angle: roll,
        anchor: 0.04,
      });
    }
    return out;
  }

  // Hands
  const wrist = g(HAND.wrist);
  const middle = g(HAND.middleMcp);
  const palmWidth = dist(g(HAND.indexMcp), g(HAND.pinkyMcp));
  if (kind === 'ring') {
    const base = g(HAND.ringMcp);
    const pip = g(HAND.ringPip);
    const at = lerp(base, pip, 0.38);
    // The ring band runs across the finger, so rotate perpendicular to its direction
    const along = Math.atan2(pip.y - base.y, pip.x - base.x);
    return [{ x: at.x, y: at.y, width: Math.max(palmWidth * 0.32, dist(base, pip) * 0.75), angle: along - Math.PI / 2, anchor: 0.5 }];
  }
  // Bracelet: just below the wrist joint, away from the fingers
  const at = lerp(wrist, middle, -0.12);
  const along = Math.atan2(middle.y - wrist.y, middle.x - wrist.x);
  return [{ x: at.x, y: at.y, width: palmWidth * 1.35, angle: along - Math.PI / 2, anchor: 0.5 }];
}

/** Exponential smoothing so the overlay doesn't jitter between frames. */
export function smooth(prev: Placement[] | null, next: Placement[], k = 0.45): Placement[] {
  if (!prev || prev.length !== next.length) return next;
  return next.map((n, i) => {
    const p = prev[i];
    let da = n.angle - p.angle;
    if (da > Math.PI) da -= 2 * Math.PI;
    if (da < -Math.PI) da += 2 * Math.PI;
    return {
      x: p.x + (n.x - p.x) * k,
      y: p.y + (n.y - p.y) * k,
      width: p.width + (n.width - p.width) * k,
      angle: p.angle + da * k,
      anchor: n.anchor,
    };
  });
}
