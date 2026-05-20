import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';
import { TenantScopedEntity } from '../../../database/entities/base.entity';
import { User } from '../../../database/entities/user.entity';

/**
 * WHY context enum: Each upload context has different validation rules
 * (max size, allowed mime types). Storing the context on the record lets us
 * enforce these rules server-side and query files by their purpose.
 *
 * WHY two-phase (confirmed flag): Client calls requestUpload → gets presigned
 * URL + fileId → uploads to R2 → calls confirmUpload. The confirmed flag
 * prevents ghost records from failed uploads appearing in queries.
 */
export enum UploadContext {
  ASSIGNMENT_SUBMISSION = 'assignment_submission',
  ASSIGNMENT_INSTRUCTIONS = 'assignment_instructions',
  PROFILE_PICTURE = 'profile_picture',
  COURSE_CONTENT = 'course_content',
  IMPORT_DOCUMENT = 'import_document',
}

registerEnumType(UploadContext, { name: 'UploadContext' });

@ObjectType()
@Entity('file_uploads')
@Index(['tenantId'])
@Index(['uploadedById'])
@Index(['context', 'contextId'])
export class FileUpload extends TenantScopedEntity {
  /** R2 object key — {tenantId}/{context}/{userId}/{uuid}.{ext} */
  @Field()
  @Column()
  key: string;

  @Field()
  @Column()
  originalName: string;

  @Field()
  @Column()
  mimeType: string;

  @Field(() => Int)
  @Column({ type: 'int' })
  size: number;

  @Field(() => UploadContext)
  @Column({ type: 'enum', enum: UploadContext })
  context: UploadContext;

  /**
   * ID of the entity this file belongs to (submissionId, contentId, etc).
   * Nullable because the file may be uploaded before the parent entity is saved.
   */
  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', nullable: true })
  contextId: string | null;

  @Field()
  @Column()
  uploadedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  /**
   * Two-phase upload: false until client confirms the R2 PUT succeeded.
   * Unconfirmed records are excluded from all queries.
   */
  @Field()
  @Column({ default: false })
  confirmed: boolean;
}
