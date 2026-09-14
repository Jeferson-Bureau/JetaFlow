import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    fileParallelism: false,
    setupFiles: ["./tests/setup.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    env: {
      DATABASE_URL: "file:./prisma/test.db",
      NEXTAUTH_SECRET: "test-secret",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
