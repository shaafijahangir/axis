import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // WCAG 2.1 AA: Strict accessibility rules
  // NOTE: jsx-a11y plugin is already registered by eslint-config-next/core-web-vitals.
  // We only override rules here to enforce stricter standards.
  {
    rules: {
      // Enforce alt text on images
      "jsx-a11y/alt-text": "error",
      // Ensure anchors have content
      "jsx-a11y/anchor-has-content": "error",
      // Anchors must be valid (no href="#")
      "jsx-a11y/anchor-is-valid": "error",
      // ARIA props must be valid
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-proptypes": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      // Click events must have keyboard equivalents
      "jsx-a11y/click-events-have-key-events": "error",
      // Headings must have content
      "jsx-a11y/heading-has-content": "error",
      // <html> must have lang
      "jsx-a11y/html-has-lang": "error",
      // Interactive elements must be focusable
      "jsx-a11y/interactive-supports-focus": "error",
      // Labels must have associated controls (allow nesting or htmlFor)
      "jsx-a11y/label-has-associated-control": ["error", {
        assert: "either",
        controlComponents: ["Input", "Select", "Textarea"],
        depth: 3,
      }],
      // No autofocus (disorienting for screen readers)
      "jsx-a11y/no-autofocus": "warn",
      // No redundant roles
      "jsx-a11y/no-redundant-roles": "error",
      // Static elements should not have interactive handlers without role
      "jsx-a11y/no-static-element-interactions": "error",
      // Non-interactive elements should not have tabindex
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      // Require role prop on non-semantic interactive elements
      "jsx-a11y/role-has-required-aria-props": "error",
      "jsx-a11y/role-supports-aria-props": "error",
      // Scope attribute only on <th>
      "jsx-a11y/scope": "error",
      // tabIndex should not be > 0
      "jsx-a11y/tabindex-no-positive": "error",
    },
  },
  // shadcn/ui component overrides — generic wrappers pass a11y props via spread
  {
    files: ["src/components/ui/**/*.tsx"],
    rules: {
      "jsx-a11y/label-has-associated-control": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // ARCH-007: GraphQL codegen output is regenerated on every `pnpm codegen`.
    // Linting it produces noise about the generator's own /* eslint-disable */
    // headers; the file is read-only as far as humans are concerned.
    "src/lib/graphql/__generated__/**",
  ]),
]);

export default eslintConfig;
