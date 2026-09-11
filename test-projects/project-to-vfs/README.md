# project-to-vfs

Builds a **VFS bundle** — project source files + resolved dependency
`.d.ts`/`package.json` files + normalized `tsconfig.json` compiler options —
from a real npm/TypeScript project on disk, so it can be loaded into the
sibling `../code-editor` playground (100% in-browser, no backend).

See `src/types.ts` for the bundle shape (kept in sync manually with
`code-editor/src/vfs/types.ts`).



## Usage

Note: to generate opencv demo project's and install it to code-editor just exec `sh scripts/generate.sh` 

```sh
npm install
npx tsx src/cli.ts <projectDir> [options]
```

Options:
- `--out <file>` — output JSON path (default: `<name>.vfs.json` in cwd)
- `--tsconfig <path>` — tsconfig.json to use (default: `<projectDir>/tsconfig.json`)
- `--install` — run `npm install` in the target project first (also runs
  automatically if `node_modules` is missing there)
- `--name <name>` — override the bundle's display name
- `--entry <path>` — virtual path to open by default, e.g. `/src/index.ts`

Example, against this repo's `react1` sample (multi-tsconfig project, so the
app's own tsconfig has to be named explicitly):

```sh
npx tsx src/cli.ts ../react1 --tsconfig ../react1/tsconfig.app.json \
  --out ../code-editor/public/projects/react1.vfs.json
```

## How dependency types are collected (v1)

Starting from the target project's own `dependencies`/`devDependencies`/
`peerDependencies`, it does a breadth-first walk over each package's own
`dependencies` (resolved the same way Node resolves `node_modules`,
including nested `node_modules` and symlinked/`file:`-installed packages),
collecting every `.d.ts` file plus a `package.json` for each reachable
package. Packages with no `.d.ts` anywhere contribute nothing.

This is a **package-level** inclusion, not import-level tree-shaking: if a
project depends on something with a large type-only footprint (e.g. `vite`,
`typescript` itself as a devDependency), all of its `.d.ts` files get
pulled in even if the app code never imports it directly. That's the
pragmatic v1 trade-off — bundles can run into several MB. Real tree-shaking
(only `.d.ts` files actually reachable from the import graph) is the
natural next optimization.

## tsconfig normalization

`parseJsonConfigFileContent` resolves `baseUrl`/`typeRoots` to absolute disk
paths and enum-like options (`target`, `module`, `jsx`, `moduleResolution`,
...) to their numeric `typescript` enum values. This tool rewrites
`baseUrl`/`typeRoots` to the bundle's virtual root (`/...`) and drops
build/emit-only options that only make sense with a real filesystem
(`outDir`, `rootDir`, `tsBuildInfoFile`, ...). The numeric enum values are
passed through as-is — Monaco's own TypeScript enums share the same numeric
values, so `code-editor` can hand them straight to
`typescriptDefaults.setCompilerOptions`.
