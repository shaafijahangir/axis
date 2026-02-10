import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Conversation } from './entities/conversation.entity';
import { ConversationParticipant } from './entities/conversation-participant.entity';
import { DirectMessage } from './entities/direct-message.entity';
import { User } from '../../database/entities/user.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { CourseSection } from '../../database/entities/course-section.entity';
import { MessagingService } from './messaging.service';
import { MessagingResolver } from './messaging.resolver';
import { MessagingGateway } from './messaging.gateway';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      ConversationParticipant,
      DirectMessage,
      User,
      Enrollment,
      CourseSection,
    ]),
    // JWT for WebSocket authentication
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwtSecret'),
      }),
    }),
    // UsersModule for verifying users (avoid circular dep with forwardRef)
    forwardRef(() => UsersModule),
  ],
  providers: [MessagingService, MessagingResolver, MessagingGateway],
  exports: [MessagingService, MessagingGateway],
})
export class MessagingModule {}
