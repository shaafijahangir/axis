import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Discussion } from './entities/discussion.entity';
import { DiscussionReply } from './entities/discussion-reply.entity';
import {
  CreateDiscussionInput,
  CreateDiscussionReplyInput,
} from './dto/discussion.types';
import { User } from '../../database/entities/user.entity';
import {
  Enrollment,
  EnrollmentStatus,
} from '../../database/entities/enrollment.entity';
import { InAppNotificationService } from '../notifications/in-app-notification.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class DiscussionsService {
  constructor(
    @InjectRepository(Discussion)
    private discussionRepo: Repository<Discussion>,
    @InjectRepository(DiscussionReply)
    private replyRepo: Repository<DiscussionReply>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
    private dataSource: DataSource,
    private notificationService: InAppNotificationService,
  ) {}

  // ─── Create ──────────────────────────────────────────────────────────────

  async createDiscussion(
    tenantId: string,
    authorId: string,
    input: CreateDiscussionInput,
  ): Promise<Discussion> {
    const discussion = this.discussionRepo.create({
      tenantId,
      sectionId: input.sectionId,
      authorId,
      title: input.title,
      body: input.body,
      isPinned: false,
      isLocked: false,
      isAnswered: false,
      replyCount: 0,
    });

    const saved = await this.discussionRepo.save(discussion);

    // Notify section members about the new discussion (async, non-blocking)
    this.notifySectionMembers(saved, tenantId, authorId).catch(() => {
      // Notification failure must never break the mutation
    });

    return this.findById(saved.id, tenantId);
  }

  // ─── Reply ────────────────────────────────────────────────────────────────

  async createReply(
    tenantId: string,
    authorId: string,
    input: CreateDiscussionReplyInput,
  ): Promise<DiscussionReply> {
    const discussion = await this.findById(input.discussionId, tenantId);

    if (discussion.isLocked) {
      throw new ForbiddenException('This discussion is locked.');
    }

    // Transaction: create reply + increment replyCount atomically
    const savedReply = await this.dataSource.manager.transaction(
      async (manager) => {
        const reply = manager.create(DiscussionReply, {
          tenantId,
          discussionId: input.discussionId,
          authorId,
          parentReplyId: input.parentReplyId ?? null,
          body: input.body,
          isInstructorAnswer: false,
        });

        const saved = await manager.save(DiscussionReply, reply);

        await manager.increment(
          Discussion,
          { id: input.discussionId },
          'replyCount',
          1,
        );

        return saved;
      },
    );

    // Load relations for response
    const replyWithAuthor = await this.replyRepo.findOneOrFail({
      where: { id: savedReply.id },
      relations: ['author'],
    });

    // Notify discussion author + @mentioned users (async, non-blocking)
    this.notifyOnReply(replyWithAuthor, discussion, tenantId, authorId).catch(
      () => {},
    );

    return replyWithAuthor;
  }

  // ─── Queries ─────────────────────────────────────────────────────────────

  async findBySectionId(
    sectionId: string,
    tenantId: string,
    page = 1,
    limit = 20,
  ): Promise<Discussion[]> {
    return this.discussionRepo.find({
      where: { sectionId, tenantId },
      relations: ['author'],
      order: { isPinned: 'DESC', createdAt: 'DESC' },
      take: Math.min(limit, 50),
      skip: (page - 1) * Math.min(limit, 50),
    });
  }

  async findById(id: string, tenantId: string): Promise<Discussion> {
    const discussion = await this.discussionRepo.findOne({
      where: { id, tenantId },
      relations: ['author'],
    });
    if (!discussion) throw new NotFoundException('Discussion not found');
    return discussion;
  }

  async findReplies(
    discussionId: string,
    tenantId: string,
  ): Promise<DiscussionReply[]> {
    return this.replyRepo.find({
      where: { discussionId, tenantId },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });
  }

  // ─── Instructor Controls ─────────────────────────────────────────────────

  async pinDiscussion(id: string, tenantId: string): Promise<Discussion> {
    const discussion = await this.findById(id, tenantId);
    discussion.isPinned = !discussion.isPinned;
    return this.discussionRepo.save(discussion);
  }

  async lockDiscussion(id: string, tenantId: string): Promise<Discussion> {
    const discussion = await this.findById(id, tenantId);
    discussion.isLocked = !discussion.isLocked;
    return this.discussionRepo.save(discussion);
  }

  async markDiscussionAnswered(
    id: string,
    tenantId: string,
  ): Promise<Discussion> {
    const discussion = await this.findById(id, tenantId);
    discussion.isAnswered = !discussion.isAnswered;
    return this.discussionRepo.save(discussion);
  }

  async markReplyAsInstructorAnswer(
    replyId: string,
    tenantId: string,
  ): Promise<DiscussionReply> {
    const reply = await this.replyRepo.findOne({
      where: { id: replyId, tenantId },
      relations: ['author'],
    });
    if (!reply) throw new NotFoundException('Reply not found');
    reply.isInstructorAnswer = !reply.isInstructorAnswer;
    return this.replyRepo.save(reply);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  /**
   * Notify active section members when a new discussion is created.
   * Skips the author. Capped at 50 to avoid spamming large sections.
   */
  private async notifySectionMembers(
    discussion: Discussion,
    tenantId: string,
    authorId: string,
  ): Promise<void> {
    const enrollments = await this.enrollmentRepo.find({
      where: {
        sectionId: discussion.sectionId,
        status: EnrollmentStatus.ACTIVE,
      },
      take: 50,
    });

    const memberIds = enrollments
      .map((e) => e.userId)
      .filter((uid) => uid !== authorId);

    await Promise.all(
      memberIds.map((userId) =>
        this.notificationService.create({
          userId,
          tenantId,
          type: NotificationType.DISCUSSION_REPLY,
          title: `New discussion: ${discussion.title}`,
          body: 'A new discussion was posted in your course.',
          data: {
            discussionId: discussion.id,
            sectionId: discussion.sectionId,
          },
        }),
      ),
    );
  }

  /**
   * On reply: notify the discussion author + any @mentioned users.
   *
   * WHY: Users write @FirstName LastName in replies. We parse these out,
   * look up matching users in the same tenant, and notify them.
   * This keeps mentions simple without requiring a username field on User.
   */
  private async notifyOnReply(
    reply: DiscussionReply,
    discussion: Discussion,
    tenantId: string,
    authorId: string,
  ): Promise<void> {
    const usersToNotify = new Set<string>();

    // Always notify the discussion author (unless they're replying to themselves)
    if (discussion.authorId !== authorId) {
      usersToNotify.add(discussion.authorId);
    }

    // Parse @mentions from reply body (strip HTML tags first, then match @Name)
    const plainText = reply.body.replace(/<[^>]+>/g, ' ');
    const mentionPattern = /@([A-Za-z]+(?:\s+[A-Za-z]+)?)/g;
    const mentions: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = mentionPattern.exec(plainText)) !== null) {
      mentions.push(match[1].trim());
    }

    if (mentions.length > 0) {
      // Fetch all users in section via enrollments
      const enrollments = await this.enrollmentRepo.find({
        where: {
          sectionId: discussion.sectionId,
          status: EnrollmentStatus.ACTIVE,
        },
        take: 100,
      });
      const userIds = enrollments.map((e) => e.userId);

      if (userIds.length > 0) {
        const users = await this.userRepo.find({
          where: userIds.map((id) => ({ id, tenantId })),
        });

        for (const user of users) {
          const fullName = `${user.firstName} ${user.lastName}`;
          const firstName = user.firstName;
          if (
            mentions.some(
              (m) =>
                m.toLowerCase() === fullName.toLowerCase() ||
                m.toLowerCase() === firstName.toLowerCase(),
            )
          ) {
            usersToNotify.add(user.id);
          }
        }
      }
    }

    // Remove the replying author from notify set
    usersToNotify.delete(authorId);

    const authorName = reply.author
      ? `${reply.author.firstName} ${reply.author.lastName}`
      : 'Someone';

    await Promise.all(
      [...usersToNotify].map((userId) =>
        this.notificationService.create({
          userId,
          tenantId,
          type: NotificationType.DISCUSSION_REPLY,
          title: `New reply in: ${discussion.title}`,
          body: `${authorName} replied to the discussion.`,
          data: {
            discussionId: discussion.id,
            sectionId: discussion.sectionId,
          },
        }),
      ),
    );
  }
}
