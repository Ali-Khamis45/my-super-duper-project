import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // eslint-config-next bundles only a 6-rule subset of jsx-a11y; the full
  // recommended set is what docs/06_CODING_STANDARDS.md's accessibility
  // section actually relies on being enforced at lint time. Only the rules
  // are merged (not `plugins`) since nextVitals already registers the
  // "jsx-a11y" plugin — redefining it is a flat-config error.
  {
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
  // React Compiler-aware react-hooks rules (immutability/purity) assume
  // React owns every mutable value. React Three Fiber's entire imperative
  // model — mutating Object3D/camera refs inside useFrame/useEffect for
  // per-frame animation — deliberately steps outside that assumption for
  // performance, per R3F's own docs. Scoped off wherever that pattern is
  // the whole point: the engine's 3D-facing modules and the hero-cup feature.
  {
    files: ["src/engine/camera/**/*.{ts,tsx}", "src/engine/devpanel/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored, unmodified third-party decoder assets (Draco/Basis-KTX2),
    // self-hosted per docs/adr/0009-asset-compression-pipeline.md — not
    // this project's code, never linted or formatted.
    "public/draco/**",
    "public/basis/**",
  ]),
]);

export default eslintConfig;
