import { ValidationPipe } from '@nestjs/common';
import { StudentCatalogFilter } from './catalog-student.types';
import { CourseCategory } from '../../../database/entities/course.entity';

/**
 * Regression: StudentCatalogFilter had no class-validator decorators, so the
 * global pipe (whitelist + forbidNonWhitelisted) rejected every field and the
 * student course catalog never loaded. Mirrors the pipe options in main.ts.
 */
describe('StudentCatalogFilter validation', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const validate = (value: Record<string, unknown>) =>
    pipe.transform(value, { type: 'body', metatype: StudentCatalogFilter });

  it('accepts the defaults GraphQL applies (limit/offset)', async () => {
    await expect(validate({ limit: 20, offset: 0 })).resolves.toBeInstanceOf(
      StudentCatalogFilter,
    );
  });

  it('accepts every documented filter', async () => {
    await expect(
      validate({
        search: 'CSC',
        termId: 'term-1',
        department: 'Computer Science',
        category: CourseCategory.CORE,
        courseLevel: 100,
        hasSeats: true,
        limit: 50,
        offset: 20,
      }),
    ).resolves.toBeInstanceOf(StudentCatalogFilter);
  });

  it('rejects page sizes above the cap', async () => {
    await expect(validate({ limit: 5000 })).rejects.toThrow();
  });

  it('still rejects unknown properties', async () => {
    await expect(validate({ bogus: 1 })).rejects.toThrow();
  });
});
