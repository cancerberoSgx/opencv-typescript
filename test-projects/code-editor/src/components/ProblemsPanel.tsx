import { useEffect, useState } from 'react';
import * as monaco from 'monaco-editor';

const SEVERITY_LABEL: Record<number, string> = {
  [monaco.MarkerSeverity.Error]: 'error',
  [monaco.MarkerSeverity.Warning]: 'warning',
  [monaco.MarkerSeverity.Info]: 'info',
  [monaco.MarkerSeverity.Hint]: 'hint',
};

export function ProblemsPanel({
  onJump,
}: {
  onJump: (path: string, line: number, column: number) => void;
}) {
  const [markers, setMarkers] = useState<monaco.editor.IMarker[]>([]);

  useEffect(() => {
    const update = () => setMarkers(monaco.editor.getModelMarkers({}));
    update();
    const disposable = monaco.editor.onDidChangeMarkers(update);
    return () => disposable.dispose();
  }, []);

  return (
    <div className="problems-panel">
      <div className="problems-header">Problems ({markers.length})</div>
      <div className="problems-list">
        {markers.map((m, i) => (
          <div
            key={i}
            className={`problem-row sev-${SEVERITY_LABEL[m.severity] ?? 'info'}`}
            onClick={() => onJump(m.resource.path, m.startLineNumber, m.startColumn)}
          >
            <span className="problem-loc">
              {m.resource.path}:{m.startLineNumber}
            </span>
            <span className="problem-msg">{m.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
