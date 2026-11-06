import { describe, expect, it } from 'vitest';
import { classifyDice, paymentFor, addResult, EMPTY_STATS, EXPECTED_PAYMENT_RATE, type OutcomeId } from './chinchiro';

const dice = [1, 2, 3, 4, 5, 6] as const;

describe('チンチロの判定', () => {
  it('山田（1のゾロ目）はメガジョッキ無料', () => {
    expect(classifyDice(1, 1).id).toBe('yamada');
    expect(classifyDice(1, 1).multiplier).toBe(0);
  });

  it('2〜6のゾロ目は通常1杯無料', () => {
    for (const n of [2, 3, 4, 5, 6]) expect(classifyDice(n, n).id).toBe('free');
  });

  it('山・田が片方だけなら1として合計する', () => {
    expect(classifyDice(1, 2).id).toBe('double');
    expect(classifyDice(2, 1).id).toBe('double');
    expect(classifyDice(1, 3).id).toBe('half');
    expect(classifyDice(3, 1).id).toBe('half');
  });

  it.each([
    { a: 2, b: 4, id: 'half' }, { a: 3, b: 5, id: 'half' },
    { a: 2, b: 3, id: 'double' }, { a: 6, b: 5, id: 'double' },
  ] as const)('$a, $b → $id', ({ a, b, id }) => {
    expect(classifyDice(a, b).id).toBe(id);
  });
});

describe('全36通りの確率', () => {
  const enumeration = dice.flatMap(a => dice.map(b => ({ a, b, outcome: classifyDice(a, b) })));

  it('サイコロ2個の順序を区別して36通り', () => {
    expect(enumeration).toHaveLength(36);
    expect(new Set(enumeration.map(x => `${x.a}-${x.b}`)).size).toBe(36);
  });

  it.each([
    ['yamada', 1, 1 / 36],
    ['free', 5, 5 / 36],
    ['half', 12, 12 / 36],
    ['double', 18, 18 / 36],
  ] as const)('%s は %i/36', (id: OutcomeId, count: number, probability: number) => {
    const matches = enumeration.filter(x => x.outcome.id === id);
    expect(matches).toHaveLength(count);
    expect(matches.length / 36).toBe(probability);
  });

  it('支払い額の期待値は定価の7/6（約1.17倍）', () => {
    const total = enumeration.reduce((sum, x) => sum + x.outcome.multiplier, 0);
    expect(total / 36).toBeCloseTo(EXPECTED_PAYMENT_RATE);
    expect(EXPECTED_PAYMENT_RATE).toBeCloseTo(1.1666667);
  });
});

describe('会計と集計', () => {
  it('定価に倍率を掛けて円に丸める', () => {
    expect(paymentFor(500, classifyDice(1, 1))).toBe(0);
    expect(paymentFor(500, classifyDice(2, 2))).toBe(0);
    expect(paymentFor(500, classifyDice(2, 4))).toBe(250);
    expect(paymentFor(500, classifyDice(2, 3))).toBe(1000);
  });

  it('リセット可能な累計を更新する', () => {
    const stats = addResult(EMPTY_STATS, { ...classifyDice(2, 4), dice: [2, 4] }, 500);
    expect(stats).toEqual({ rolls: 1, totalPayment: 250, totalListPrice: 500, counts: { yamada: 0, free: 0, half: 1, double: 0 } });
  });
});
