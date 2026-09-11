export interface ManifestEntry {
  name: string;
  url: string;
}

export function ProjectPicker({
  manifest,
  onLoadUrl,
  onLoadFile,
}: {
  manifest: ManifestEntry[];
  onLoadUrl: (url: string) => void;
  onLoadFile: (file: File) => void;
}) {
  return (
    <div className="project-picker">
      <select
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) onLoadUrl(e.target.value);
        }}
      >
        <option value="" disabled>
          {manifest.length ? 'Load sample project…' : 'No sample projects found'}
        </option>
        {manifest.map((m) => (
          <option key={m.url} value={m.url}>
            {m.name}
          </option>
        ))}
      </select>
      <label className="upload-btn">
        Upload VFS JSON
        <input
          type="file"
          accept="application/json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onLoadFile(file);
            e.target.value = '';
          }}
        />
      </label>
    </div>
  );
}
