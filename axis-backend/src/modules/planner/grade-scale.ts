/**
 * UVic letter-grade scale, used to enforce a requirement group's minGrade.
 *
 * WHY a rank table: grades compare by order, not by string. COM (complete)
 * and CR (credit) are pass/fail marks with no letter, so they count as a
 * pass for any minimum.
 */
const LETTER_RANK: Record<string, number> = {
  'A+': 9,
  A: 8,
  'A-': 7,
  'B+': 6,
  B: 5,
  'B-': 4,
  'C+': 3,
  C: 2,
  D: 1,
  F: 0,
};

const PASS_MARKS = new Set(['COM', 'CR']);

/**
 * True if `grade` satisfies `minGrade`.
 * - No minGrade: any record counts (legacy behaviour).
 * - No grade recorded: counts (legacy records predate grades).
 * - COM/CR: always a pass. Unknown marks never meet a minimum.
 */
export function meetsMinGrade(
  grade: string | null,
  minGrade: string | null,
): boolean {
  if (!minGrade) return true;
  if (grade === null || grade === undefined || grade === '') return true;
  const g = grade.trim().toUpperCase();
  if (PASS_MARKS.has(g)) return true;
  const rank = LETTER_RANK[g];
  const min = LETTER_RANK[minGrade.trim().toUpperCase()];
  if (rank === undefined || min === undefined) return false;
  return rank >= min;
}
