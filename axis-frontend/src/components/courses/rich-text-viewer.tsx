'use client';

/**
 * WHY dangerouslySetInnerHTML: The `html` here is rich text the backend has
 * already sanitised on write (see `sanitizeRichText` in the backend
 * `common/sanitize.ts`). Every mutation that stores a rich-text body runs it
 * through a default-deny allowlist that strips scripts, event handlers, and
 * unsafe URL schemes, so the persisted HTML is safe to render directly.
 *
 * Do NOT relax this assumption by rendering un-sanitised HTML from any source —
 * the server is the single trust boundary, including for student-authored
 * discussion posts.
 */
interface RichTextViewerProps {
  html: string;
  className?: string;
}

export function RichTextViewer({ html, className = '' }: RichTextViewerProps) {
  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
