// Wires up Monaco's web workers the way Vite's own docs recommend (`?worker` triggers Vite
// to bundle the target module as a separate Worker chunk) - this is what gives the editor a
// real, in-browser TypeScript language service (typechecking, autocomplete, quick info, "Go
// to definition") instead of just syntax highlighting. Must be imported once, before any
// `monaco.editor.create(...)`/model creation - see main.tsx.
import type { Environment } from "monaco-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

declare global {
  interface Window {
    MonacoEnvironment?: Environment;
  }
}

self.MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    if (label === "typescript" || label === "javascript") {
      return new TsWorker();
    }
    return new EditorWorker();
  },
};
