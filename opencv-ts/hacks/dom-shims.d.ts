// Hand-maintained, NOT generated. `imread`/`imshow`/`VideoCapture` (see mat.d.ts) accept
// browser DOM elements (`HTMLElement`, `HTMLVideoElement`) - types that exist only when a
// consumer's tsconfig has `"DOM"` in `lib`. A Node consumer (a CLI, a server - see
// test-projects/node1's tsconfig, `lib: ["ES2022"]`, no DOM) has no such global in scope,
// so these would otherwise be flat-out unresolved names, forcing `skipLibCheck: true` on
// every consumer just to get past a browser-only corner of the API it may not even use.
//
// Declaring them here as empty global interfaces is a no-op merge when the real "DOM" lib
// IS present (TS interface merging is additive - an empty interface body contributes zero
// members to the real one) and gives them a real, structurally-open type when it isn't -
// exactly what a Node consumer needs, since it can never construct one of these anyway and
// only needs the name to resolve.
declare global {
  interface HTMLElement {}
  interface HTMLVideoElement {}
}

export {};
