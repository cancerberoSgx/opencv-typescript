/**
 * VFS bundle contract — shared between `test-projects/code-editor` (consumer)
 * and `test-projects/project-to-vfs` (producer).
 *
 * This file is duplicated (not imported across the two projects, which are
 * independent apps) in `project-to-vfs/src/types.ts`. Keep both in sync when
 * the shape changes; bump `version` on breaking changes.
 *
 * Paths are POSIX-style, absolute-ish, and rooted arbitrarily (e.g.
 * "/src/index.ts", "/node_modules/lodash/index.d.ts"). The editor turns them
 * into `file://<path>` Monaco URIs.
 */
export interface VfsBundleV1 {
  version: 1;

  /** Display name, e.g. the package name. */
  name: string;

  /**
   * Normalized `ts.CompilerOptions` (already resolved from tsconfig.json,
   * with `target`/`module`/`jsx`/`moduleResolution` as the numeric enum
   * values `typescript` itself produces — Monaco's TS enums share the same
   * numeric values, so this can be passed straight to
   * `typescriptDefaults.setCompilerOptions`).
   */
  compilerOptions: Record<string, unknown>;

  /** Project source files the user can open/edit. path -> content. */
  files: Record<string, string>;

  /**
   * Ambient/dependency type declarations (.d.ts) that make the project's
   * imports resolve, but aren't opened as editable tabs by default.
   * path -> content.
   */
  extraLibs: Record<string, string>;

  /** Path (must exist in `files`) to open by default. */
  entry?: string;
}

export function isVfsBundleV1(value: unknown): value is VfsBundleV1 {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === 1 &&
    typeof v.name === 'string' &&
    typeof v.compilerOptions === 'object' &&
    typeof v.files === 'object' &&
    typeof v.extraLibs === 'object'
  );
}
