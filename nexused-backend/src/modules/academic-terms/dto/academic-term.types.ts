import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsBoolean, IsOptional, IsDateString } from 'class-validator';

@InputType()
export class CreateAcademicTermInput {
  @Field()
  @IsString()
  name: string;

  @Field()
  @IsDateString()
  startDate: string;

  @Field()
  @IsDateString()
  endDate: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}

@InputType()
export class UpdateAcademicTermInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}
