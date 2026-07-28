import type { ComponentType } from "react";

/**
 * The generalized name x implementation registry, factored out of
 * `features/hero-cup/registry/cupPartRegistry.ts` so a second domain
 * (ingredients, Milestone 5; any future modeled part set) reuses the same
 * shape instead of hand-rolling it again. See docs/17_ZERO_REWRITE_POLICY.md
 * and docs/20_PLUGIN_API.md — a new registry instance is the sanctioned
 * extension path, not a manager rewrite.
 */
export type PartImplementation = "procedural" | "model";

export interface PartRegistry<TName extends string, TProps> {
  register(name: TName, implementation: PartImplementation, component: ComponentType<TProps>): void;
  resolve(name: TName, implementation?: PartImplementation): ComponentType<TProps>;
}

export function createPartRegistry<TName extends string, TProps>(): PartRegistry<TName, TProps> {
  const registry = new Map<TName, Partial<Record<PartImplementation, ComponentType<TProps>>>>();

  return {
    register(name, implementation, component) {
      const entry = registry.get(name) ?? {};
      entry[implementation] = component;
      registry.set(name, entry);
    },
    resolve(name, implementation = "procedural") {
      const entry = registry.get(name);
      const component = entry?.[implementation] ?? entry?.procedural;
      if (!component) {
        throw new Error(`No implementation registered for part "${name}".`);
      }
      return component;
    },
  };
}
