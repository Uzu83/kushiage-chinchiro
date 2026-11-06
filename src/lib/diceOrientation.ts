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
