import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString, MaxLength } from 'class-validator';

@InputType()
export class UpdateUserInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  profile?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  preferences?: string;

  /**
   * FEAT-021: directory fields, merged into profile JSONB server-side.
   * Dedicated inputs (not the raw profile string) so callers never have to
   * read-modify-write the whole JSON blob to change one field.
   */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  title?: string;

  /** Building + room, directory format (e.g. "ECS 618"). */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  officeLocation?: string;
}
