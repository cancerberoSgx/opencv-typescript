#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { buildVfsBundle } from './build.js';

function printUsage() {
  console.log(`Usage: project-to-vfs <projectDir> [options]

Builds a VFS bundle (project source + resolved dependency .d.ts) from a
real npm/TypeScript project, ready to feed into test-projects/code-editor.

Options:
  --out <file>        Output JSON path (default: <name>.vfs.json in cwd)
  --tsconfig <path>    tsconfig.json path (default: <projectDir>/tsconfig.json)
  --install            Run \`npm install\` first (also runs automatically if node_modules is missing)
  --name <name>        Override the bundle's display name
  --entry <path>       Virtual path to open by default, e.g. /src/index.ts
  -h, --help            Show this help
`);
}

function parseArgs(argv: string[]) {
  const args = { _: [] as string[] } as Record<string, string | boolean> & { _: string[] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') {
      args.help = true;
    } else if (a === '--install') {
      args.install = true;
    } else if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args._.length === 0) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  const projectDir = args._[0];
  const bundle = buildVfsBundle({
    projectDir,
    tsconfigPath: typeof args.tsconfig === 'string' ? args.tsconfig : undefined,
    install: Boolean(args.install),
    name: typeof args.name === 'string' ? args.name : undefined,
    entry: typeof args.entry === 'string' ? args.entry : undefined,
  });

  const outPath = resolve(
    typeof args.out === 'string' ? args.out : `${basename(projectDir)}.vfs.json`,
  );
  writeFileSync(outPath, JSON.stringify(bundle));

  const fileCount = Object.keys(bundle.files).length;
  const libCount = Object.keys(bundle.extraLibs).length;
  const bytes = Buffer.byteLength(JSON.stringify(bundle));
  console.log(
    `Wrote ${outPath}\n` +
      `  name: ${bundle.name}\n` +
      `  source files: ${fileCount}\n` +
      `  extra libs (deps' .d.ts/package.json): ${libCount}\n` +
      `  entry: ${bundle.entry ?? '(none)'}\n` +
      `  size: ${(bytes / 1024 / 1024).toFixed(2)} MB`,
  );
}

main();
