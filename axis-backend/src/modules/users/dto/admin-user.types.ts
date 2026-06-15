import { ObjectType, Field, InputType, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { User, UserRole, UserStatus } from '../../../database/entities';

@ObjectType()
export class PaginatedUsersResponse {
  @Field(() => [User])
  users: User[];

  @Field(() => Int)
  totalCount: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  pageSize: number;
}

@InputType()
export class AdminCreateUserInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @MinLength(8)
  password: string;

  @Field()
  @IsString()
  firstName: string;

  @Field()
  @IsString()
  lastName: string;

  @Field(() => [UserRole])
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];

  // ── SPRINT-3: K-12 student fields ──
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  gradeLevel?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  homeroomTeacherId?: string;
}

@InputType()
export class AdminUpdateUserInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field(() => [UserRole], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];

  @Field(() => UserStatus, { nullable: true })
  @IsOptional()
  status?: UserStatus;

  // ── SPRINT-3: K-12 student fields. Send null to clear. ──
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  gradeLevel?: number | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  homeroomTeacherId?: string | null;
}

@InputType()
export class UsersFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => UserRole, { nullable: true })
  @IsOptional()
  role?: UserRole;

  @Field(() => UserStatus, { nullable: true })
  @IsOptional()
  status?: UserStatus;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  /** SPRINT-3: filter the users directory by K-12 grade level. */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  gradeLevel?: number;
}
