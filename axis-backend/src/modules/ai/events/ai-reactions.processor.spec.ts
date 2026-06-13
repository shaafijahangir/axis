import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { AiReactionsProcessor } from './ai-reactions.processor';
import { AgentExecutorService } from '../agent-executor.service';
import { CourseSection } from '../../../database/entities/course-section.entity';
import { Assignment } from '../../../database/entities/assignment.entity';
import { Submission } from '../../../database/entities/submission.entity';
import { AiReactionJob } from './ai-reactions.queue';
import {
  createMockRepository,
  MockRepository,
} from '../../../test/mocks/repository.mock';

describe('AiReactionsProcessor', () => {
  let processor: AiReactionsProcessor;
  let agentExecutor: { startConversation: jest.Mock };
  let sectionRepo: MockRepository<CourseSection>;
  let assignmentRepo: MockRepository<Assignment>;
  let submissionRepo: MockRepository<Submission>;

  beforeEach(async () => {
    agentExecutor = { startConversation: jest.fn().mockResolvedValue({}) };
    sectionRepo = createMockRepository<CourseSection>();
    assignmentRepo = createMockRepository<Assignment>();
    submissionRepo = createMockRepository<Submission>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiReactionsProcessor,
        { provide: AgentExecutorService, useValue: agentExecutor },
        { provide: getRepositoryToken(CourseSection), useValue: sectionRepo },
        { provide: getRepositoryToken(Assignment), useValue: assignmentRepo },
        { provide: getRepositoryToken(Submission), useValue: submissionRepo },
      ],
    }).compile();

    processor = module.get(AiReactionsProcessor);
  });

  const job = (name: AiReactionJob, data: unknown) =>
    ({ name, data }) as unknown as Job;

  describe('enrollment welcome', () => {
    it('starts a study-coach conversation', async () => {
      sectionRepo.findOne!.mockResolvedValue({
        id: 'sec1',
        course: { id: 'c1', code: 'CS101', title: 'Intro' },
      });

      await processor.process(
        job(AiReactionJob.ENROLLMENT_WELCOME, {
          tenantId: 't1',
          userId: 'u1',
          sectionId: 'sec1',
        }),
      );

      expect(agentExecutor.startConversation).toHaveBeenCalledWith(
        expect.objectContaining({ agentType: 'study-coach', userId: 'u1' }),
      );
    });

    it('swallows (no retry) when the section is gone', async () => {
      sectionRepo.findOne!.mockResolvedValue(null);

      await expect(
        processor.process(
          job(AiReactionJob.ENROLLMENT_WELCOME, {
            tenantId: 't1',
            userId: 'u1',
            sectionId: 'gone',
          }),
        ),
      ).resolves.toBeUndefined();
      expect(agentExecutor.startConversation).not.toHaveBeenCalled();
    });

    it('propagates (triggers retry) when the agent call fails transiently', async () => {
      sectionRepo.findOne!.mockResolvedValue({
        id: 'sec1',
        course: { id: 'c1', code: 'CS101', title: 'Intro' },
      });
      agentExecutor.startConversation.mockRejectedValueOnce(
        new Error('529 overloaded'),
      );

      await expect(
        processor.process(
          job(AiReactionJob.ENROLLMENT_WELCOME, {
            tenantId: 't1',
            userId: 'u1',
            sectionId: 'sec1',
          }),
        ),
      ).rejects.toThrow('529 overloaded');
    });
  });

  describe('grade support', () => {
    it('triggers support only below the threshold', async () => {
      submissionRepo.findOne!.mockResolvedValue({
        id: 's1',
        assignment: {
          id: 'a1',
          title: 'HW',
          pointsPossible: 100,
          sectionId: 'sec1',
        },
        user: { id: 'u1' },
      });

      // 40/100 = 40% < 60% threshold → support fires
      await processor.process(
        job(AiReactionJob.GRADE_SUPPORT, {
          tenantId: 't1',
          submissionId: 's1',
          newScore: 40,
        }),
      );

      expect(agentExecutor.startConversation).toHaveBeenCalledWith(
        expect.objectContaining({ agentType: 'study-coach' }),
      );
    });

    it('does nothing above the threshold', async () => {
      submissionRepo.findOne!.mockResolvedValue({
        id: 's1',
        assignment: {
          id: 'a1',
          title: 'HW',
          pointsPossible: 100,
          sectionId: 'sec1',
        },
        user: { id: 'u1' },
      });

      // 80/100 = 80% ≥ 60% → no support
      await processor.process(
        job(AiReactionJob.GRADE_SUPPORT, {
          tenantId: 't1',
          submissionId: 's1',
          newScore: 80,
        }),
      );

      expect(agentExecutor.startConversation).not.toHaveBeenCalled();
    });
  });
});
