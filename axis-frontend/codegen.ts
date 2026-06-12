import type { CodegenConfig } from '@graphql-codegen/cli';

/**
 * GraphQL codegen — end-to-end type safety from backend schema to frontend
 * `useQuery` / `useMutation` calls.
 *
 * WHY client-preset: It's the current Apollo Client 4 standard. It emits a
 * single `graphql(...)` helper that returns TypedDocumentNode, so every Apollo
 * hook is fully typed from the operation's response shape down to nullability.
 *
 * SCHEMA SOURCE: The backend already emits `axis-backend/src/schema.gql` on
 * every dev-server startup (NestJS code-first via `@nestjs/graphql`). We read
 * that file directly — no network round-trip, always in sync with the running
 * backend, generated output diffs cleanly in PRs.
 *
 * MIGRATION: This is additive. Existing `import { gql } from '@apollo/client'`
 * call sites continue to work (untyped). New / converted call sites use
 * `import { graphql } from '@/lib/graphql/__generated__'` and get full
 * inference. There is no flag day.
 */
const config: CodegenConfig = {
  schema: '../axis-backend/src/schema.gql',
  documents: [
    'src/**/*.{ts,tsx}',
    // Skip the generated dir itself to avoid feedback loops on incremental runs.
    '!src/lib/graphql/__generated__/**/*',
  ],
  generates: {
    'src/lib/graphql/__generated__/': {
      preset: 'client',
      presetConfig: {
        // The default `gql` fragment-masking adds an opaque wrapper around
        // fragment results. We don't use fragments enough to justify the
        // ergonomic cost — turn it off.
        fragmentMasking: false,
      },
      config: {
        // Make every nullable field actually `T | null` (not `T | null | undefined`)
        // so consumers can branch on a single sentinel.
        avoidOptionals: { field: true },
      },
    },
  },
  ignoreNoDocuments: true,
};

export default config;
