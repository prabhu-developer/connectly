import path from "node:path";
import { defineConfig } from "vitest/config";

// Point mongodb-memory-server to pre-downloaded mongod binary in node_modules/.cache
process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(__dirname, "../../node_modules/.cache/mongodb-memory-server");

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});

