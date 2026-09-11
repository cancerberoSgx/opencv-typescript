import type { Control, Params, ParamValue } from "../lib/types";

interface ControlsPanelProps {
  controls: readonly Control[];
  values: Params;
  onChange: (key: string, value: ParamValue) => void;
}

/** Renders one input per control descriptor and reports changes back up as plain
 * key/value pairs - examples never see DOM events, only the resulting Params. */
export function ControlsPanel({ controls, values, onChange }: ControlsPanelProps) {
  if (controls.length === 0) {
    return <p className="controls-empty">This example has no adjustable parameters.</p>;
  }

  return (
    <div className="controls">
      {controls.map((control) => {
        switch (control.kind) {
          case "slider": {
            const value = values[control.key] as number;
            return (
              <label key={control.key} className="control control-slider">
                <span className="control-label">
                  {control.label}
                  <span className="control-value">
                    {value}
                    {control.unit ?? ""}
                  </span>
                </span>
                <input
                  type="range"
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  value={value}
                  onChange={(e) => onChange(control.key, Number(e.target.value))}
                />
              </label>
            );
          }
          case "select": {
            const value = values[control.key] as string;
            return (
              <label key={control.key} className="control control-select">
                <span className="control-label">{control.label}</span>
                <select value={value} onChange={(e) => onChange(control.key, e.target.value)}>
                  {control.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          }
          case "checkbox": {
            const value = values[control.key] as boolean;
            return (
              <label key={control.key} className="control control-checkbox">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => onChange(control.key, e.target.checked)}
                />
                <span className="control-label">{control.label}</span>
              </label>
            );
          }
        }
      })}
    </div>
  );
}
