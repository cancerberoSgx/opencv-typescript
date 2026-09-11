import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { collectDependencyTypes } from './depgraph.js';
import { toVirtual } from './paths.js';
import { loadTsConfig } from './tsconfig.js';
import type { VfsBundleV1 } from './types.js';

export interface BuildOptions {
  projectDir: string;
  /** Defaults to `<projectDir>/tsconfig.json`. */
  tsconfigPath?: string;
  /** Run `npm install` first. Also runs automatically if `node_modules` is missing. */
  install?: boolean;
  /** Overrides the bundle's display name (defaults to package.json `name`). */
  name?: string;
  /** Virtual path (e.g. `/src/index.ts`) to open by default. */
  entry?: string;
}

interface PackageJson {
  name?: string;
  main?: string;
}

export function buildVfsBundle(opts: BuildOptions): VfsBundleV1 {
  const projectRoot = resolve(opts.projectDir);

  const pkgJsonPath = join(projectRoot, 'package.json');
  if (!existsSync(pkgJsonPath)) {
    throw new Error(`No package.json found at ${pkgJsonPath}`);
  }
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8')) as PackageJson;

  if (opts.install || !existsSync(join(projectRoot, 'node_modules'))) {
    execFileSync('npm', ['install'], { cwd: projectRoot, stdio: 'inherit' });
  }

  const tsconfigPath = opts.tsconfigPath ? resolve(opts.tsconfigPath) : join(projectRoot, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) {
    throw new Error(`No tsconfig.json found at ${tsconfigPath}`);
  }

  const { options, fileNames } = loadTsConfig(projectRoot, tsconfigPath);

  const files: Record<string, string> = {};
  for (const abs of fileNames) {
    files[toVirtual(abs, projectRoot)] = readFileSync(abs, 'utf8');
  }

  const extraLibs: Record<string, string> = {};
  for (const dep of collectDependencyTypes(projectRoot)) {
    extraLibs['/' + dep.virtualPath] = dep.content;
  }

  const entry =
    opts.entry && files[opts.entry] !== undefined ? opts.entry : pickEntry(files);

  return {
    version: 1,
    name: opts.name ?? pkg.name ?? basename(projectRoot),
    compilerOptions: options,
    files,
    extraLibs,
    entry,
  };
}

function pickEntry(files: Record<string, string>): string | undefined {
  for (const candidate of ['/src/index.ts', '/src/main.ts', '/index.ts', '/src/index.tsx']) {
    if (files[candidate] !== undefined) return candidate;
  }
  return Object.keys(files).sort()[0];
}
