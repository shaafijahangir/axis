import { ObjectType, Field, InputType, Int } from '@nestjs/graphql';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
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
  roles: UserRole[];
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
  roles?: UserRole[];

  @Field(() => UserStatus, { nullable: true })
  @IsOptional()
  status?: UserStatus;
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
  page?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  pageSize?: number;
}
