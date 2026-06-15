import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UploadsCleanupService } from './uploads-cleanup.service';
import { UploadsService } from './uploads.service';
import { FileUpload } from './entities/file-upload.entity';
import { User } from '../../database/entities/user.entity';
import {
  createMockRepository,
  createMockQueryBuilder,
  setupQueryBuilder,
  MockRepository,
} from '../../test/mocks/repository.mock';

describe('UploadsCleanupService', () => {
  let service: UploadsCleanupService;
  let fileRepo: MockRepository<FileUpload>;
  let userRepo: MockRepository<User>;
  let uploads: { deleteObjectByKey: jest.Mock };

  const orphan = (id: string, key: string): FileUpload =>
    ({ id, key, confirmed: false }) as FileUpload;

  beforeEach(async () => {
    fileRepo = createMockRepository<FileUpload>();
    userRepo = createMockRepository<User>();
    uploads = { deleteObjectByKey: jest.fn() };

    // Reset-token cleanup goes through a query builder returning 0 affected.
    const qb = createMockQueryBuilder<User>();
    // update()/set() aren't in the shared chainable set (it's keyed on
    // SelectQueryBuilder) — wire them on via a loose cast.
    const looseQb = qb as unknown as Record<string, jest.Mock>;
    looseQb.update = qb._chainable;
    looseQb.set = qb._chainable;
    (qb.execute as jest.Mock).mockResolvedValue({ affected: 0 });
    setupQueryBuilder(userRepo, qb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsCleanupService,
        { provide: getRepositoryToken(FileUpload), useValue: fileRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: UploadsService, useValue: uploads },
      ],
    }).compile();

    service = module.get(UploadsCleanupService);
  });

  it('purges the R2 object before deleting the row', async () => {
    const rows = [orphan('1', 'k1'), orphan('2', 'k2')];
    (fileRepo.find as jest.Mock).mockResolvedValue(rows);
    uploads.deleteObjectByKey.mockResolvedValue(true);

    await service.runCleanup();

    expect(uploads.deleteObjectByKey).toHaveBeenCalledTimes(2);
    expect(uploads.deleteObjectByKey).toHaveBeenCalledWith('k1');
    expect(fileRepo.remove).toHaveBeenCalledWith(rows);
  });

  it('keeps rows whose R2 object could not be deleted (retry next run)', async () => {
    const keep = orphan('1', 'k1');
    const purge = orphan('2', 'k2');
    (fileRepo.find as jest.Mock).mockResolvedValue([keep, purge]);
    uploads.deleteObjectByKey.mockImplementation((key: string) =>
      Promise.resolve(key === 'k2'),
    );

    await service.runCleanup();

    // Only the successfully-purged row is removed.
    expect(fileRepo.remove).toHaveBeenCalledWith([purge]);
  });

  it('does nothing to storage or rows when there are no orphans', async () => {
    (fileRepo.find as jest.Mock).mockResolvedValue([]);

    await service.runCleanup();

    expect(uploads.deleteObjectByKey).not.toHaveBeenCalled();
    expect(fileRepo.remove).not.toHaveBeenCalled();
  });
});
