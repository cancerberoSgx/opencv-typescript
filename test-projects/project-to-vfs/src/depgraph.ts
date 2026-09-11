import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  types?: string;
  typings?: string;
  main?: string;
  module?: string;
  exports?: unknown;
}

function readPackageJson(dir: string): PackageJson | null {
  const file = join(dir, 'package.json');
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as PackageJson;
  } catch {
    return null;
  }
}

/** Node-style upward search for `<...>/node_modules/<pkgName>`, starting at `fromDir`. */
function resolvePackageDir(fromDir: string, pkgName: string): string | null {
  const segments = pkgName.startsWith('@') ? pkgName.split('/').slice(0, 2) : [pkgName];
  let dir = fromDir;
  for (;;) {
    const candidate = join(dir, 'node_modules', ...segments);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** Recursively lists every file under `dir` (following symlinks, cycle-safe). */
function walkFiles(dir: string, seenRealDirs: Set<string>, out: string[]): void {
  let real: string;
  try {
    real = realpathSync(dir);
  } catch {
    return;
  }
  if (seenRealDirs.has(real)) return;
  seenRealDirs.add(real);

  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules') continue; // nested deps are walked separately, as their own package
    const full = join(dir, entry.name);
    if (entry.isDirectory() || (entry.isSymbolicLink() && statSync(full).isDirectory())) {
      walkFiles(full, seenRealDirs, out);
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      out.push(full);
    }
  }
}

export interface CollectedDep {
  /** Path relative to the resolving root, POSIX-separated, no leading slash. */
  virtualPath: string;
  content: string;
}

/**
 * BFS over the project's dependency graph (starting from its own
 * package.json `dependencies`/`peerDependencies`, then each visited
 * package's own `dependencies`), collecting `.d.ts` files plus a trimmed
 * `package.json` for every reachable package that actually resolves on
 * disk. Packages without types (no `.d.ts` anywhere) are silently skipped —
 * they simply contribute nothing to `extraLibs`.
 *
 * Virtual paths mirror the real on-disk `node_modules` layout relative to
 * `projectRoot` (including nested `node_modules` for version-conflicted
 * deps), so TypeScript's normal upward module-resolution walk behaves the
 * same in the browser as it does on disk.
 */
export function collectDependencyTypes(projectRoot: string): CollectedDep[] {
  const projectPkg = readPackageJson(projectRoot);
  if (!projectPkg) return [];

  const rootDepNames = [
    ...Object.keys(projectPkg.dependencies ?? {}),
    ...Object.keys((projectPkg as { devDependencies?: Record<string, string> }).devDependencies ?? {}),
    ...Object.keys(projectPkg.peerDependencies ?? {}),
  ];

  const visitedPkgDirs = new Set<string>();
  const queue: Array<{ name: string; fromDir: string }> = rootDepNames.map((name) => ({
    name,
    fromDir: projectRoot,
  }));

  const results: CollectedDep[] = [];

  while (queue.length) {
    const { name, fromDir } = queue.shift()!;
    const pkgDir = resolvePackageDir(fromDir, name);
    if (!pkgDir || visitedPkgDirs.has(pkgDir)) continue;
    visitedPkgDirs.add(pkgDir);

    const pkg = readPackageJson(pkgDir);
    if (!pkg) continue;

    const files: string[] = [];
    walkFiles(pkgDir, new Set(), files);

    let hasTypes = false;
    for (const file of files) {
      if (!file.endsWith('.d.ts') && !file.endsWith('package.json')) continue;
      if (file.endsWith('.d.ts')) hasTypes = true;
      const rel = relative(projectRoot, file).split(sep).join('/');
      results.push({ virtualPath: rel, content: readFileSync(file, 'utf8') });
    }
    if (!hasTypes) {
      // Drop the (already pushed) lone package.json for packages with no
      // .d.ts at all — nothing for the TS program to resolve there.
      for (let i = results.length - 1; i >= 0; i--) {
        if (results[i].virtualPath === relative(projectRoot, join(pkgDir, 'package.json')).split(sep).join('/')) {
          results.splice(i, 1);
          break;
        }
      }
    }

    for (const dep of Object.keys(pkg.dependencies ?? {})) {
      queue.push({ name: dep, fromDir: pkgDir });
    }
  }

  return results;
}
