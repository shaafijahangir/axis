import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { ConversationParticipant } from './entities/conversation-participant.entity';
import { DirectMessage } from './entities/direct-message.entity';
import { User } from '../../database/entities/user.entity';
import {
  Enrollment,
  EnrollmentStatus,
} from '../../database/entities/enrollment.entity';
import { CourseSection } from '../../database/entities/course-section.entity';
import {
  ConversationWithLatest,
  PaginatedMessagesResponse,
  ContactUser,
} from './dto/messaging.types';

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private participantRepo: Repository<ConversationParticipant>,
    @InjectRepository(DirectMessage)
    private messageRepo: Repository<DirectMessage>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(CourseSection)
    private sectionRepo: Repository<CourseSection>,
    private dataSource: DataSource,
  ) {}

  /**
   * Build a contact list based on enrollment relationships.
   * Students see instructors + classmates; instructors see their students.
   */
  async getContacts(userId: string, tenantId: string): Promise<ContactUser[]> {
    // Find all active enrollments for this user (as student/TA)
    const userEnrollments = await this.enrollmentRepo.find({
      where: { userId, status: EnrollmentStatus.ACTIVE },
      relations: ['section', 'section.course'],
    });

    const contactMap = new Map<string, ContactUser>();

    // For each enrolled section, get instructor + classmates
    for (const enrollment of userEnrollments) {
      const section = enrollment.section;
      const courseName = section.course?.title ?? 'Unknown Course';

      // Add the instructor as a contact
      if (section.instructorId && section.instructorId !== userId) {
        if (!contactMap.has(section.instructorId)) {
          const instructor = await this.userRepo.findOne({
            where: { id: section.instructorId, tenantId },
          });
          if (instructor) {
            contactMap.set(instructor.id, {
              id: instructor.id,
              firstName: instructor.firstName,
              lastName: instructor.lastName,
              email: instructor.email,
              roles: instructor.roles,
              relationship: `Instructor — ${courseName}`,
            });
          }
        }
      }

      // Add classmates from same section
      const classmates = await this.enrollmentRepo.find({
        where: { sectionId: section.id, status: EnrollmentStatus.ACTIVE },
        relations: ['user'],
      });

      for (const mate of classmates) {
        if (mate.userId === userId) continue;
        if (contactMap.has(mate.userId)) continue;

        contactMap.set(mate.userId, {
          id: mate.user.id,
          firstName: mate.user.firstName,
          lastName: mate.user.lastName,
          email: mate.user.email,
          roles: mate.user.roles,
          relationship: `Classmate — ${courseName}`,
        });
      }
    }

    // If the user is an instructor, also find sections they teach
    const taughtSections = await this.sectionRepo.find({
      where: { instructorId: userId },
      relations: ['course'],
    });

    for (const section of taughtSections) {
      const courseName = section.course?.title ?? 'Unknown Course';
      const students = await this.enrollmentRepo.find({
        where: { sectionId: section.id, status: EnrollmentStatus.ACTIVE },
        relations: ['user'],
      });

      for (const enrollment of students) {
        if (enrollment.userId === userId) continue;
        if (contactMap.has(enrollment.userId)) continue;

        contactMap.set(enrollment.userId, {
          id: enrollment.user.id,
          firstName: enrollment.user.firstName,
          lastName: enrollment.user.lastName,
          email: enrollment.user.email,
          roles: enrollment.user.roles,
          relationship: `Student — ${courseName}`,
        });
      }
    }

    return Array.from(contactMap.values()).sort((a, b) =>
      a.lastName.localeCompare(b.lastName),
    );
  }

  /**
   * Get all conversations for a user with last message and unread count.
   */
  async getConversations(
    userId: string,
    tenantId: string,
  ): Promise<ConversationWithLatest[]> {
    // Get all conversation IDs where user is a participant
    const participations = await this.participantRepo.find({
      where: { userId },
      relations: ['conversation'],
    });

    const results: ConversationWithLatest[] = [];

    for (const participation of participations) {
      const conv = participation.conversation;
      if (conv.tenantId !== tenantId) continue;

      // Get latest message
      const lastMessage = await this.messageRepo.findOne({
        where: { conversationId: conv.id },
        relations: ['sender'],
        order: { createdAt: 'DESC' },
      });

      // Count unread messages
      const unreadQuery = this.messageRepo
        .createQueryBuilder('msg')
        .where('msg.conversationId = :convId', { convId: conv.id });

      if (participation.lastReadAt) {
        unreadQuery.andWhere('msg.createdAt > :lastRead', {
          lastRead: participation.lastReadAt,
        });
      }

      const unreadCount = await unreadQuery.getCount();

      // Get other participants
      const otherParticipants = await this.participantRepo.find({
        where: { conversationId: conv.id },
        relations: ['user'],
      });

      results.push({
        id: conv.id,
        title: conv.title,
        lastMessage: lastMessage ?? null,
        unreadCount,
        otherParticipants: otherParticipants
          .filter((p) => p.userId !== userId)
          .map((p) => p.user),
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      });
    }

    // Sort by latest message timestamp descending
    results.sort((a, b) => {
      const aTime =
        a.lastMessage?.createdAt?.getTime() ?? a.createdAt.getTime();
      const bTime =
        b.lastMessage?.createdAt?.getTime() ?? b.createdAt.getTime();
      return bTime - aTime;
    });

    return results;
  }

  /**
   * Find existing 1:1 conversation between two users, or create one.
   *
   * DATA-003: Uses transaction to ensure conversation + participants are created atomically.
   * WHY: If participant creation fails, we'd have an orphaned conversation.
   */
  async getOrCreateConversation(
    userId: string,
    recipientId: string,
    tenantId: string,
  ): Promise<Conversation> {
    if (userId === recipientId) {
      throw new BadRequestException(
        'Cannot start a conversation with yourself',
      );
    }

    // Verify recipient exists in the same tenant
    const recipient = await this.userRepo.findOne({
      where: { id: recipientId, tenantId },
    });
    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    // Look for an existing 1:1 conversation between these two users
    const existing = await this.conversationRepo
      .createQueryBuilder('conv')
      .innerJoin('conv.participants', 'p1', 'p1.userId = :userId', { userId })
      .innerJoin('conv.participants', 'p2', 'p2.userId = :recipientId', {
        recipientId,
      })
      .where('conv.tenantId = :tenantId', { tenantId })
      .andWhere('conv.title IS NULL') // DMs have null title
      .getOne();

    if (existing) return existing;

    // Create new conversation + participants in a transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const conversation = queryRunner.manager.create(Conversation, {
        tenantId,
      });
      const saved = await queryRunner.manager.save(conversation);

      const participants = [
        queryRunner.manager.create(ConversationParticipant, {
          conversationId: saved.id,
          userId,
        }),
        queryRunner.manager.create(ConversationParticipant, {
          conversationId: saved.id,
          userId: recipientId,
        }),
      ];
      await queryRunner.manager.save(participants);

      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get messages for a conversation with cursor-based pagination.
   * Returns newest messages first (frontend reverses for display).
   */
  async getMessages(
    conversationId: string,
    userId: string,
    tenantId: string,
    cursor?: string,
    limit: number = 50,
  ): Promise<PaginatedMessagesResponse> {
    await this.verifyParticipant(conversationId, userId, tenantId);

    const qb = this.messageRepo
      .createQueryBuilder('msg')
      .leftJoinAndSelect('msg.sender', 'sender')
      .where('msg.conversationId = :conversationId', { conversationId });

    if (cursor) {
      qb.andWhere('msg.createdAt < :cursor', { cursor: new Date(cursor) });
    }

    const totalCount = await this.messageRepo.count({
      where: { conversationId },
    });

    const messages = await qb
      .orderBy('msg.createdAt', 'DESC')
      .take(limit)
      .getMany();

    // Reverse so oldest is first (chat order)
    messages.reverse();

    const oldestFetched = messages[0]?.createdAt;
    const hasMore = oldestFetched
      ? (await this.messageRepo
          .createQueryBuilder('msg')
          .where('msg.conversationId = :conversationId', { conversationId })
          .andWhere('msg.createdAt < :oldest', { oldest: oldestFetched })
          .getCount()) > 0
      : false;

    return { messages, totalCount, hasMore };
  }

  /**
   * Send a message to an existing conversation.
   *
   * DATA-003: Uses transaction to ensure message + updates are atomic.
   * WHY: Message save, conversation update, and participant update must all succeed or fail together.
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    tenantId: string,
    content: string,
  ): Promise<DirectMessage> {
    await this.verifyParticipant(conversationId, senderId, tenantId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const message = queryRunner.manager.create(DirectMessage, {
        conversationId,
        senderId,
        content,
      });
      const saved = await queryRunner.manager.save(message);

      // Bump conversation's updatedAt
      await queryRunner.manager.update(Conversation, conversationId, {
        updatedAt: new Date(),
      });

      // Auto-mark as read for the sender
      await queryRunner.manager.update(
        ConversationParticipant,
        { conversationId, userId: senderId },
        { lastReadAt: new Date() },
      );

      await queryRunner.commitTransaction();

      // Return with sender relation loaded (outside transaction - read only)
      return this.messageRepo.findOne({
        where: { id: saved.id },
        relations: ['sender'],
      }) as Promise<DirectMessage>;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Send a message to a user by recipientId (creates conversation if needed).
   */
  async sendMessageToUser(
    senderId: string,
    recipientId: string,
    tenantId: string,
    content: string,
  ): Promise<DirectMessage> {
    const conversation = await this.getOrCreateConversation(
      senderId,
      recipientId,
      tenantId,
    );
    return this.sendMessage(conversation.id, senderId, tenantId, content);
  }

  /**
   * Mark all messages in a conversation as read for the user.
   */
  async markAsRead(
    conversationId: string,
    userId: string,
    tenantId: string,
  ): Promise<boolean> {
    await this.verifyParticipant(conversationId, userId, tenantId);

    await this.participantRepo.update(
      { conversationId, userId },
      { lastReadAt: new Date() },
    );

    return true;
  }

  /**
   * Get total unread message count across all conversations.
   */
  async getUnreadCount(userId: string, tenantId: string): Promise<number> {
    const participations = await this.participantRepo
      .createQueryBuilder('cp')
      .innerJoin('cp.conversation', 'conv')
      .where('cp.userId = :userId', { userId })
      .andWhere('conv.tenantId = :tenantId', { tenantId })
      .getMany();

    let total = 0;

    for (const p of participations) {
      const qb = this.messageRepo
        .createQueryBuilder('msg')
        .where('msg.conversationId = :convId', { convId: p.conversationId });

      if (p.lastReadAt) {
        qb.andWhere('msg.createdAt > :lastRead', { lastRead: p.lastReadAt });
      }

      total += await qb.getCount();
    }

    return total;
  }

  /**
   * Security check: verify the user is a participant of the conversation
   * and the conversation belongs to the correct tenant.
   */
  private async verifyParticipant(
    conversationId: string,
    userId: string,
    tenantId: string,
  ): Promise<void> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId, tenantId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const participant = await this.participantRepo.findOne({
      where: { conversationId, userId },
    });

    if (!participant) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }
  }
}
