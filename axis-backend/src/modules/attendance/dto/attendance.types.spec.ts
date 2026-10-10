import { ValidationPipe } from '@nestjs/common';
import { MarkAttendanceInput } from './attendance.types';
import { AttendanceStatus } from '../../../database/entities/attendance.entity';

/** Regression: `records` had no validators and the global pipe rejected it. */
describe('MarkAttendanceInput validation', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const validate = (value: Record<string, unknown>) =>
    pipe.transform(value, { type: 'body', metatype: MarkAttendanceInput });
  const uuid = '11111111-1111-1111-1111-111111111111';

  it('accepts records', async () => {
    await expect(
      validate({
        sectionId: uuid,
        date: '2026-10-08',
        records: [{ studentId: uuid, status: AttendanceStatus.PRESENT }],
      }),
    ).resolves.toBeInstanceOf(MarkAttendanceInput);
  });

  it('validates each nested record', async () => {
    await expect(
      validate({
        sectionId: uuid,
        date: '2026-10-08',
        records: [{ studentId: 'not-a-uuid', status: 'nope' }],
      }),
    ).rejects.toThrow();
  });
});
