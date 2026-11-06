import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FACE_NORMALS, FACE_VALUES_BY_AXIS, DIE_CHARACTERS, assertRenderedOutcome, rotate, seededDice, targetOrientation, topFaceFromQuaternion } from './diceOrientation';
import type { Die } from './chinchiro';

const near = (v: number[]) => v.map(n => Math.abs(n) < 1e-12 ? 0 : n);

function topMaterialSlot(orientation: ReturnType<typeof targetOrientation>) {
  const normals: [number, number, number][] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const slot = normals.reduce((best, current, index) => rotate(current, orientation)[1] > rotate(normals[best], orientation)[1] ? index : best, 0);
  return slot;
}


describe('整列アニメーション', () => {
  it('物理で停止した姿勢を変えず、位置のみを補間する', () => {
    // The alignment path contains no quaternion, angular velocity, or slerp mutation.
    // Centering keeps this settled orientation unchanged until the predetermined final top is built.
    const settled = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, -0.4, 0.2));
    const position = new THREE.Vector3(0.3, 0.64, -0.2);
    const before = settled.clone();
    const mix = 0.1;
    position.x += (-0.63 - position.x) * mix * 0.55;
    position.z += (0.17 - position.z) * mix * 0.55;
    expect(settled.equals(before)).toBe(true);
    expect(position.x).toBeCloseTo(0.24885);
    expect(position.z).toBeCloseTo(-0.17965);
  });
});

describe('骰子の最終上面と判定', () => {
  it('6つの材面・法線・数が同じ順序', () => {
    expect(FACE_VALUES_BY_AXIS).toEqual([3, 4, 1, 6, 2, 5]);
    const expectedSlots = [[3, FACE_NORMALS[3]], [4, FACE_NORMALS[4]], [1, FACE_NORMALS[1]], [6, FACE_NORMALS[6]], [2, FACE_NORMALS[2]], [5, FACE_NORMALS[5]]];
    for (const [value, normal] of expectedSlots) expect(FACE_NORMALS[value as Die]).toEqual(normal);
  });

  it.each([1, 2, 3, 4, 5, 6] as const)('目%iの最終上面と材スロットが同じ', value => {
    const q = targetOrientation(value);
    near(rotate(FACE_NORMALS[value], q)).forEach((n, i) => expect(n).toBeCloseTo([0, 1, 0][i]));
    expect(topFaceFromQuaternion(q)).toBe(value);
    expect(FACE_VALUES_BY_AXIS[topMaterialSlot(q)]).toBe(value);
  });

  it('1,200通りのseedで左右とも描画上面 === 判定値', () => {
    for (let seed = 0; seed < 1200; seed++) {
      const dice = seededDice(seed);
      const orientations = [targetOrientation(dice[0]), targetOrientation(dice[1])] as const;
      expect(assertRenderedOutcome(dice, [orientations[0], orientations[1]])).toEqual(dice);
      expect(topMaterialSlot(orientations[0])).toBe(FACE_VALUES_BY_AXIS.indexOf(dice[0]));
      expect(topMaterialSlot(orientations[1])).toBe(FACE_VALUES_BY_AXIS.indexOf(dice[1]));
    }
  });

  it('左右の1面だけが山と田で、1のピップではない', () => {
    expect(DIE_CHARACTERS).toEqual(['山', '田']);
    expect(FACE_NORMALS[1]).toEqual([0, 1, 0]);
  });

  it('一致しない姿勢で結果を出せない', () => {
    const wrong = targetOrientation(1);
    expect(() => assertRenderedOutcome([6, 4], [wrong, wrong])).toThrow('do not match');
  });

  it('不正な出目を例外にする', () => {
    expect(() => targetOrientation(0 as Die)).toThrow(RangeError);
    expect(() => targetOrientation(undefined as unknown as Die)).toThrow(RangeError);
  });
});
