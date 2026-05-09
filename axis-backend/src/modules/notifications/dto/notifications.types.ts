import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { IsBoolean, IsOptional } from 'class-validator';

@InputType()
export class UpdateNotificationPreferencesInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  emailOnGrade?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  emailOnAssignment?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  emailOnEnrollment?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  emailOnDueReminder?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  emailOnMessage?: boolean;
}

@ObjectType()
export class NotificationPreferences {
  @Field({ nullable: true })
  emailOnGrade?: boolean;

  @Field({ nullable: true })
  emailOnAssignment?: boolean;

  @Field({ nullable: true })
  emailOnEnrollment?: boolean;

  @Field({ nullable: true })
  emailOnDueReminder?: boolean;

  @Field({ nullable: true })
  emailOnMessage?: boolean;
}
