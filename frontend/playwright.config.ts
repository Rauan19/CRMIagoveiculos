import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.E2E_PORT ? Number(process.env.E2E_PORT) : 8080;
// Alguns ambientes setam CI=1 localmente; restringe a CI "real".
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const noWebServer = process.env.E2E_NO_WEBSERVER === '1';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Mantém baixo consumo em Windows/CI e evita subir webservers duplicados
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  // Em dev local: sobe backend + frontend automaticamente.
  // No CI: os servers sobem no workflow (evita conflito de portas).
  webServer: isCI || noWebServer
    ? undefined
    : [
        {
          command: 'node server.js',
          cwd: '../backend',
          url: 'http://localhost:3001/health',
          reuseExistingServer: true,
          timeout: 60_000,
          env: {
            ...process.env,
            PORT: '3001',
          },
        },
        {
          command: 'npm run dev',
          cwd: '.',
          url: `http://localhost:${PORT}/login`,
          reuseExistingServer: true,
          timeout: 120_000,
          env: {
            ...process.env,
            NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
          },
        },
      ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

