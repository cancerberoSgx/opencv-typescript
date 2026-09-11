import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { toUri } from '../vfs/applyVfs';

/**
 * Singleton handle to the (single, for this prototype) live editor instance,
 * so code outside the component tree — e.g. the problems panel — can reveal
 * a position without threading an editor ref through props.
 */
export const activeEditor: { current: monaco.editor.IStandaloneCodeEditor | null } = {
  current: null,
};

/** A single Monaco editor instance whose model swaps when `path` changes. */
export function EditorPane({ path }: { path: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const editor = monaco.editor.create(containerRef.current, {
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      theme: 'vs-dark',
    });
    editorRef.current = editor;
    activeEditor.current = editor;
    return () => {
      editor.dispose();
      editorRef.current = null;
      activeEditor.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (!path) {
      editor.setModel(null);
      return;
    }
    const model = monaco.editor.getModel(toUri(path));
    if (model) editor.setModel(model);
  }, [path]);

  return <div ref={containerRef} className="editor-pane" />;
}
