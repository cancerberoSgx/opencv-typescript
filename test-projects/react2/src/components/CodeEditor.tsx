// Minimal Monaco import: the bare `monaco-editor` package barrel-exports every language mode
// (100+ chunks, ~8MB) it ships, of which this playground only ever needs one - the editor
// core plus the TypeScript contribution (which is also what registers
// `monaco.languages.typescript.typescriptDefaults`, used by setupOpenCvTypes.ts) pull in
// just those two.
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/language/typescript/monaco.contribution";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { installOpenCvTypesForMonaco } from "../editor/setupOpenCvTypes";

export interface CodeEditorHandle {
  /** The editor's current text - what Run actually executes, not necessarily `source`. */
  getValue(): string;
  /** Discards edits, reloading the example's original `source` into its model. */
  reset(): void;
}

export interface CodeEditorProps {
  /** Unique per example - keys its own Monaco model, so switching examples and back
   * preserves in-progress edits instead of reloading `source` every time. */
  exampleId: string;
  source: string;
}

// One model per example, created lazily and kept for the component's lifetime (there are
// only a handful of examples, so this never grows large enough to need eviction) - see
// CodeEditorProps.exampleId.
const models = new Map<string, monaco.editor.ITextModel>();

function getOrCreateModel(exampleId: string, source: string): monaco.editor.ITextModel {
  let model = models.get(exampleId);
  if (!model) {
    const uri = monaco.Uri.parse(`file:///examples/${exampleId}.ts`);
    model = monaco.editor.createModel(source, "typescript", uri);
    models.set(exampleId, model);
  }
  return model;
}

/** A Monaco editor, typechecking and autocompleting against opencv-ts - see
 * src/editor/setupOpenCvTypes.ts. Uncontrolled: reads its value imperatively via `ref`
 * (see CodeEditorHandle) rather than on every keystroke, since nothing needs to react to
 * the text changing live - only Run (and Reset) ever need the current value. */
export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
  { exampleId, source },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    installOpenCvTypesForMonaco();
    if (!containerRef.current) return;
    const editor = monaco.editor.create(containerRef.current, {
      automaticLayout: true,
      minimap: { enabled: false },
      theme: "vs-dark",
      fontSize: 13,
      tabSize: 2,
    });
    editorRef.current = editor;
    return () => {
      editor.dispose();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    editorRef.current?.setModel(getOrCreateModel(exampleId, source));
  }, [exampleId, source]);

  useImperativeHandle(
    ref,
    () => ({
      getValue: () => editorRef.current?.getValue() ?? source,
      reset: () => {
        models.get(exampleId)?.setValue(source);
      },
    }),
    [exampleId, source],
  );

  return <div ref={containerRef} className="code-editor" />;
});
