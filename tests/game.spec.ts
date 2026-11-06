import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('全4結果が正しく表示される', async ({ page }) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', req => { if (!req.url().startsWith('http://127.0.0.1:3000') && !req.url().startsWith('http://localhost:3000') && !req.url().startsWith('blob:')) external.push(req.url()); });
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

test('4種類の出目が描画の上面と必ず一致する', async ({ page }) => {
  for (const id of ['yamada', 'free', 'half', 'double']) {
    await page.goto(`/?force=${id}`);
    await expect(page.locator('.dice-scene canvas')).toBeVisible();
    await page.getByRole('button', { name: 'サイコロを振る！' }).click();
    await expect(page.locator(`.result-${id}`)).toBeVisible({ timeout: 15000 });
    const rendered = (await page.locator('.dice-scene').getAttribute('data-top-faces'))?.split(',').map(Number);
    const judged = (await page.locator('.dice-scene').getAttribute('data-judged-faces'))?.split(',').map(Number);
    expect(rendered).toEqual(judged);
    const expected = id === 'yamada' ? [1, 1] : id === 'free' ? [6, 6] : id === 'half' ? [2, 4] : [1, 2];
    expect(judged).toEqual(expected);
    const bounds = await page.locator('.dice-scene').boundingBox();
    const resultBounds = await page.locator('.result-card').boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(resultBounds!.y);
  }
});

test('整列後の山田は左が山・右が田で上面とも一致', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?force=yamada');
  await expect(page.locator('.dice-scene canvas')).toBeVisible();
  await page.getByRole('button', { name: 'サイコロを振る！' }).click();
  await expect(page.locator('.result-yamada')).toBeVisible({ timeout: 15000 });
  expect(await page.locator('.dice-scene').getAttribute('data-top-faces')).toBe('1,1');
  expect(errors).toEqual([]);
});

test('山田の演出と自由な乱数、キーボード操作', async ({ page }) => {
  await page.goto('/?force=yamada');
  await expect(page.locator('.dice-scene canvas')).toBeVisible();
  await page.locator('h1').click();
  await page.keyboard.press('Space');
  await expect(page.locator('.app-shell')).toHaveClass(/is-jackpot/, { timeout: 30000 });
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
  await expect(page.locator('.dice-scene')).toHaveAttribute('data-settled-faces', '6,6');
  await expect(page.locator('.dice-scene')).toHaveAttribute('data-top-faces', '6,6');
  await expect(page.locator('.dice-scene')).toHaveAttribute('data-judged-faces', '6,6');
});

test('止まった上面が結果まで変わらず、結果カードと一致する', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.dice-scene canvas')).toBeVisible();
  await page.getByRole('button', { name: 'サイコロを振る！' }).click();
  const scene = page.locator('.dice-scene');
  await expect(scene).toHaveAttribute('data-settled-faces', /^[1-6],[1-6]$/, { timeout: 15000 });
  const settled = (await scene.getAttribute('data-settled-faces')) ?? '';
  const samples = await page.evaluate(async () => {
    const el = document.querySelector('.dice-scene');
    if (!el) return [];
    const seen = new Set();
    const read = () => {
      const value = el.getAttribute('data-top-faces');
      if (value) seen.add(value);
    };
    read();
    await new Promise(resolve => {
      const timer = window.setInterval(() => {
        read();
        if (document.querySelector('.result-card')) {
          window.clearInterval(timer);
          resolve(undefined);
        }
      }, 40);
    });
    read();
    return [...seen];
  });
  expect(samples).toEqual([settled]);
  await expect(scene).toHaveAttribute('data-top-faces', settled);
  await expect(scene).toHaveAttribute('data-judged-faces', settled);
  const [left, right] = settled.split(',').map(Number);
  const label = (value: number, side: 'left' | 'right') => (value === 1 ? (side === 'left' ? '山' : '田') : String(value));
  const readout = (await page.locator('.dice-readout').innerText()).replace(/\s+/g, '');
  expect(readout).toContain(`${label(left, 'left')}×${label(right, 'right')}`);
});
