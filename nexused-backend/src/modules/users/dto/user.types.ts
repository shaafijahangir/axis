import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateUserInput {
  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field(() => String, { nullable: true })
  profile?: string;

  @Field(() => String, { nullable: true })
  preferences?: string;
}
