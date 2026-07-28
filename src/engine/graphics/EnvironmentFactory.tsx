import { Environment } from "@react-three/drei";

import type { EnvironmentPresetDefinition } from "@/engine/environment/presets";

interface SceneEnvironmentProps {
  preset: EnvironmentPresetDefinition;
}

/** Renders the resolved environment preset's HDRI source as the scene environment. */
export function SceneEnvironment({ preset }: SceneEnvironmentProps) {
  if (preset.source.type === "file") {
    return <Environment files={preset.source.path} environmentIntensity={preset.intensity} background={false} />;
  }

  return <Environment preset={preset.source.name} environmentIntensity={preset.intensity} background={false} />;
}
