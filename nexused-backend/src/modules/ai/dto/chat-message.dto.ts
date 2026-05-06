import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

@InputType()
export class StartConversationInput {
  @Field()
  @IsString()
  agentType: string;

  @Field()
  @IsString()
  @MaxLength(10000)
  message: string;

  @Field({ nullable: true })
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  courseId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  assignmentId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  submissionId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  sectionId?: string;
}

@InputType()
export class ContinueConversationInput {
  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  conversationId: string;

  @Field()
  @IsString()
  @MaxLength(10000)
  message: string;
}
