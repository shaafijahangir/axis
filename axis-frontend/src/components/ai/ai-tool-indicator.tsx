'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Human-friendly labels for AI tools.
 * Maps internal tool names to user-facing descriptions.
 */
const toolLabels: Record<string, string> = {
  list_courses: 'Looked up your courses',
  get_course: 'Checked course details',
  get_course_sections: 'Checked course sections',
  get_section: 'Checked section details',
  get_course_stats: 'Analyzed course statistics',
  get_student_enrollments: 'Checked your enrollments',
  enroll_student: 'Enrolled student in course',
  list_section_assignments: 'Listed assignments',
  get_assignment: 'Reviewed assignment details',
  get_student_submissions: 'Checked your submissions',
  get_assignment_submissions: 'Reviewed all submissions',
  get_submission_details: 'Reviewed submission',
  draft_feedback: 'Drafted feedback',
  get_grade_distribution: 'Analyzed grade distribution',
  get_student_performance: 'Analyzed your performance',
  get_section_enrollment_count: 'Counted enrollments',
};

function getToolLabel(toolName: string): string {
  return toolLabels[toolName] || `Used ${toolName.replace(/_/g, ' ')}`;
}

interface AiToolIndicatorProps {
  toolCalls: Record<string, unknown>[];
}

/**
 * Collapsible badge showing which tools the AI used.
 * Shows count when collapsed, full list when expanded.
 */
export function AiToolIndicator({ toolCalls }: AiToolIndicatorProps) {
  const [expanded, setExpanded] = useState(false);

  // Extract tool names from tool calls
  const toolNames = toolCalls
    .map((call) => (call as { name?: string }).name)
    .filter((name): name is string => !!name);

  if (toolNames.length === 0) return null;

  return (
    <div className="mt-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex items-center gap-1.5 text-xs text-muted-foreground',
          'hover:text-foreground transition-colors',
        )}
      >
        <Wrench className="h-3 w-3" />
        <span>
          Used {toolNames.length} tool{toolNames.length !== 1 ? 's' : ''}
        </span>
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {expanded && (
        <ul className="mt-1.5 space-y-0.5 pl-5 text-xs text-muted-foreground">
          {toolNames.map((name, i) => (
            <li key={i} className="list-disc">
              {getToolLabel(name)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
