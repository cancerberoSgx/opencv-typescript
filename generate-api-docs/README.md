# generate-api-docs

Generates static HTML API documentation for [`opencv-ts`](../opencv-ts) using
[TypeDoc](https://typedoc.org/), the standard documentation generator for TypeScript
projects (it reads the JSDoc comments already present in `opencv-ts`'s generated `.d.ts`
files and needs no source changes).

Output is written to [`/pages/opencv-ts-docs`](../pages/opencv-ts-docs), which is then
published to GitHub Pages by [`.github/workflows/pages.yml`](../.github/workflows/pages.yml).

## Usage

```sh
npm install
npm run generate
```

This runs `typedoc` using the config in [`typedoc.json`](typedoc.json), which:

* uses `../opencv-ts/index.d.ts` as the entry point (following its re-exports into
  `generated/**` and `hacks/**`)
* type-checks against `../opencv-ts/tsconfig.json`
* writes the generated HTML site to `../pages/opencv-ts-docs`

The output directory is cleaned and regenerated on every run, so it is not committed to
git (see `.gitignore` at the repo root) — CI regenerates it on every publish.

To preview locally after generating:

```sh
npx http-server ../pages -o /opencv-ts-docs/
```

## Why TypeDoc

`opencv-ts` ships only `.d.ts` declaration files (no runtime source), so the doc tool
needs to work directly from declarations plus their JSDoc. TypeDoc supports `.d.ts`
entry points natively, produces a searchable, themeable static HTML site, and is the
most widely used and actively maintained option in the TypeScript ecosystem — it is
what this project uses.
