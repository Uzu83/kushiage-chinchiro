export type Die = 1 | 2 | 3 | 4 | 5 | 6;
export type OutcomeId = 'yamada' | 'free' | 'half' | 'double';

export interface Outcome {
  id: OutcomeId;
  title: string;
  shortTitle: string;
  subtitle: string;
  multiplier: number;
  probability: string;
  probabilityText: string;
  accent: string;
}

export type RollResult = Outcome & { dice: [Die, Die] };

export const OUTCOMES: Record<OutcomeId, Outcome> = {
  yamada: {
    id: 'yamada', title: 'メガジョッキ 1杯無料', shortTitle: '山田！', subtitle: '大当たり！おめでとう！',
    multiplier: 0, probability: '1/36', probabilityText: '約2.8%', accent: '#c93322',
  },
  free: {
    id: 'free', title: '通常ジョッキ 1杯無料', shortTitle: 'ゾロ目！', subtitle: 'ナイス！1杯無料！',
    multiplier: 0, probability: '5/36', probabilityText: '約13.9%', accent: '#d56b00',
  },
  half: {
    id: 'half', title: '1杯 半額', shortTitle: '偶数', subtitle: 'まずまず！半額！',
    multiplier: 0.5, probability: '12/36', probabilityText: '約33.3%', accent: '#147062',
  },
  double: {
    id: 'double', title: 'メガジョッキ 倍量倍額', shortTitle: '奇数…', subtitle: '残念！メガジョッキ確定',
    multiplier: 2, probability: '18/36', probabilityText: '50%', accent: '#263c56',
  },
};

export function classifyDice(a: number, b: number): Outcome {
  if (a === 1 && b === 1) return OUTCOMES.yamada;
  if (a === b) return OUTCOMES.free;
  return (a + b) % 2 === 0 ? OUTCOMES.half : OUTCOMES.double;
}

function randomDie(): Die {
  // Rejection sampling avoids modulo bias: 252 is the largest multiple of 6 below 256.
  const bytes = new Uint8Array(1);
  do { crypto.getRandomValues(bytes); } while (bytes[0] >= 252);
  return (bytes[0] % 6 + 1) as Die;
}

export function randomDice(): [Die, Die] {
  return [randomDie(), randomDie()];
}

export function roll(dice = randomDice()): RollResult {
  return { ...classifyDice(...dice), dice };
}

/** Displayed payments are rounded to the nearest whole yen. */
export function paymentFor(price: number, outcome: Outcome): number {
  return Math.round(price * outcome.multiplier);
}

export interface Stats {
  rolls: number;
  totalPayment: number;
  totalListPrice: number;
  counts: Record<OutcomeId, number>;
}

export const EMPTY_STATS: Stats = {
  rolls: 0, totalPayment: 0, totalListPrice: 0,
  counts: { yamada: 0, free: 0, half: 0, double: 0 },
};

export function addResult(stats: Stats, result: RollResult, price: number): Stats {
  return {
    rolls: stats.rolls + 1,
    totalPayment: stats.totalPayment + paymentFor(price, result),
    totalListPrice: stats.totalListPrice + price,
    counts: { ...stats.counts, [result.id]: stats.counts[result.id] + 1 },
  };
}

export const EXPECTED_PAYMENT_RATE = 7 / 6;
