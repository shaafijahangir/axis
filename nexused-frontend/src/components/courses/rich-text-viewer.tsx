'use client';

/**
 * WHY dangerouslySetInnerHTML: Content is authored by instructors
 * (trusted tenant users) via Tiptap, which outputs sanitised HTML.
 * No user-generated raw HTML is accepted — only Tiptap's output.
 *
 * TRADEOFF: If we ever accept raw HTML from untrusted sources,
 * we'd need DOMPurify. Not needed now since authoring is gated
 * behind INSTRUCTOR/ADMIN roles.
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
