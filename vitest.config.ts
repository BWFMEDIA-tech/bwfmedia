import { defineConfig } from "vitest/config";

// Unit tests run without Start's RPC transform so handlers can be mocked directly.
export default defineConfig({
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  test: { include: ["src/**/*.test.ts", "src/**/*.test.tsx"] },
});