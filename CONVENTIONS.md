# NexusEd Code Conventions

> Single source of truth for how code is written in this project. Follow these patterns exactly. When in doubt, match existing code rather than inventing new patterns.

---

## File Naming

| Context | Convention | Example |
|---------|-----------|---------|
| Backend files | kebab-case | `course-section.entity.ts`, `create-course.dto.ts` |
| Frontend files | kebab-case | `feed-card.tsx`, `auth-guard.tsx` |
| React components | PascalCase exports | `feed-card.tsx` exports `FeedCard` |
| Database columns | snake_case (TypeORM converts) | `created_at`, `tenant_id` |
| GraphQL fields | camelCase | `assignmentSubmissions`, `pointsPossible` |
| GraphQL types | PascalCase | `Assignment`, `UserRole` |
| Enum values | UPPER_CASE (TypeScript) | `UserRole.STUDENT`, `AssignmentType.QUIZ` |
| Enum DB values | lowercase | `'student'`, `'quiz'` |

---

## Project Structure

### Backend Module Layout

Every NestJS module follows this structure:

```
src/modules/{feature}/
├── {feature}.module.ts        Module definition
├── {feature}.resolver.ts      GraphQL resolver (thin — calls service)
├── {feature}.service.ts       Business logic
├── dto/
│   └── {feature}.types.ts     Input types, DTOs (class-validator decorated)
└── entities/                  (only if module-specific entities)
    └── {entity}.entity.ts
```

Core entities live in `src/database/entities/`. Module-specific entities live in the module's `entities/` directory.

### Frontend Component Layout

```
src/components/{feature}/
├── {component-name}.tsx       Self-contained component
└── ...

src/lib/graphql/
├── queries/{feature}.ts       GraphQL query documents
└── mutations/{feature}.ts     GraphQL mutation documents
```

No barrel exports (`index.ts`). Import directly from the source file.

---

## Backend Patterns

### Entity Definition

```typescript
// Every entity extends BaseEntity or TenantScopedEntity
// Always add @Index decorators
// Always register enums with GraphQL

import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { TenantScopedEntity } from './base.entity';

export enum ThingStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

registerEnumType(ThingStatus, { name: 'ThingStatus' });

@ObjectType()
@Entity('things')
@Index(['tenantId'])
@Index(['parentId'])
export class Thing extends TenantScopedEntity {
  @Field()
  @Column()
  parentId: string;

  @ManyToOne(() => Parent)
  @JoinColumn({ name: 'parentId' })
  parent: Parent;

  @Field(() => ThingStatus)
  @Column({ type: 'enum', enum: ThingStatus, default: ThingStatus.ACTIVE })
  status: ThingStatus;

  // JSONB fields: nullable, typed as Record<string, any>
  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;
}
```

### Resolver Pattern

```typescript
// Thin resolvers — logic lives in services
// Always use guards
// Always pass tenantId from @CurrentUser()

@Resolver(() => Thing)
export class ThingsResolver {
  constructor(private readonly thingsService: ThingsService) {}

  @Query(() => [Thing])
  @UseGuards(JwtAuthGuard, RolesGuard)
  async things(@CurrentUser() user: User): Promise<Thing[]> {
    return this.thingsService.findAll(user.tenantId);
  }

  @Query(() => Thing)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async thing(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<Thing> {
    return this.thingsService.findById(id, user.tenantId);
  }

  @Mutation(() => Thing)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async createThing(
    @CurrentUser() user: User,
    @Args('input') input: CreateThingInput,
  ): Promise<Thing> {
    return this.thingsService.create(input, user.tenantId);
  }
}
```

### Service Pattern

```typescript
// Services own business logic
// Every query filters by tenantId
// Use transactions for multi-step writes

@Injectable()
export class ThingsService {
  constructor(
    @InjectRepository(Thing)
    private readonly repo: Repository<Thing>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(tenantId: string): Promise<Thing[]> {
    return this.repo.find({ where: { tenantId } });
  }

  async findById(id: string, tenantId: string): Promise<Thing> {
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  // Multi-step writes use transactions
  async createWithRelated(input: CreateInput, tenantId: string): Promise<Thing> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const thing = queryRunner.manager.create(Thing, { ...input, tenantId });
      await queryRunner.manager.save(thing);
      // ... additional writes
      await queryRunner.commitTransaction();
      return thing;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
```

