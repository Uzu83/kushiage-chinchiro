import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --port 3000', url: 'http://127.0.0.1:3000', reuseExistingServer: true },
  projects: [{ name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } }, { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } }],
});
