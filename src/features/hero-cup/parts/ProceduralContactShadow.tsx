import { ContactShadows } from "@react-three/drei";
import { forwardRef } from "react";
import type { Group } from "three";

import type { CupPartProps } from "../registry/types";

export const ProceduralContactShadow = forwardRef<Group, CupPartProps>(function ProceduralContactShadow(
  { position, rotation, scale, visible },
  ref,
) {
  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale} visible={visible}>
      <ContactShadows position={[0, 0.001, 0]} opacity={0.55} blur={2.2} far={1.4} scale={3.2} frames={visible === false ? 1 : Infinity} />
    </group>
  );
});
