import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The opencv-ts package this app depends on (see package.json's `opencv-ts:
// file:../../opencv-ts`) - read straight from source rather than through node_modules so a
// local `npm link`/symlink quirk can't get in the way.
const OPENCV_TS_DIR = path.resolve(__dirname, "../../opencv-ts");

/**
 * Exposes every `opencv-ts` `.d.ts` file's path (relative to the package root) and content
 * as `virtual:opencv-ts-libs` - see src/editor/setupOpenCvTypes.ts. This is what lets the
 * in-browser Monaco/TypeScript worker typecheck and autocomplete against *this repo's*
 * opencv-ts, always in sync with whatever is currently generated there (no separate "pack"
 * build step to keep up to date, unlike mirada-ts-playground's embed-json-in-ts).
 */
function opencvTsLibsPlugin(): Plugin {
  const virtualId = "virtual:opencv-ts-libs";
  const resolvedId = "\0" + virtualId;

  function collectDtsFiles(dir: string, rel = ""): { path: string; content: string }[] {
    const out: { path: string; content: string }[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const abs = path.join(dir, entry.name);
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        out.push(...collectDtsFiles(abs, relPath));
      } else if (entry.name.endsWith(".d.ts")) {
        out.push({ path: relPath, content: fs.readFileSync(abs, "utf-8") });
      }
    }
    return out;
  }

  return {
    name: "opencv-ts-libs",
    resolveId(id: string) {
      if (id === virtualId) return resolvedId;
    },
    load(id: string) {
      if (id !== resolvedId) return;
      const files = collectDtsFiles(OPENCV_TS_DIR);
      if (files.length === 0) {
        this.warn(`opencv-ts-libs: no .d.ts files found under ${OPENCV_TS_DIR}`);
      }
      return `export const opencvTsLibs = ${JSON.stringify(files)};\n`;
    },
    configureServer(server) {
      // Re-run `load()` (Vite HMRs virtual modules on file change) when opencv-ts itself
      // changes, so editing e.g. a hacks/*.d.ts file there is reflected here without a
      // restart.
      server.watcher.add(OPENCV_TS_DIR);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), opencvTsLibsPlugin()],
  // Relative asset URLs, so the same build works whether it's served from "/" (local
  // preview) or a subpath (GitHub Pages, e.g. "/opencv-typescript/demos/react2/") - same
  // convention as test-projects/react1.
  base: "./",
  worker: {
    format: "es",
  },
});
