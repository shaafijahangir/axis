import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { AiEventListener } from './ai-event.listener';
import {
  AI_REACTIONS_QUEUE,
  AiReactionJob,
  AI_REACTION_JOB_OPTS,
} from './ai-reactions.queue';

describe('AiEventListener', () => {
  let listener: AiEventListener;
  let queue: { add: jest.Mock };

  beforeEach(async () => {
    queue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiEventListener,
        { provide: getQueueToken(AI_REACTIONS_QUEUE), useValue: queue },
      ],
    }).compile();

    listener = module.get(AiEventListener);
  });

  it('enqueues an enrollment-welcome job with retry options', async () => {
    await listener.handleEnrollmentCreated({
      tenantId: 't1',
      userId: 'u1',
      sectionId: 'sec1',
    });

    expect(queue.add).toHaveBeenCalledWith(
      AiReactionJob.ENROLLMENT_WELCOME,
      { tenantId: 't1', userId: 'u1', sectionId: 'sec1' },
      AI_REACTION_JOB_OPTS,
    );
    expect(AI_REACTION_JOB_OPTS.attempts).toBe(3);
  });

  it('enqueues a submission-feedback job', async () => {
    await listener.handleSubmissionCreated({
      tenantId: 't1',
      assignmentId: 'a1',
      submissionId: 's1',
    });

    expect(queue.add).toHaveBeenCalledWith(
      AiReactionJob.SUBMISSION_FEEDBACK,
      { tenantId: 't1', assignmentId: 'a1', submissionId: 's1' },
      AI_REACTION_JOB_OPTS,
    );
  });

  it('enqueues a grade-support job', async () => {
    await listener.handleGradeUpdated({
      tenantId: 't1',
      submissionId: 's1',
      newScore: 42,
    });

    expect(queue.add).toHaveBeenCalledWith(
      AiReactionJob.GRADE_SUPPORT,
      { tenantId: 't1', submissionId: 's1', newScore: 42 },
      AI_REACTION_JOB_OPTS,
    );
  });

  it('does not throw to the caller if the queue is unavailable', async () => {
    queue.add.mockRejectedValueOnce(new Error('redis down'));

    // The originating action (enrollment) must still succeed.
    await expect(
      listener.handleEnrollmentCreated({
        tenantId: 't1',
        userId: 'u1',
        sectionId: 'sec1',
      }),
    ).resolves.toBeUndefined();
  });
});
