import { useRef } from "react";
import { SOURCE_SCENES } from "../lib/sources";

interface SourcePickerProps {
  sceneId: string;
  onSceneChange: (id: string) => void;
  onUpload: (file: File) => void;
}

/** Lets the user pick one of the built-in synthetic scenes or upload their own image as
 * the input for whichever example is active. */
export function SourcePicker({ sceneId, onSceneChange, onUpload }: SourcePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="source-picker">
      <span className="source-picker-label">Source</span>
      <div className="source-picker-options">
        {SOURCE_SCENES.map((scene) => (
          <button
            key={scene.id}
            type="button"
            className={sceneId === scene.id ? "active" : ""}
            onClick={() => onSceneChange(scene.id)}
          >
            {scene.label}
          </button>
        ))}
        <button type="button" onClick={() => fileInputRef.current?.click()}>
          Upload image…
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
