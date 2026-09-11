// Vite-native Monaco worker wiring. Import this once before any editor is
// created (see main.tsx). The `new URL(..., import.meta.url)` + `new Worker`
// pattern is understood natively by Vite's build (each becomes its own
// worker chunk) without needing a bundler-specific plugin.
//
// Note: monaco-editor's package.json `exports` map already prefixes
// subpaths with `esm/vs/`, so `monaco-editor/editor/editor.worker.js`
// resolves to `monaco-editor/esm/vs/editor/editor.worker.js` — don't repeat
// the `esm/vs/` prefix in the specifier below.
self.MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    switch (label) {
      case 'typescript':
      case 'javascript':
        return new Worker(
          new URL('monaco-editor/language/typescript/ts.worker.js', import.meta.url),
          { type: 'module' },
        );
      case 'json':
        return new Worker(new URL('monaco-editor/language/json/json.worker.js', import.meta.url), {
          type: 'module',
        });
      case 'css':
      case 'scss':
      case 'less':
        return new Worker(new URL('monaco-editor/language/css/css.worker.js', import.meta.url), {
          type: 'module',
        });
      case 'html':
      case 'handlebars':
      case 'razor':
        return new Worker(new URL('monaco-editor/language/html/html.worker.js', import.meta.url), {
          type: 'module',
        });
      default:
        return new Worker(new URL('monaco-editor/editor/editor.worker.js', import.meta.url), {
          type: 'module',
        });
    }
  },
};
