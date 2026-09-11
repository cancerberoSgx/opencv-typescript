import type { Category, ExampleDef, TypingStatus } from "../lib/types";

const STATUS_DOT: Record<TypingStatus, string> = {
  full: "🟢",
  partial: "🟡",
  workaround: "🔴",
};

interface SidebarProps {
  categories: readonly Category[];
  examplesByCategory: ReadonlyMap<Category, ExampleDef[]>;
  activeId: string;
  onSelect: (id: string) => void;
}

export function Sidebar({ categories, examplesByCategory, activeId, onSelect }: SidebarProps) {
  return (
    <nav className="sidebar">
      <h1 className="sidebar-title">opencv-ts gallery</h1>
      <p className="sidebar-subtitle">Interactive demos of the OpenCV.js API surface.</p>
      {categories.map((category) => (
        <div key={category} className="sidebar-group">
          <h2>{category}</h2>
          <ul>
            {(examplesByCategory.get(category) ?? []).map((example) => (
              <li key={example.id}>
                <button
                  type="button"
                  className={example.id === activeId ? "active" : ""}
                  onClick={() => onSelect(example.id)}
                >
                  <span className="status-dot" title={example.typingStatus}>
                    {STATUS_DOT[example.typingStatus]}
                  </span>
                  {example.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
