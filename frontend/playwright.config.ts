/**
 * End-to-end tests in a real browser against the real backend.
 *
 * Default: starts a fresh backend (its own SQLite file) and the Vite dev
 * server on spare ports. Set E2E_BASE_URL to test an already running stack
 * instead, for example the Docker Compose one at http://localhost:8501.
 */
import { defineConfig, devices } from "@playwright/test";

const WEB_PORT = 5174;
const API_PORT = 8010;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: "e2e",
  // The tests share one backend database, so they run one at a time.
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "he-IL",
    timezoneId: "Asia/Jerusalem",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          // A new database file per run, so every run starts from the seed.
          command: `rm -f data/e2e.db && uv run fastapi run --port ${API_PORT}`,
          cwd: "../backend",
          env: { DATABASE_URL: "sqlite:///./data/e2e.db" },
          url: `http://localhost:${API_PORT}/health`,
          reuseExistingServer: false,
          timeout: 120_000,
        },
        {
          command: `npx vite --port ${WEB_PORT} --strictPort`,
          env: { BACKEND_URL: `http://localhost:${API_PORT}` },
          url: baseURL,
          reuseExistingServer: false,
        },
      ],
});
