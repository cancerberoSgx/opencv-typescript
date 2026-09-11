import ts from 'typescript';
import { dirname } from 'node:path';
import { toVirtual } from './paths.js';

export interface LoadedTsConfig {
  options: Record<string, unknown>;
  fileNames: string[];
}

/**
 * Reads and fully resolves a tsconfig.json (via the real TypeScript
 * compiler, following `extends`/`include`/`exclude`) and normalizes the
 * resulting `CompilerOptions` for the browser:
 *  - `target`/`module`/`jsx`/`moduleResolution` etc. come out as the
 *    numeric enum values `typescript` itself uses, which Monaco's own
 *    typescript enums share the same numeric values for.
 *  - `baseUrl`/`typeRoots`, which `parseJsonConfigFileContent` resolves to
 *    absolute disk paths, are rewritten to the project's virtual root so
 *    they still make sense once there's no real disk underneath.
 *  - Build/emit-only options that only make sense with a real filesystem
 *    (`outDir`, `rootDir`, `tsBuildInfoFile`, ...) are dropped.
 */
export function loadTsConfig(projectRoot: string, tsconfigPath: string): LoadedTsConfig {
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
  }

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, dirname(tsconfigPath));
  if (parsed.errors.length) {
    const msg = parsed.errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n');
    throw new Error(msg);
  }

  return {
    options: normalizeOptionsForVfs(parsed.options, projectRoot),
    fileNames: parsed.fileNames,
  };
}

function normalizeOptionsForVfs(options: ts.CompilerOptions, projectRoot: string): Record<string, unknown> {
  const out: Record<string, unknown> = { ...options };

  for (const key of [
    'configFilePath',
    'outDir',
    'outFile',
    'declarationDir',
    'rootDir',
    'rootDirs',
    'tsBuildInfoFile',
    'incremental',
    'composite',
    'project',
  ]) {
    delete out[key];
  }
  out.noEmit = true;

  if (typeof options.baseUrl === 'string') {
    out.baseUrl = toVirtual(options.baseUrl, projectRoot);
  }
  if (Array.isArray(options.typeRoots)) {
    out.typeRoots = options.typeRoots.map((p) => toVirtual(p, projectRoot));
  }

  return out;
}
