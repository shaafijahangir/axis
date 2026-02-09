/**
 * Mock Repository Factory
 *
 * WHY: TypeORM repositories are the primary database access pattern.
 * These mocks let us test services without a real database connection.
 *
 * PATTERN: Mock Object — provides a configurable test double.
 */

import { Repository, SelectQueryBuilder, ObjectLiteral } from 'typeorm';

export type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

/**
 * Create a mock repository with common methods pre-mocked.
 * Override specific methods in your tests as needed.
 */
export function createMockRepository<
  T extends ObjectLiteral,
>(): MockRepository<T> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findOneOrFail: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    findAndCount: jest.fn(),
    preload: jest.fn(),
    remove: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
  };
}

/**
 * Create a mock SelectQueryBuilder for complex queries.
 * Chain methods return the same builder instance for fluent API.
 */
export function createMockQueryBuilder<T extends ObjectLiteral>(): Partial<
  Record<keyof SelectQueryBuilder<T>, jest.Mock>
> & {
  _chainable: jest.Mock;
} {
  const chainable = jest.fn();

  const builder: any = {
    select: chainable,
    addSelect: chainable,
    where: chainable,
    andWhere: chainable,
    orWhere: chainable,
    leftJoin: chainable,
    leftJoinAndSelect: chainable,
    innerJoin: chainable,
    innerJoinAndSelect: chainable,
    orderBy: chainable,
    addOrderBy: chainable,
    take: chainable,
    skip: chainable,
    limit: chainable,
    offset: chainable,
    groupBy: chainable,
    setParameter: chainable,
    setParameters: chainable,
    // Terminal methods return results
    getOne: jest.fn(),
    getOneOrFail: jest.fn(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
    getCount: jest.fn(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
    execute: jest.fn(),
    _chainable: chainable,
  };

  // Make chainable methods return the builder itself
  chainable.mockReturnValue(builder);

  return builder;
}

/**
 * Configure a mock repository to return a mock query builder.
 * Useful for testing services that build complex queries.
 */
export function setupQueryBuilder<T extends ObjectLiteral>(
  repo: MockRepository<T>,
  builder: ReturnType<typeof createMockQueryBuilder<T>>,
): void {
  (repo.createQueryBuilder as jest.Mock).mockReturnValue(builder);
}
