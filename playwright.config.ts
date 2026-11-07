import { defineConfig } from "@playwright/test";

const PORT = 3101;
const DATA = "/tmp/praxis-ui-test/service.json";

// Runs against the production build with throwaway data. Run `npm run build` first.
export default defineConfig({
  testDir: "tests",
  testMatch: "ui.spec.ts",
  workers: 1,
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  webServer: {
    command: `rm -f ${DATA} && npx next start --port ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    env: {
      PRAXIS_DATA_FILE: DATA,
      // Nothing listens here except inside the assistant test, so other tests
      // exercise the same fallback as a failed AI call. No real key is used.
      OPENROUTER_API_KEY: "test-key",
      OPENROUTER_BASE_URL: "http://127.0.0.1:3199",
    },
  },
});
