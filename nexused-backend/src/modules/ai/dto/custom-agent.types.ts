import { ObjectType, Field, Int, InputType } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTOs for the Agent Builder feature.
 *
 * WHY: Instructors need a structured API to create, update, and manage
 * custom AI agents for their courses. These DTOs define the GraphQL contract.
 */

@InputType()
export class CreateCustomAgentInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName: string;

  @Field()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description: string;

  @Field()
  @IsString()
  @MinLength(50)
  @MaxLength(10000)
  systemPrompt: string;

  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  tools: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRoles?: string[];

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  maxTurns?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  courseId?: string;
}

@InputType()
export class UpdateCustomAgentInput {
  @Field()
  @IsString()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(50)
  @MaxLength(10000)
  systemPrompt?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tools?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRoles?: string[];

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  maxTurns?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  courseId?: string;
}

@ObjectType()
export class AvailableTool {
  @Field()
  name: string;

  @Field()
  description: string;

  @Field()
  actionType: string;

  @Field(() => [String])
  requiredPermissions: string[];
}