### DTO Pattern

```typescript
// Use class-validator decorators
// InputType for GraphQL mutations
// Define in dto/ directory within the module

import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';

@InputType()
export class CreateThingInput {
  @Field()
  @IsString()
  title: string;

  @Field()
  @IsUUID()
  parentId: string;

  @Field(() => ThingStatus, { nullable: true })
  @IsOptional()
  @IsEnum(ThingStatus)
  status?: ThingStatus;
}
```

---

## Frontend Patterns

### Page Component (Server Component by Default)

```typescript
// Pages are server components unless they need hooks/state
// If they need client-side behavior, add 'use client'

export default function ThingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Things</h1>
      <ThingsList />  {/* Client component handles data fetching */}
    </div>
  );
}
```

### Client Component with GraphQL

```typescript
'use client';

import { useQuery } from '@apollo/client';
import { GET_THINGS } from '@/lib/graphql/queries/things';

export function ThingsList() {
  const { data, loading, error } = useQuery(GET_THINGS);

  if (loading) return <ThingsListSkeleton />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <div className="space-y-4">
      {data.things.map((thing) => (
        <ThingCard key={thing.id} thing={thing} />
      ))}
    </div>
  );
}
```

### Form Component

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@apollo/client';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function CreateThingForm({ onSuccess }: { onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const [createThing, { loading, error }] = useMutation(CREATE_THING, {
    refetchQueries: [{ query: GET_THINGS }],
    onCompleted: onSuccess,
  });

  const onSubmit = (data: FormData) => {
    createThing({ variables: { input: data } });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register('title')} />
        {errors.title && (
          <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Something went wrong'}
        </p>
      )}
      <Button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create'}
      </Button>
    </form>
  );
}
```

### GraphQL Query/Mutation Files

```typescript
// src/lib/graphql/queries/things.ts
import { gql } from '@apollo/client';

export const GET_THINGS = gql`
  query GetThings {
    things {
      id
      title
      status
      createdAt
    }
  }
`;

// src/lib/graphql/mutations/things.ts
import { gql } from '@apollo/client';

export const CREATE_THING = gql`
  mutation CreateThing($input: CreateThingInput!) {
    createThing(input: $input) {
      id
      title
      status
    }
  }
`;
```

---

## Error Handling

### Backend
- Services throw `NotFoundException`, `ForbiddenException`, `BadRequestException` from `@nestjs/common`
- TypeORM's `findOneOrFail` throws automatically on missing entities
- Transactions catch, rollback, and re-throw

### Frontend
- Never use `catch (err: any)`. Always narrow:
  ```typescript
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Operation failed';
    setError(message);
  }
  ```
- Display user-facing errors via toast (sonner) or inline red text
- Error boundaries at route group level (`(dashboard)/error.tsx`, `(auth)/error.tsx`)

---

## Commit Messages

Enforced by commitlint:

```
type(scope): description

type:  feat | fix | refactor | docs | test | chore
scope: backend | frontend | root
```

Examples:
```
feat(backend): add AI course planner service
fix(frontend): correct feed card date formatting
refactor(backend): extract base entity classes
docs(root): add architecture documentation
test(backend): add governance service unit tests
```

Always end with:
```
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

---

## What NOT to Do

| Rule | Why |
|------|-----|
| No `any` types | Use proper interfaces. Complex? Define one. |
| No barrel exports (`index.ts` re-exports) | Import from source files directly |
| No Prisma | We use TypeORM (migrating to Drizzle later) |
| No new REST endpoints | Everything except auth goes through GraphQL |
| No CSS modules or styled-components | Tailwind CSS only |
| No skipping tenant scope | Every query must filter by tenantId |
| No `synchronize: true` in production | Dev only |
| No direct `@anthropic-ai/sdk` imports | Go through AiProvider abstraction |
| No `catch (err: any)` | Use type narrowing |

---

*Last updated: 2026-02-17*
*Companion docs: [ARCHITECTURE.md](./ARCHITECTURE.md) | [DATA-MODEL.md](./DATA-MODEL.md) | [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md)*
