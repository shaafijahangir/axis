import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import ical, { ICalEventRepeatingFreq, ICalAlarmType } from 'ical-generator';
import { User } from '../../database/entities/user.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { Assignment } from '../../database/entities/assignment.entity';

export interface SectionSchedule {
  meetingDays: ('MON' | 'TUE' | 'WED' | 'THU' | 'FRI')[];
  startTime: string; // "HH:MM" 24h
  endTime: string; // "HH:MM" 24h
}

const DAY_MAP: Record<string, number> = {
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
};

// Converts "HH:MM" to { hour, minute }
function parseTime(t: string): { hour: number; minute: number } {
  const [h, m] = t.split(':').map(Number);
  return { hour: h, minute: m };
}

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Assignment)
    private assignmentRepo: Repository<Assignment>,
    private configService: ConfigService,
  ) {}

  generateToken(userId: string): string {
    const secret = this.configService.getOrThrow<string>('auth.jwtSecret');
    return createHmac('sha256', secret).update(userId).digest('hex');
  }

  async resolveUserFromToken(token: string): Promise<User | null> {
    // We can't reverse the HMAC, so we scan active users and compare.
    // For a school of <10k users this is fine. In production: store token in preferences.
    const users = await this.userRepo.find({
      select: ['id', 'email', 'firstName', 'lastName', 'tenantId'],
    });
    for (const user of users) {
      if (this.generateToken(user.id) === token) return user;
    }
    return null;
  }

  async generateIcal(userId: string, tenantId: string): Promise<string> {
    const calendar = ical({ name: 'Axis Schedule' });

    // Load active enrollments with section + course + instructor
    const enrollments = await this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.section', 'section')
      .innerJoinAndSelect('section.course', 'course')
      .leftJoinAndSelect('section.instructor', 'instructor')
      .innerJoinAndSelect('section.term', 'term')
      .where('enrollment.userId = :userId', { userId })
      .andWhere('enrollment.status = :status', { status: 'active' })
      .andWhere('course.tenantId = :tenantId', { tenantId })
      .getMany();

    for (const enrollment of enrollments) {
      const section = enrollment.section;
      const course = section.course;
      const scheduleRaw = section.schedule as SectionSchedule | null;

      if (
        !scheduleRaw?.meetingDays?.length ||
        !scheduleRaw.startTime ||
        !scheduleRaw.endTime
      ) {
        continue; // Skip sections with no schedule set yet
      }

      const termStart = section.term?.startDate ?? new Date();
      const termEnd =
        section.term?.endDate ?? new Date(Date.now() + 90 * 86400 * 1000);

      const startParsed = parseTime(scheduleRaw.startTime);
      const endParsed = parseTime(scheduleRaw.endTime);

      // Create a recurring event for each meeting day
      for (const day of scheduleRaw.meetingDays) {
        // Find the first occurrence on or after termStart
        const dayIndex = DAY_MAP[day];
        const firstOccurrence = new Date(termStart);
        while (firstOccurrence.getDay() !== dayIndex) {
          firstOccurrence.setDate(firstOccurrence.getDate() + 1);
        }

        const eventStart = new Date(firstOccurrence);
        eventStart.setHours(startParsed.hour, startParsed.minute, 0, 0);

        const eventEnd = new Date(firstOccurrence);
        eventEnd.setHours(endParsed.hour, endParsed.minute, 0, 0);

        const instructorName = section.instructor
          ? `${section.instructor.firstName} ${section.instructor.lastName}`
          : 'TBD';

        calendar.createEvent({
          summary: `${course.code} — ${course.title}`,
          description: `Instructor: ${instructorName}`,
          location: section.location ?? '',
          start: eventStart,
          end: eventEnd,
          repeating: {
            freq: ICalEventRepeatingFreq.WEEKLY,
            until: termEnd,
          },
          id: `${section.id}-${day}`,
        });
      }
    }

    // Add assignment due dates
    const sectionIds = enrollments.map((e) => e.section.id);
    if (sectionIds.length > 0) {
      const assignments = await this.assignmentRepo
        .createQueryBuilder('assignment')
        .innerJoinAndSelect('assignment.section', 'section')
        .innerJoinAndSelect('section.course', 'course')
        .where('assignment.sectionId IN (:...sectionIds)', { sectionIds })
        .andWhere('assignment.dueAt IS NOT NULL')
        .andWhere('assignment.dueAt > :now', { now: new Date() })
        .getMany();

      for (const assignment of assignments) {
        const due = new Date(assignment.dueAt);
        const end = new Date(due.getTime() + 30 * 60 * 1000); // 30-min block
        calendar.createEvent({
          summary: `Due: ${assignment.title}`,
          description: `${assignment.section.course.title} — ${assignment.title}`,
          start: due,
          end,
          alarms: [{ type: ICalAlarmType.display, trigger: 86400 }], // 24h reminder
          id: `assignment-${assignment.id}`,
        });
      }
    }

    return calendar.toString();
  }
}
