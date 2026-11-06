import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('全4結果が正しく表示される', async ({ page }) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', req => { if (!req.url().startsWith('http://127.0.0.1:3001') && !req.url().startsWith('http://localhost:3001') && !req.url().startsWith('blob:')) external.push(req.url()); });
  for (const [id, text] of [['yamada', '山田'], ['free', '1杯無料'], ['half', '半額'], ['double', '倍量・倍額']]) {
    await page.goto(`/?force=${id}`);
    await expect(page.locator('.dice-scene canvas')).toBeVisible();
    await page.getByRole('button', { name: 'サイコロを振る！' }).click();
    await expect(page.locator(`.result-${id}`)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.result-card')).toContainText(text);
    await expect(page.locator('.stat').first()).toContainText('1回');
  }
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('連続した戦績・定価変更・再挑戦・リセット・ミュート', async ({ page }) => {
  await page.goto('/?force=half');
  await expect(page.locator('.dice-scene canvas')).toBeVisible();
  await page.getByRole('button', { name: 'サイコロを振る！' }).click();
  await expect(page.locator('.result-half')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.result-card')).toContainText('¥250');
  await page.getByRole('button', { name: 'もう一度、勝負！' }).click();
  await expect(page.locator('.stat').first()).toContainText('2回', { timeout: 15000 });
  await expect(page.locator('.stat').nth(1)).toContainText('¥500');
  await page.getByRole('button', { name: '効果音をオフにする' }).click();
  await expect(page.getByRole('button', { name: '効果音をオンにする' })).toBeVisible();
  await page.evaluate(() => history.replaceState(null, '', '/?force=double'));
  await page.getByRole('textbox', { name: '定価' }).fill('600');
  await page.getByRole('button', { name: 'もう一度、勝負！' }).click();
  await expect(page.locator('.result-double')).toContainText('¥1,200', { timeout: 15000 });
  await expect(page.locator('.stat').first()).toContainText('3回');
  await page.getByRole('button', { name: '戦績をリセット' }).click();
  await page.getByRole('button', { name: 'もう一度押すと消去' }).click();
  await expect(page.getByText('最初の出目を記録しよう')).toBeVisible();
});

test('山田の演出と自由な乱数、キーボード操作', async ({ page }) => {
  await page.goto('/?force=yamada');
  await expect(page.locator('.dice-scene canvas')).toBeVisible();
  await page.locator('h1').click();
  await page.keyboard.press('Space');
  await expect(page.locator('.app-shell')).toHaveClass(/is-jackpot/);
  await expect(page.locator('.effect-canvas')).toBeVisible();
  await expect(page.locator('.mega-jockey')).toBeVisible();
  await page.goto('/');
  await page.getByRole('button', { name: 'サイコロを振る！' }).click();
  await expect(page.locator('.result-card')).toBeVisible({ timeout: 15000 });
  const value = await page.locator('.result-card').getAttribute('class');
  expect(value).toMatch(/result-(yamada|free|half|double)/);
});

test('アクセシビリティと画面幅', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.dice-scene canvas')).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'ルール', exact: true }).click();
  await expect(page.locator('.rule-details')).toBeVisible();
});

test('動きを抑える設定でも操作できる', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?force=free');
  await expect(page.locator('.dice-scene canvas')).toBeVisible();
  await page.getByRole('button', { name: 'サイコロを振る！' }).click();
  await expect(page.locator('.result-card')).toContainText('1杯無料');
});
