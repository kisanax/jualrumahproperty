import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Lain — bukan kode produksi:
    "mockups/**", // output regenerasi gen-watermark-* (arsip lama di docs/archive/)
    "docs/archive/**", // arsip bekas kerja — beku, bukan kode aktif
    "public/sw.js", // hasil build service worker
    "scripts/**", // skrip ops/tooling (Node, boleh pakai require)
  ]),
]);

export default eslintConfig;
