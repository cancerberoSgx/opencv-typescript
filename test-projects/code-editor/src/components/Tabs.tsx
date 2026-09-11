export function Tabs({
  open,
  active,
  onSelect,
  onClose,
}: {
  open: string[];
  active: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}) {
  return (
    <div className="tabs">
      {open.map((path) => {
        const name = path.split('/').pop();
        return (
          <div
            key={path}
            className={`tab${active === path ? ' active' : ''}`}
            onClick={() => onSelect(path)}
            title={path}
          >
            <span>{name}</span>
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onClose(path);
              }}
              aria-label={`Close ${name}`}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
