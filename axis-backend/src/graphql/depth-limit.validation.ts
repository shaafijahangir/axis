import { GraphQLError, Kind } from 'graphql';
import type {
  ASTVisitor,
  ValidationContext,
  OperationDefinitionNode,
  SelectionSetNode,
} from 'graphql';

/**
 * Query-depth limit as a GraphQL validation rule.
 *
 * WHY: Apollo Server runs without any depth bound. A client can send a deeply
 * nested query (course → sections → enrollments → user → ... ) and force the
 * server into expensive recursive resolution — a cheap denial-of-service.
 * This rejects any operation whose selection nesting exceeds `maxDepth`
 * during validation, before a single resolver runs.
 *
 * PATTERN: Self-contained rule (no external dependency) so it can't drift
 * with Apollo/graphql major versions or trip pnpm's strict module resolution.
 * Fragments are resolved and counted at their spread site; introspection
 * meta-fields (__schema/__type) are ignored so tooling still works.
 *
 * Depth counts nested selection sets: a top-level scalar field is depth 1.
 */
export function depthLimit(maxDepth: number) {
  return (context: ValidationContext): ASTVisitor => {
    return {
      OperationDefinition: {
        leave(node: OperationDefinitionNode) {
          // Resolve fragments via the validation context — it sees the whole
          // document, so a fragment defined after the operation still counts.
          const depth = selectionSetDepth(
            node.selectionSet,
            context,
            new Set<string>(),
          );
          if (depth > maxDepth) {
            context.reportError(
              new GraphQLError(
                `Query exceeds maximum depth of ${maxDepth} (got ${depth}).`,
                { nodes: [node] },
              ),
            );
          }
        },
      },
    };
  };
}

function selectionSetDepth(
  selectionSet: SelectionSetNode | undefined,
  context: ValidationContext,
  visitedFragments: Set<string>,
): number {
  if (!selectionSet) return 0;

  let max = 0;
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      // Introspection meta-fields don't hit user resolvers — don't count them.
      if (selection.name.value.startsWith('__')) continue;
      const childDepth = selectionSetDepth(
        selection.selectionSet,
        context,
        visitedFragments,
      );
      max = Math.max(max, 1 + childDepth);
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      max = Math.max(
        max,
        selectionSetDepth(selection.selectionSet, context, visitedFragments),
      );
    } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
      const name = selection.name.value;
      // Guard against recursive fragment cycles.
      if (visitedFragments.has(name)) continue;
      const fragment = context.getFragment(name);
      if (!fragment) continue;
      visitedFragments.add(name);
      max = Math.max(
        max,
        selectionSetDepth(fragment.selectionSet, context, visitedFragments),
      );
      visitedFragments.delete(name);
    }
  }
  return max;
}
