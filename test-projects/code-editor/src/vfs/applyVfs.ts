import * as monaco from 'monaco-editor';
import type { VfsBundleV1 } from './types';

let extraLibDisposables: monaco.IDisposable[] = [];

function languageForPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'mts':
    case 'cts':
      return 'typescript';
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'json':
      return 'json';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    case 'md':
      return 'markdown';
    default:
      return 'plaintext';
  }
}

export function toUri(path: string): monaco.Uri {
  return monaco.Uri.parse(`file://${path.startsWith('/') ? path : `/${path}`}`);
}

/** Disposes every model + extra lib from a previously-loaded project. */
export function disposeCurrentProject(): void {
  for (const model of monaco.editor.getModels()) {
    model.dispose();
  }
  for (const d of extraLibDisposables) d.dispose();
  extraLibDisposables = [];
}

/**
 * Loads a VFS bundle into Monaco's TypeScript worker: sets compiler options,
 * registers dependency `.d.ts`/`package.json` files as extra libs, and
 * creates one model per source file so they participate in the same
 * in-browser TS program (Monaco's built-in TS mode then gives Go to
 * Definition, Find All References, Rename, hover and completions for free).
 *
 * Returns the sorted list of source file paths, for the file tree.
 */
export function applyVfsToMonaco(bundle: VfsBundleV1): string[] {
  disposeCurrentProject();

  const options = bundle.compilerOptions as monaco.typescript.CompilerOptions;
  monaco.typescript.typescriptDefaults.setCompilerOptions(options);
  monaco.typescript.typescriptDefaults.setEagerModelSync(true);
  monaco.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });
  // Mirror onto javascriptDefaults too, in case the project has allowJs
  // source files mixed in.
  monaco.typescript.javascriptDefaults.setCompilerOptions(options);
  monaco.typescript.javascriptDefaults.setEagerModelSync(true);

  for (const [path, content] of Object.entries(bundle.extraLibs)) {
    const disposable = monaco.typescript.typescriptDefaults.addExtraLib(content, `file://${path}`);
    extraLibDisposables.push(disposable);
  }

  const paths = Object.keys(bundle.files).sort();
  for (const path of paths) {
    const uri = toUri(path);
    if (!monaco.editor.getModel(uri)) {
      monaco.editor.createModel(bundle.files[path], languageForPath(path), uri);
    }
  }

  return paths;
}
