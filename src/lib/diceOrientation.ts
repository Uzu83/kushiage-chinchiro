import type { Die } from './chinchiro';

export type QuaternionTuple = readonly [number, number, number, number];
export type Rotation = (vector: [number, number, number]) => [number, number, number];

/** BoxGeometry material slots +X, -X, +Y, -Y, +Z, -Z map directly to die values. */
export const FACE_VALUES_BY_AXIS = [3, 4, 1, 6, 2, 5] as const satisfies readonly Die[];
export const FACE_NORMALS: Readonly<Record<Die, readonly [number, number, number]>> = {
  1: [0, 1, 0], 2: [0, 0, 1], 3: [1, 0, 0],
  4: [-1, 0, 0], 5: [0, 0, -1], 6: [0, -1, 0],
};
export const DIE_CHARACTERS = ['山', '田'] as const;

export function rotate(vector: readonly [number, number, number], [x, y, z, w]: QuaternionTuple): [number, number, number] {
  const [vx, vy, vz] = vector;
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [vx + w * tx + y * tz - z * ty, vy + w * ty + z * tx - x * tz, vz + w * tz + x * ty - y * tx];
}

function rotationFromUnitVectors(from: readonly [number, number, number], to: readonly [number, number, number]): QuaternionTuple {
  let r = from[0] * to[0] + from[1] * to[1] + from[2] * to[2] + 1;
  let x: number, y: number, z: number;
  if (r < 1e-8) {
    r = 0;
    if (Math.abs(from[0]) > Math.abs(from[2])) [x, y, z] = [-from[1], from[0], 0];
    else [x, y, z] = [0, -from[2], from[1]];
  } else [x, y, z] = [from[1] * to[2] - from[2] * to[1], from[2] * to[0] - from[0] * to[2], from[0] * to[1] - from[1] * to[0]];
  const norm = 1 / Math.sqrt(x * x + y * y + z * z + r * r);
  return [x * norm, y * norm, z * norm, r * norm];
}

/** Ensure the face texture for `value` has a normal equal to world +Y. */
export function targetOrientation(value: Die): QuaternionTuple {
  const normal = FACE_NORMALS[value];
  if (!normal) throw new RangeError(`Invalid die value: ${String(value)}`);
  return rotationFromUnitVectors(normal, [0, 1, 0]);
}

/** Inverse of targetOrientation: inspect the one material actually shown on top. */
export function topFaceFromQuaternion(orientation: QuaternionTuple): Die {
  const rotated = FACE_VALUES_BY_AXIS.map(value => ({ value, normal: rotate(FACE_NORMALS[value], orientation) }));
  return rotated.reduce((top, face) => face.normal[1] > top.normal[1] ? face : top).value;
}

function normalizeQuaternion(orientation: QuaternionTuple): QuaternionTuple {
  const length = Math.hypot(orientation[0], orientation[1], orientation[2], orientation[3]);
  if (length < 1e-8) return [0, 0, 0, 1];
  return [orientation[0] / length, orientation[1] / length, orientation[2] / length, orientation[3] / length];
}

function multiplyQuaternion(a: QuaternionTuple, b: QuaternionTuple): QuaternionTuple {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

/**
 * Lay a settled die flat without changing which face is up.
 * The rotation is the shortest arc that takes the current top normal to +Y.
 */
export function orientationKeepingTopFace(orientation: QuaternionTuple): { value: Die; orientation: QuaternionTuple } {
  const value = topFaceFromQuaternion(orientation);
  const normal = rotate(FACE_NORMALS[value], orientation);
  const length = Math.hypot(normal[0], normal[1], normal[2]);
  const up: [number, number, number] = length < 1e-8 ? [0, 1, 0] : [normal[0] / length, normal[1] / length, normal[2] / length];
  const source = normalizeQuaternion(orientation);
  if (up[1] > 1 - 1e-6) return { value, orientation: source };
  const align = rotationFromUnitVectors(up, [0, 1, 0]);
  let next = normalizeQuaternion(multiplyQuaternion(align, source));
  const dot = source[0] * next[0] + source[1] * next[1] + source[2] * next[2] + source[3] * next[3];
  if (dot < 0) next = [-next[0], -next[1], -next[2], -next[3]];
  return { value, orientation: next };
}

export function assertRenderedOutcome(dice: [Die, Die], orientations: [QuaternionTuple, QuaternionTuple]) {
  const actual: [Die, Die] = [topFaceFromQuaternion(orientations[0]), topFaceFromQuaternion(orientations[1])];
  if (actual[0] !== dice[0] || actual[1] !== dice[1]) throw new Error(`Rendered top faces ${actual} do not match judged values ${dice}`);
  return actual;
}

export function seededDice(seed: number): [Die, Die] {
  let value = Math.imul(seed + 1, 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value ^= value >>> 16;
  return [((value >>> 0) % 6 + 1) as Die, ((value >>> 3) % 6 + 1) as Die];
}
