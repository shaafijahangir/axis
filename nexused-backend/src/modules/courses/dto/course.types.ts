import { InputType, Field, Float } from '@nestjs/graphql';

@InputType()
export class CreateCourseInput {
  @Field()
  code: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Float, { nullable: true })
  credits?: number;

  @Field({ nullable: true })
  departmentId?: string;
}

@InputType()
export class UpdateCourseInput {
  @Field({ nullable: true })
  code?: string;

  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Float, { nullable: true })
  credits?: number;

  @Field({ nullable: true })
  departmentId?: string;
}

@InputType()
export class CreateSectionInput {
  @Field()
  courseId: string;

  @Field()
  termId: string;

  @Field({ nullable: true })
  location?: string;

  @Field({ nullable: true })
  capacity?: number;

  @Field({ nullable: true })
  schedule?: string;
}
