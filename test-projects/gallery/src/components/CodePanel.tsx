import type { TypingStatus } from "../lib/types";

const STATUS_LABEL: Record<TypingStatus, string> = {
  full: "🟢 Fully typed",
  partial: "🟡 Typed, but returns `any` somewhere",
  workaround: "🔴 Needs a runtime cast - typings gap",
};

interface CodePanelProps {
  code: string;
  tutorialUrl: string;
  typingStatus: TypingStatus;
  typingNote?: string;
}

/** Shows the actual opencv-ts calls an example just ran, plus how trustworthy its typings
 * are - the whole point of these test projects is checking that DX, not just the demo. */
export function CodePanel({ code, tutorialUrl, typingStatus, typingNote }: CodePanelProps) {
  return (
    <details className="code-panel" open>
      <summary>
        Code &amp; typings <span className={`typing-badge typing-${typingStatus}`}>{STATUS_LABEL[typingStatus]}</span>
      </summary>
      <pre>
        <code>{code}</code>
      </pre>
      {typingNote && <p className="typing-note">{typingNote}</p>}
      <p className="tutorial-link">
        <a href={tutorialUrl} target="_blank" rel="noreferrer">
          OpenCV.js tutorial ↗
        </a>
      </p>
    </details>
  );
}
