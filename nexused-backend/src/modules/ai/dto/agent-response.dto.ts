import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class AgentResponseDto {
  @Field()
  conversationId: string;

  @Field()
  responseText: string;

  @Field(() => [String])
  toolsUsed: string[];

  @Field(() => Int)
  totalInputTokens: number;

  @Field(() => Int)
  totalOutputTokens: number;

  @Field(() => Int)
  turns: number;
}

@ObjectType()
export class AgentInfoDto {
  @Field()
  type: string;

  @Field()
  displayName: string;

  @Field()
  description: string;

  @Field(() => [String])
  allowedRoles: string[];
}
