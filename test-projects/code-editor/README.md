# code-editor

A generic, 100%-in-browser VS Code–style editor: file tree + tabs + Monaco,
wired to Monaco's built-in TypeScript language service so it gets real
multi-file semantic diagnostics, autocomplete, hover, Go to Definition, Find
All References, and Rename — no backend, no LSP server.

It doesn't know anything about any specific project. It just consumes a
**VFS bundle** (see `src/vfs/types.ts`) and renders it. Bundles are produced
by the sibling `../project-to-vfs` CLI from a real npm/TypeScript project.

## Run it

```sh
npm install
npm run dev
```

Then either:
- pick one of the sample projects from the dropdown (see `public/projects/manifest.json`), or
- upload a VFS bundle JSON file produced by `project-to-vfs`.

## Regenerating the sample projects

The samples in `public/projects/*.vfs.json` are gitignored (large, derived).
Regenerate them from the repo root:

```sh
cd ../project-to-vfs
npx tsx src/cli.ts ../react1 --tsconfig ../react1/tsconfig.app.json \
  --out ../code-editor/public/projects/react1.vfs.json
npx tsx src/cli.ts ../node1 \
  --out ../code-editor/public/projects/node1.vfs.json
```

## How the TS features work without a backend

Every project source file becomes a Monaco model (`monaco.editor.createModel`)
and every dependency's `.d.ts`/`package.json` becomes an "extra lib"
(`typescriptDefaults.addExtraLib`). Monaco's bundled TypeScript worker treats
all of that as one program, so the standard providers it already ships
(diagnostics, completions, hover, definitions, references, rename) work
against the real project + real dependency types — see `src/vfs/applyVfs.ts`.

## Known limitations (v1 prototype)

- Single in-browser TS program: no multi-tsconfig project references.
- Edits are in-memory only — nothing is written back to disk.
- No custom LSP bridge; relies entirely on Monaco's built-in TS mode, which
  is very capable but not byte-for-byte identical to real `tsserver`/VS Code.
