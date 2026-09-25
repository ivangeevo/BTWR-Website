import path from "node:path";
import { defineConfig } from "vitest/config";

// Pure-logic tests only (the Engine's solver, economy, ciphers...) — UI is
// verified in the browser. Tests import describe/it/expect from "vitest"
// explicitly, since `next build` type-checks every .ts file.
export default defineConfig({
  test: {
    environment: "node",
    include: ["components/**/*.test.ts", "lib/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
});
