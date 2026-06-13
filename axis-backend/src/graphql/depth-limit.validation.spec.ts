import {
  buildSchema,
  parse,
  validate,
  specifiedRules,
  GraphQLError,
} from 'graphql';
import { depthLimit } from './depth-limit.validation';

/**
 * A tiny recursive schema so we can construct queries of arbitrary depth.
 * node { child { child { ... } } }
 */
const schema = buildSchema(`
  type Node {
    id: ID!
    name: String
    child: Node
  }
  type Query {
    root: Node
  }
`);

function depthErrors(query: string, maxDepth: number): readonly GraphQLError[] {
  return validate(schema, parse(query), [
    ...specifiedRules,
    depthLimit(maxDepth),
  ]);
}

describe('depthLimit validation rule', () => {
  it('allows a query within the limit', () => {
    // root(1) → child(2) → name(3)
    const query = `query { root { child { name } } }`;
    expect(depthErrors(query, 5)).toHaveLength(0);
  });

  it('rejects a query deeper than the limit', () => {
    // root(1) → child(2) → child(3) → child(4)
    const query = `query { root { child { child { child { id } } } } }`;
    const errors = depthErrors(query, 3);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('maximum depth of 3');
  });

  it('counts depth at the exact boundary as allowed', () => {
    // root(1) → child(2) → id(3)
    const query = `query { root { child { id } } }`;
    expect(depthErrors(query, 3)).toHaveLength(0);
  });

  it('resolves fragments at their spread site', () => {
    const query = `
      query { root { ...deep } }
      fragment deep on Node { child { child { child { id } } } }
    `;
    // root(1) + child(2) + child(3) + child(4) = depth 4 > 3
    expect(depthErrors(query, 3)).toHaveLength(1);
  });

  it('does not count introspection meta-fields', () => {
    const query = `query { __schema { types { name } } }`;
    expect(depthErrors(query, 1)).toHaveLength(0);
  });
});
