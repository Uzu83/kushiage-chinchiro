import { describe, expect, it } from 'vitest';
import { webAnalyticsEnabled } from './webAnalytics';

describe('匿名アクセス集計', () => {
  it('本番ビルドだけ有効にする', () => {
    expect(webAnalyticsEnabled(true)).toBe(true);
    expect(webAnalyticsEnabled(false)).toBe(false);
  });
});
