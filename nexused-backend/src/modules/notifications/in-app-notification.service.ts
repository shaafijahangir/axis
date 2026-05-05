import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';

export interface CreateNotificationInput {
  userId: string;
  tenantId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class InAppNotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
  ) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    const notification = this.notificationRepo.create({
      userId: input.userId,
      tenantId: input.tenantId,
      type: input.type,
      title: input.title,
      body: input.body,
      _data: input.data ?? null,
      read: false,
    });
    return this.notificationRepo.save(notification);
  }

  async findForUser(
    userId: string,
    tenantId: string,
    limit = 20,
    offset = 0,
  ): Promise<Notification[]> {
    return this.notificationRepo.find({
      where: { userId, tenantId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async unreadCount(userId: string, tenantId: string): Promise<number> {
    return this.notificationRepo.count({
      where: { userId, tenantId, read: false },
    });
  }

  async markRead(
    id: string,
    userId: string,
    tenantId: string,
  ): Promise<Notification> {
    const notification = await this.notificationRepo.findOneOrFail({
      where: { id, userId, tenantId },
    });
    notification.read = true;
    return this.notificationRepo.save(notification);
  }

  async markAllRead(userId: string, tenantId: string): Promise<boolean> {
    await this.notificationRepo.update(
      { userId, tenantId, read: false },
      { read: true },
    );
    return true;
  }
}
