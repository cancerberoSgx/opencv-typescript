import { useCallback, useEffect, useState } from 'react';
import { FileTree } from './components/FileTree';
import { Tabs } from './components/Tabs';
import { EditorPane, activeEditor } from './components/EditorPane';
import { ProblemsPanel } from './components/ProblemsPanel';
import { ProjectPicker, type ManifestEntry } from './components/ProjectPicker';
import { applyVfsToMonaco } from './vfs/applyVfs';
import { isVfsBundleV1, type VfsBundleV1 } from './vfs/types';

export default function App() {
  const [manifest, setManifest] = useState<ManifestEntry[]>([]);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/projects/manifest.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: ManifestEntry[]) => setManifest(list))
      .catch(() => setManifest([]));
  }, []);

  const loadBundle = useCallback((bundle: VfsBundleV1) => {
    const loadedPaths = applyVfsToMonaco(bundle);
    setPaths(loadedPaths);
    setProjectName(bundle.name);
    setError(null);
    const entry = bundle.entry && loadedPaths.includes(bundle.entry) ? bundle.entry : loadedPaths[0] ?? null;
    setOpenTabs(entry ? [entry] : []);
    setActive(entry);
  }, []);

  const loadFromUrl = useCallback(
    (url: string) => {
      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          if (!isVfsBundleV1(data)) throw new Error('Not a valid VFS bundle (v1)');
          loadBundle(data);
        })
        .catch((e) => setError(String(e)));
    },
    [loadBundle],
  );

  const loadFromFile = useCallback(
    (file: File) => {
      file
        .text()
        .then((text) => {
          const data = JSON.parse(text);
          if (!isVfsBundleV1(data)) throw new Error('Not a valid VFS bundle (v1)');
          loadBundle(data);
        })
        .catch((e) => setError(String(e)));
    },
    [loadBundle],
  );

  const openFile = useCallback((path: string) => {
    setOpenTabs((tabs) => (tabs.includes(path) ? tabs : [...tabs, path]));
    setActive(path);
  }, []);

  const closeTab = useCallback(
    (path: string) => {
      setOpenTabs((tabs) => {
        const next = tabs.filter((t) => t !== path);
        if (active === path) {
          setActive(next[next.length - 1] ?? null);
        }
        return next;
      });
    },
    [active],
  );

  const jumpToProblem = useCallback(
    (path: string, line: number, column: number) => {
      openFile(path);
      // setModel happens in an effect after `active` changes, so defer the
      // cursor move to the next tick.
      setTimeout(() => {
        activeEditor.current?.revealLineInCenter(line);
        activeEditor.current?.setPosition({ lineNumber: line, column });
        activeEditor.current?.focus();
      }, 0);
    },
    [openFile],
  );

  return (
    <div className="app">
      <div className="topbar">
        <span className="brand">code-editor</span>
        {projectName && <span className="project-name">{projectName}</span>}
        <ProjectPicker manifest={manifest} onLoadUrl={loadFromUrl} onLoadFile={loadFromFile} />
        {error && <span className="error-msg">{error}</span>}
      </div>
      <div className="body">
        <div className="sidebar">
          <FileTree paths={paths} activePath={active} onOpen={openFile} />
        </div>
        <div className="main">
          <Tabs open={openTabs} active={active} onSelect={setActive} onClose={closeTab} />
          <EditorPane path={active} />
        </div>
      </div>
      <ProblemsPanel onJump={jumpToProblem} />
    </div>
  );
}
