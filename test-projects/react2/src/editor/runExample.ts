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
 */
export async function runExample(sourceTs: string): Promise<RunResult> {
  const t0 = performance.now();
  const { outputText, diagnostics } = ts.transpileModule(sourceTs, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.None,
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

  const blobUrl = URL.createObjectURL(new Blob([outputText], { type: "text/javascript" }));
  try {
    await import(/* @vite-ignore */ blobUrl);
    return { ok: true, timeMs: performance.now() - t0 };
  } catch (err) {
    const message = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
    return { ok: false, timeMs: performance.now() - t0, error: message };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}
