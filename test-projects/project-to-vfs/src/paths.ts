import { relative, sep } from 'node:path';

/** Absolute disk path -> POSIX virtual path rooted at `/`, relative to `projectRoot`. */
export function toVirtual(absPath: string, projectRoot: string): string {
  const rel = relative(projectRoot, absPath);
  return '/' + rel.split(sep).join('/');
}
