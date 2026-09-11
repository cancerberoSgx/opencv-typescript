import ts from "typescript";

export interface RunResult {
  ok: boolean;
  /** Wall-clock time, in milliseconds, to transpile + run (or fail) the code. */
  timeMs: number;
  error?: string;
}

/**
 * Strips types from `sourceTs` (via the real TypeScript compiler - the same one powering
 * Monaco's language service, just run synchronously on the main thread here rather than in
 * its worker) and runs the result as an ES module, via a Blob URL + dynamic `import()`.
 *
 * A Blob-URL module (rather than e.g. a plain `new Function(...)`/`eval` string, what
 * mirada-ts-playground's own `onExecuteRequest.ts` used) gets its own module scope for free
 * - top-level `let`/`const`/`function` in one example run can't collide with another's - and
 * top-level `await` just works, both useful given every example here is one big top-level
 * `(async () => { ... })()` IIFE. All the examples' state (`cv`, and the small
 * `fromUrl`/`loadDataFile`/`toRgba`/`CameraHelper`/`sleep` runtime - see
 * src/opencv/playgroundHelpers.ts) is reached as an ordinary global, exactly like any other
 * browser global a module-scoped script can see, so none of that needs to be threaded
 * through here explicitly.
 *
 * One consequence of that fire-and-forget IIFE shape: `await import(blobUrl)` only waits for
 * the module's synchronous top level to run (which just kicks the IIFE off and returns
 * immediately) - it does *not* wait for the IIFE's own promise, so a failure inside it (e.g.
 * an `await fromUrl(...)` further down, or a typo'd runtime call) throws *after* this
 * function has already returned `{ ok: true }`. `onLateError`, if given, is called if that
 * happens - via `window`'s `error`/`unhandledrejection` events, the only way to observe an
 * error from a promise nothing here is holding a reference to. Only the *next* `runExample()`
 * call stops listening for a given run's late errors (there's no earlier, reliable "this
 * example is done" signal to detach on - some examples intentionally run for seconds, e.g.
 * trackbar.example.ts's `sleep(12000)`).
 */
let stopListeningForLateErrors: (() => void) | undefined;

export async function runExample(sourceTs: string, onLateError?: (message: string) => void): Promise<RunResult> {
  stopListeningForLateErrors?.();
  const t0 = performance.now();
  const { outputText, diagnostics } = ts.transpileModule(sourceTs, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      // No `jsx` option: examples are plain .ts, never .tsx, and `ts.JsxEmit.None` (0) is
      // the "not configured" sentinel, not a real mode - explicitly setting it is what
      // this option's own validation rejects ("must be 'preserve', 'react-native', ...").
    },
    reportDiagnostics: true,
  });

  const syntaxError = diagnostics?.find((d) => d.category === ts.DiagnosticCategory.Error);
  if (syntaxError) {
    return {
      ok: false,
      timeMs: performance.now() - t0,
      error: ts.flattenDiagnosticMessageText(syntaxError.messageText, "\n"),
    };
  }

  const handleRejection = (e: PromiseRejectionEvent) => onLateError?.(formatThrown(e.reason));
  const handleError = (e: ErrorEvent) => {
    onLateError?.(formatThrown(e.error ?? e.message));
    e.preventDefault();
  };
  window.addEventListener("unhandledrejection", handleRejection);
  window.addEventListener("error", handleError);
  stopListeningForLateErrors = () => {
    window.removeEventListener("unhandledrejection", handleRejection);
    window.removeEventListener("error", handleError);
  };

  const blobUrl = URL.createObjectURL(new Blob([outputText], { type: "text/javascript" }));
  try {
    await import(/* @vite-ignore */ blobUrl);
    return { ok: true, timeMs: performance.now() - t0 };
  } catch (err) {
    return { ok: false, timeMs: performance.now() - t0, error: formatThrown(err) };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

function formatThrown(err: unknown): string {
  return err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
}
