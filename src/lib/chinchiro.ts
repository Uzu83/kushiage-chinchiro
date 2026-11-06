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

export interface Fraction {
  numerator: number;
  denominator: number;
}

/** One row of the expectation table. Mega volume is 2 normal mugs. */
export interface HarshTruthRow {
  id: OutcomeId;
  ways: number;
  pay: Fraction;
  volume: Fraction;
}

export const HARSH_TRUTH_TABLE: readonly HarshTruthRow[] = [
  { id: 'yamada', ways: 1, pay: { numerator: 0, denominator: 1 }, volume: { numerator: 2, denominator: 1 } },
  { id: 'free', ways: 5, pay: { numerator: 0, denominator: 1 }, volume: { numerator: 1, denominator: 1 } },
  { id: 'half', ways: 12, pay: { numerator: 1, denominator: 2 }, volume: { numerator: 1, denominator: 1 } },
  { id: 'double', ways: 18, pay: { numerator: 2, denominator: 1 }, volume: { numerator: 2, denominator: 1 } },
];

export const MEGA_VOLUME_NOTE = 'メガは通常の2倍量として計算';

export interface HarshTruth {
  pay: Fraction;
  volume: Fraction;
  payPerVolume: Fraction;
  extraPayPercent: number;
  extraVolumePercent: number;
  cheaperPercent: number;
  summary: string;
}

export interface CupRecord {
  rolls: number;
  paid: Fraction;
  volume: Fraction;
  payPerVolume: Fraction | null;
  theoryPaid: Fraction;
  theoryVolume: Fraction;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

export function reduceFraction(numerator: number, denominator: number): Fraction {
  if (denominator < 0) {
    numerator = -numerator;
    denominator = -denominator;
  }
  const divisor = gcd(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function addFractions(a: Fraction, b: Fraction): Fraction {
  return reduceFraction(a.numerator * b.denominator + b.numerator * a.denominator, a.denominator * b.denominator);
}

function mulFraction(fraction: Fraction, factor: number): Fraction {
  return reduceFraction(fraction.numerator * factor, fraction.denominator);
}

function percentRounded(numerator: number, denominator: number): number {
  return Math.round(numerator / denominator);
}

export function harshTruth(table: readonly HarshTruthRow[] = HARSH_TRUTH_TABLE): HarshTruth {
  const ways = table.reduce((sum, row) => sum + row.ways, 0);
  let paySum: Fraction = { numerator: 0, denominator: 1 };
  let volumeSum: Fraction = { numerator: 0, denominator: 1 };
  for (const row of table) {
    paySum = addFractions(paySum, mulFraction(row.pay, row.ways));
    volumeSum = addFractions(volumeSum, mulFraction(row.volume, row.ways));
  }
  const pay = reduceFraction(paySum.numerator, paySum.denominator * ways);
  const volume = reduceFraction(volumeSum.numerator, volumeSum.denominator * ways);
  const payPerVolume = reduceFraction(pay.numerator * volume.denominator, pay.denominator * volume.numerator);
  const extraPayPercent = percentRounded((pay.numerator - pay.denominator) * 100, pay.denominator);
  const extraVolumePercent = percentRounded((volume.numerator - volume.denominator) * 100, volume.denominator);
  const cheaperPercent = percentRounded((payPerVolume.denominator - payPerVolume.numerator) * 100, payPerVolume.denominator);
  return {
    pay,
    volume,
    payPerVolume,
    extraPayPercent,
    extraVolumePercent,
    cheaperPercent,
    summary: `平均すると${extraPayPercent}%多く払うけど、量は${extraVolumePercent}%増えるので、1杯分あたりは${cheaperPercent}%安い。ただし飲む量も増える。`,
  };
}

export const HARSH_TRUTH = harshTruth();

export function formatFraction(fraction: Fraction): string {
  const reduced = reduceFraction(fraction.numerator, fraction.denominator);
  return `${reduced.numerator}/${reduced.denominator}`;
}

export function formatDecimal(fraction: Fraction): string {
  return (fraction.numerator / fraction.denominator).toFixed(2);
}

export function formatCups(fraction: Fraction): string {
  const value = Math.round((fraction.numerator / fraction.denominator) * 100) / 100;
  return `${value}杯分`;
}

export function recordFromCounts(counts: Record<OutcomeId, number>, table: readonly HarshTruthRow[] = HARSH_TRUTH_TABLE): CupRecord {
  const truth = harshTruth(table);
  let paid: Fraction = { numerator: 0, denominator: 1 };
  let volume: Fraction = { numerator: 0, denominator: 1 };
  let rolls = 0;
  for (const row of table) {
    const count = counts[row.id] ?? 0;
    rolls += count;
    paid = addFractions(paid, mulFraction(row.pay, count));
    volume = addFractions(volume, mulFraction(row.volume, count));
  }
  const payPerVolume = volume.numerator === 0
    ? null
    : reduceFraction(paid.numerator * volume.denominator, paid.denominator * volume.numerator);
  return {
    rolls,
    paid,
    volume,
    payPerVolume,
    theoryPaid: mulFraction(truth.pay, rolls),
    theoryVolume: mulFraction(truth.volume, rolls),
  };
}

export const EXPECTED_PAYMENT_RATE = HARSH_TRUTH.pay.numerator / HARSH_TRUTH.pay.denominator;
