import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Attendance,
  AttendanceStatus,
} from '../../database/entities/attendance.entity';
import {
  Enrollment,
  EnrollmentRole,
  EnrollmentStatus,
} from '../../database/entities/enrollment.entity';
import {
  MarkAttendanceInput,
  DayAttendance,
  AttendanceRecord,
  StudentAttendanceSummary,
} from './dto/attendance.types';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepo: Repository<Attendance>,
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
  ) {}

  async markAttendance(
    tenantId: string,
    input: MarkAttendanceInput,
  ): Promise<DayAttendance> {
    const { sectionId, date, records } = input;

    for (const record of records) {
      await this.attendanceRepo
        .createQueryBuilder()
        .insert()
        .into(Attendance)
        .values({
          tenantId,
          sectionId,
          userId: record.studentId,
          date,
          status: record.status,
          notes: record.notes ?? null,
        })
        .orUpdate(['status', 'notes'], ['sectionId', 'userId', 'date'])
        .execute();
    }

    return this.getSectionAttendance(sectionId, date, tenantId);
  }

  async getSectionAttendance(
    sectionId: string,
    date: string,
    tenantId: string,
  ): Promise<DayAttendance> {
    const enrollments = await this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.user', 'user')
      .where('enrollment.sectionId = :sectionId', { sectionId })
      .andWhere('enrollment.tenantId = :tenantId', { tenantId })
      .andWhere('enrollment.status = :status', {
        status: EnrollmentStatus.ACTIVE,
      })
      .andWhere('enrollment.role = :role', { role: EnrollmentRole.STUDENT })
      .orderBy('user.lastName', 'ASC')
      .addOrderBy('user.firstName', 'ASC')
      .getMany();

    const existingMap = new Map<string, Attendance>();
    const existing = await this.attendanceRepo.find({
      where: { sectionId, date, tenantId },
    });
    for (const a of existing) existingMap.set(a.userId, a);

    const records: AttendanceRecord[] = enrollments.map((e) => {
      const a = existingMap.get(e.userId);
      return {
        id: a?.id ?? '',
        userId: e.userId,
        firstName: e.user.firstName,
        lastName: e.user.lastName,
        status: a?.status ?? AttendanceStatus.PRESENT,
        notes: a?.notes ?? undefined,
      };
    });

    return { date, records };
  }

  async getStudentAttendanceSummary(
    userId: string,
    sectionId: string,
    tenantId: string,
  ): Promise<StudentAttendanceSummary> {
    const records = await this.attendanceRepo.find({
      where: { userId, sectionId, tenantId },
    });

    let present = 0,
      absent = 0,
      late = 0,
      excused = 0;
    for (const r of records) {
      if (r.status === AttendanceStatus.PRESENT) present++;
      else if (r.status === AttendanceStatus.ABSENT) absent++;
      else if (r.status === AttendanceStatus.LATE) late++;
      else if (r.status === AttendanceStatus.EXCUSED) excused++;
    }

    const total = records.length;
    const attendanceRate =
      total > 0
        ? Math.round(((present + late + excused) / total) * 10000) / 100
        : 100;

    return {
      userId,
      sectionId,
      firstName: '',
      lastName: '',
      total,
      present,
      absent,
      late,
      excused,
      attendanceRate,
    };
  }

  async getSectionAttendanceSummaries(
    sectionId: string,
    tenantId: string,
  ): Promise<StudentAttendanceSummary[]> {
    const enrollments = await this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.user', 'user')
      .where('enrollment.sectionId = :sectionId', { sectionId })
      .andWhere('enrollment.tenantId = :tenantId', { tenantId })
      .andWhere('enrollment.status = :status', {
        status: EnrollmentStatus.ACTIVE,
      })
      .andWhere('enrollment.role = :role', { role: EnrollmentRole.STUDENT })
      .getMany();

    const allRecords = await this.attendanceRepo.find({
      where: { sectionId, tenantId },
    });

    const byStudent = new Map<string, Attendance[]>();
    for (const r of allRecords) {
      if (!byStudent.has(r.userId)) byStudent.set(r.userId, []);
      byStudent.get(r.userId)!.push(r);
    }

    return enrollments.map((e) => {
      const records = byStudent.get(e.userId) ?? [];
      let present = 0,
        absent = 0,
        late = 0,
        excused = 0;
      for (const r of records) {
        if (r.status === AttendanceStatus.PRESENT) present++;
        else if (r.status === AttendanceStatus.ABSENT) absent++;
        else if (r.status === AttendanceStatus.LATE) late++;
        else if (r.status === AttendanceStatus.EXCUSED) excused++;
      }
      const total = records.length;
      const attendanceRate =
        total > 0
          ? Math.round(((present + late + excused) / total) * 10000) / 100
          : 100;

      return {
        userId: e.userId,
        sectionId,
        firstName: e.user.firstName,
        lastName: e.user.lastName,
        total,
        present,
        absent,
        late,
        excused,
        attendanceRate,
      };
    });
  }

  async getMyAttendanceSummaries(
    userId: string,
    tenantId: string,
  ): Promise<StudentAttendanceSummary[]> {
    const enrollments = await this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.user', 'user')
      .where('enrollment.userId = :userId', { userId })
      .andWhere('enrollment.tenantId = :tenantId', { tenantId })
      .andWhere('enrollment.status = :status', {
        status: EnrollmentStatus.ACTIVE,
      })
      .andWhere('enrollment.role = :role', { role: EnrollmentRole.STUDENT })
      .getMany();

    if (enrollments.length === 0) return [];

    // Fetch all attendance records for the student across every enrolled
    // section in ONE query (was N+1 — one query per enrollment).
    const sectionIds = enrollments.map((e) => e.sectionId);
    const allRecords = await this.attendanceRepo.find({
      where: { userId, sectionId: In(sectionIds), tenantId },
    });

    // Bucket records by section in memory.
    const bySection = new Map<string, typeof allRecords>();
    for (const r of allRecords) {
      const bucket = bySection.get(r.sectionId);
      if (bucket) bucket.push(r);
      else bySection.set(r.sectionId, [r]);
    }

    return enrollments.map((e) => {
      const records = bySection.get(e.sectionId) ?? [];
      let present = 0,
        absent = 0,
        late = 0,
        excused = 0;
      for (const r of records) {
        if (r.status === AttendanceStatus.PRESENT) present++;
        else if (r.status === AttendanceStatus.ABSENT) absent++;
        else if (r.status === AttendanceStatus.LATE) late++;
        else if (r.status === AttendanceStatus.EXCUSED) excused++;
      }
      const total = records.length;
      const attendanceRate =
        total > 0
          ? Math.round(((present + late + excused) / total) * 10000) / 100
          : 100;

      return {
        userId,
        sectionId: e.sectionId,
        firstName: e.user.firstName,
        lastName: e.user.lastName,
        total,
        present,
        absent,
        late,
        excused,
        attendanceRate,
      };
    });
  }
}
