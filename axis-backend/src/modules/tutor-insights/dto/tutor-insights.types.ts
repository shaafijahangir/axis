import { ObjectType, Field, Int } from '@nestjs/graphql';

// ─── Output types for the instructor "Tutor Mission Control" view ───────────

@ObjectType()
export class TutorConversationSummary {
  @Field()
  id: string;

  /** First student message, truncated. Conversations have no title column. */
  @Field()
  title: string;

  @Field(() => Int)
  studentMessageCount: number;

  @Field()
  lastActiveAt: Date;
}

@ObjectType()
export class TutorStudentActivity {
  @Field()
  studentId: string;

  @Field()
  studentName: string;

  @Field(() => Int)
  conversationCount: number;

  @Field(() => Int)
  studentMessageCount: number;

  @Field({ nullable: true })
  lastActiveAt?: Date;

  @Field()
  needsAttention: boolean;

  /** Human-readable reasons, e.g. "Said they were confused 3 times this week" */
  @Field(() => [String])
  attentionReasons: string[];

  @Field(() => [TutorConversationSummary])
  conversations: TutorConversationSummary[];
}

@ObjectType()
export class TutorTranscriptMessage {
  @Field()
  id: string;

  /** 'student' or 'tutor'. Tool traffic is never shown to instructors. */
  @Field()
  speaker: string;

  @Field()
  content: string;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class TutorGapGroup {
  @Field()
  topic: string;

  @Field()
  summary: string;

  @Field(() => [String])
  studentIds: string[];

  @Field(() => [String])
  studentNames: string[];
}

@ObjectType()
export class TutorGapAnalysis {
  @Field(() => [TutorGapGroup])
  groups: TutorGapGroup[];

  @Field(() => [String])
  strengths: string[];

  @Field(() => Int)
  analyzedMessageCount: number;

  @Field()
  generatedAt: Date;
}
