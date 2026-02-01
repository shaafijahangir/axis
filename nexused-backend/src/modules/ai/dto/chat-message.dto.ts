import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsUUID, IsOptional, MaxLength } from 'class-validator';

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
  @IsUUID()
  courseId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  submissionId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  sectionId?: string;
}

@InputType()
export class SendMessageInput {
  @Field()
  @IsUUID()
  conversationId: string;

  @Field()
  @IsString()
  @MaxLength(10000)
  message: string;
}
