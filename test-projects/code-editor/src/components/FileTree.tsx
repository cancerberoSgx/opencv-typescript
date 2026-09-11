import { useMemo } from 'react';

interface TreeNode {
  name: string;
  path: string;
  isFile: boolean;
  children: Map<string, TreeNode>;
}

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: '', path: '', isFile: false, children: new Map() };
  for (const path of paths) {
    const parts = path.split('/').filter(Boolean);
    let node = root;
    let acc = '';
    parts.forEach((part, i) => {
      acc += `/${part}`;
      const isFile = i === parts.length - 1;
      let child = node.children.get(part);
      if (!child) {
        child = { name: part, path: acc, isFile, children: new Map() };
        node.children.set(part, child);
      }
      node = child;
    });
  }
  return root;
}

function sortEntries(children: Map<string, TreeNode>): TreeNode[] {
  return [...children.values()].sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}

function Node({
  node,
  depth,
  activePath,
  onOpen,
}: {
  node: TreeNode;
  depth: number;
  activePath: string | null;
  onOpen: (path: string) => void;
}) {
  if (node.isFile) {
    return (
      <div
        className={`tree-row tree-file${activePath === node.path ? ' active' : ''}`}
        style={{ paddingLeft: depth * 14 + 8 }}
        onClick={() => onOpen(node.path)}
      >
        {node.name}
      </div>
    );
  }
  return (
    <details open>
      <summary className="tree-row tree-folder" style={{ paddingLeft: depth * 14 + 8 }}>
        {node.name || '/'}
      </summary>
      {sortEntries(node.children).map((child) => (
        <Node key={child.path} node={child} depth={depth + 1} activePath={activePath} onOpen={onOpen} />
      ))}
    </details>
  );
}

export function FileTree({
  paths,
  activePath,
  onOpen,
}: {
  paths: string[];
  activePath: string | null;
  onOpen: (path: string) => void;
}) {
  const root = useMemo(() => buildTree(paths), [paths]);
  return (
    <div className="file-tree">
      {sortEntries(root.children).map((child) => (
        <Node key={child.path} node={child} depth={0} activePath={activePath} onOpen={onOpen} />
      ))}
    </div>
  );
}
