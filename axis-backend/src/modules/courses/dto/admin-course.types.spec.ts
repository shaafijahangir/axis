import { ValidationPipe } from '@nestjs/common';
import { BulkEnrollInput } from './admin-course.types';

/** Regression: `userIds` had no validators and the global pipe rejected it. */
describe('BulkEnrollInput validation', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const validate = (value: Record<string, unknown>) =>
    pipe.transform(value, { type: 'body', metatype: BulkEnrollInput });
  const uuid = '11111111-1111-1111-1111-111111111111';

  it('accepts a list of user ids', async () => {
    await expect(
      validate({ sectionId: uuid, userIds: [uuid] }),
    ).resolves.toBeInstanceOf(BulkEnrollInput);
  });

  it('rejects non-uuid and duplicate ids', async () => {
    await expect(
      validate({ sectionId: uuid, userIds: ['x'] }),
    ).rejects.toThrow();
    await expect(
      validate({ sectionId: uuid, userIds: [uuid, uuid] }),
    ).rejects.toThrow();
  });
});
