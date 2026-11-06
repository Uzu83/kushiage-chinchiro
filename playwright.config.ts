import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:3001', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --port 3001', url: 'http://127.0.0.1:3001', reuseExistingServer: true },
  projects: [{ name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } }, { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } }],
});
