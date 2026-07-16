import { ToolDefinition } from './tool.interface';
import { OfficeHoursService } from '../../office-hours/office-hours.service';

/**
 * Office-hours tools (FEAT-018) — wraps OfficeHoursService as AI-callable tools.
 *
 * PATTERN: Factory + Closure, same as createCourseTools — the injected service
 * is captured at registration time (see ai.module.ts).
 *
 * Governance tiers:
 * - list_office_hours: 'auto' — read-only discovery, safe to run unattended.
 * - book_office_hours: 'suggest' — creates a real-world commitment, so the AI
 *   proposes it and the student confirms before it executes.
 */
export function createOfficeHoursTools(
  officeHoursService: OfficeHoursService,
): ToolDefinition[] {
  return [
    {
      name: 'list_office_hours',
      description:
        "List an instructor's office-hours blocks and the next available slots. " +
        'Use when a student asks when they can meet a professor or wants to book time.',
      inputSchema: {
        type: 'object',
        properties: {
          instructorId: {
            type: 'string',
            description: 'The UUID of the instructor to look up',
          },
          startDate: {
            type: 'string',
            description:
              'Optional range start "YYYY-MM-DD" (defaults to today)',
          },
          endDate: {
            type: 'string',
            description:
              'Optional range end "YYYY-MM-DD" (defaults to two weeks out)',
          },
        },
        required: ['instructorId'],
      },
      handler: async (input, ctx) => {
        const instructorId = input.instructorId as string;
        const [blocks, slots] = await Promise.all([
          officeHoursService.listActiveBlocks(ctx.tenantId, instructorId),
          officeHoursService.computeAvailableSlots(ctx.tenantId, {
            instructorId,
            startDate: input.startDate as string | undefined,
            endDate: input.endDate as string | undefined,
          }),
        ]);
        return {
          blocks: blocks.map((b) => ({
            id: b.id,
            dayOfWeek: b.dayOfWeek,
            startTime: b.startTime,
            endTime: b.endTime,
            slotMinutes: b.slotMinutes,
            locationType: b.locationType,
            location: b.location,
            meetingUrl: b.meetingUrl,
          })),
          // Cap the list so a wide range doesn't flood the model's context.
          nextAvailableSlots: slots.slice(0, 20),
        };
      },
      requiredPermissions: ['office_hours.read'],
      actionType: 'auto',
    },
    {
      name: 'book_office_hours',
      description:
        'Book an office-hours slot for the current student. Provide the blockId, ' +
        'the date "YYYY-MM-DD" and the slot startTime "HH:MM" from list_office_hours, ' +
        'plus an optional topic note.',
      inputSchema: {
        type: 'object',
        properties: {
          blockId: { type: 'string', description: 'The UUID of the block' },
          date: { type: 'string', description: 'Slot date "YYYY-MM-DD"' },
          startTime: { type: 'string', description: 'Slot start "HH:MM"' },
          note: {
            type: 'string',
            description: 'Optional topic the student wants to discuss',
          },
        },
        required: ['blockId', 'date', 'startTime'],
      },
      handler: async (input, ctx) => {
        const booking = await officeHoursService.bookSlot(
          ctx.tenantId,
          ctx.userId,
          {
            blockId: input.blockId as string,
            date: input.date as string,
            startTime: input.startTime as string,
            note: input.note as string | undefined,
          },
        );
        return {
          bookingId: booking.id,
          date: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
          locationType: booking.block?.locationType,
          location: booking.block?.location,
          meetingUrl: booking.block?.meetingUrl,
          status: booking.status,
        };
      },
      requiredPermissions: ['office_hours.write'],
      actionType: 'suggest',
    },
  ];
}
