"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCustomizerStore } from "@/stores/customizer-store";

/** "Preset Saving (session only)" — the store already only persists to `sessionStorage` (see customizer-store.ts), so nothing extra is needed here to make saving session-scoped; this component is just the UI for it. */
export function PresetSaveControls() {
  const [name, setName] = useState("");
  const savedPresets = useCustomizerStore((state) => state.savedPresets);
  const savePreset = useCustomizerStore((state) => state.savePreset);
  const loadPreset = useCustomizerStore((state) => state.loadPreset);
  const deletePreset = useCustomizerStore((state) => state.deletePreset);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    savePreset(trimmed);
    setName("");
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="preset-name" className="text-foreground text-sm font-medium">
        Save this look
      </label>
      <div className="flex gap-2">
        <Input
          id="preset-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSave();
          }}
          placeholder="Name this preset…"
          maxLength={40}
        />
        <Button variant="secondary" onClick={handleSave} disabled={!name.trim()}>
          Save
        </Button>
      </div>
      {savedPresets.length > 0 && (
        <ul className="mt-1 flex flex-col gap-1">
          {savedPresets.map((preset) => (
            <li key={preset.id} className="flex items-center justify-between gap-2 text-sm">
              <button
                type="button"
                onClick={() => loadPreset(preset.id)}
                className="hover:text-brand-accent-600 dark:hover:text-brand-accent-400 min-h-11 flex-1 truncate text-left"
              >
                {preset.name}
              </button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete preset "${preset.name}"`}
                onClick={() => deletePreset(preset.id)}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
