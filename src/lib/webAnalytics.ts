/**
 * @vercel/analytics の development は va.vercel-scripts.com を読む。
 * 開発と e2e では載せず、本番ビルドだけ同じオリジンの /_vercel/insights/script.js を使う。
 */
export function webAnalyticsEnabled(prod: boolean): boolean {
  return prod;
}
