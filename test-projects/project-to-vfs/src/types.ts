/**
 * VFS bundle contract — shared with `test-projects/code-editor` (consumer).
 * Kept in sync manually with `code-editor/src/vfs/types.ts`; bump `version`
 * on breaking changes to either side.
 */
export interface VfsBundleV1 {
  version: 1;
  name: string;
  compilerOptions: Record<string, unknown>;
  files: Record<string, string>;
  extraLibs: Record<string, string>;
  entry?: string;
}
