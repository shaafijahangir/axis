import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, Int } from '@nestjs/graphql';
import { TenantScopedEntity } from '../../../database/entities/base.entity';
import { User } from '../../../database/entities/user.entity';
import { Course } from '../../../database/entities/course.entity';

/**
 * Custom agent definition stored in the database.
 *
 * WHY: Built-in agents (study-coach, feedback-copilot) are hardcoded
 * in TypeScript files. Custom agents let instructors create course-specific
 * AI assistants without code changes — the same declarative pattern, but
 * persisted to the DB.
 *
 * PATTERN: Mirrors AgentDefinition interface but as a TypeORM entity.
 * The CustomAgentService converts these to AgentDefinition at runtime
 * so the AgentExecutorService handles them identically to built-in agents.
 *
 * TRADEOFF: Custom agents use the same tool set as built-in agents.
 * Instructors select from existing tools rather than defining new ones.
 * This keeps the security model intact — governance still checks every tool call.
 */
@ObjectType()
@Entity('custom_agents')
@Index(['tenantId'])
@Index(['createdById'])
@Index(['tenantId', 'slug'], { unique: true })
export class CustomAgent extends TenantScopedEntity {
  /**
   * URL-safe unique identifier within the tenant.
   * Auto-generated from displayName on creation.
   * Used as the agentType in conversations.
   * Prefixed with 'custom-' to avoid collisions with built-in agents.
   */
  @Field()
  @Column({ type: 'varchar', length: 100 })
  slug: string;

  @Field()
  @Column({ type: 'varchar', length: 100 })
  displayName: string;

  @Field()
  @Column({ type: 'text' })
  description: string;

  /**
   * The system prompt that defines this agent's behavior.
   * Instructors craft this to give the agent a specific personality,
   * focus area, and set of rules for their course context.
   */
  @Field()
  @Column({ type: 'text' })
  systemPrompt: string;

  /**
   * Tool names this agent is allowed to use.
   * Must be a subset of the tools registered in ToolRegistry.
   */
  @Field(() => [String])
  @Column({ type: 'jsonb', default: [] })
  tools: string[];

  /**
   * Which user roles can interact with this agent.
   * e.g. ['student', 'ta'] or ['instructor', 'admin']
   */
  @Field(() => [String])
  @Column({ type: 'jsonb', default: ['student'] })
  allowedRoles: string[];

  @Field(() => Int)
  @Column({ type: 'int', default: 10 })
  maxTurns: number;

  @Field()
  @Column({ type: 'varchar', default: 'claude-sonnet-4-20250514' })
  model: string;

  @Field()
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Optional course scope. When set, this agent only appears
   * for students enrolled in this course.
   * When null, the agent is available to all users in the tenant.
   */
  @Field({ nullable: true })
  @Column({ nullable: true })
  courseId: string | null;

  @ManyToOne(() => Course, { nullable: true })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  /**
   * The instructor or admin who created this agent.
   */
  @Field()
  @Column()
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;
}
