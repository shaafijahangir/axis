import sanitizeHtml from 'sanitize-html';

/**
 * Server-side HTML sanitisation for rich-text fields (Tiptap output).
 *
 * WHY: Every rich-text body (course content, discussions, replies) is rendered
 * on the frontend via `dangerouslySetInnerHTML`. The previous assumption was
 * "Tiptap produces safe HTML and only instructors author it" — both halves are
 * wrong. The GraphQL mutation accepts an arbitrary `String`, so an attacker can
 * POST `<img src=x onerror=alert(document.cookie)>` straight to the API,
 * bypassing the editor entirely; and discussions are authored by *students*,
 * not just staff. That is stored XSS against every viewer in the tenant.
 *
 * PATTERN: Never trust the client. Sanitise on write so the database only ever
 * holds clean HTML, and every read path (current and future) is safe without
 * re-sanitising. An allowlist (default-deny) is used rather than a blocklist:
 * we permit exactly the tags Tiptap emits and drop everything else, including
 * all event-handler attributes and `javascript:` URLs.
 *
 * TRADEOFF: A legitimate instructor cannot embed raw `<script>`, `<iframe>`, or
 * inline styles. That is intentional — embeds should go through a dedicated,
 * reviewed feature, not arbitrary markup in a text field.
 */
const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'strike',
    'code',
    'pre',
    'blockquote',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'a',
    'img',
    'hr',
    'span',
    'mark',
    'sub',
    'sup',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    span: ['data-type'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
  },
  // Only safe link/image protocols. Blocks javascript:, data: (except images), vbscript:.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  // Force external links to be safe.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', {
      rel: 'noopener noreferrer nofollow',
    }),
  },
  // Strip the contents of disallowed tags entirely (e.g. <script>...</script>).
  disallowedTagsMode: 'discard',
};

/**
 * Sanitise a rich-text HTML string. Null/undefined pass through unchanged so
 * callers can use it on optional fields without extra guards.
 */
export function sanitizeRichText<T extends string | null | undefined>(
  html: T,
): T {
  if (html == null) {
    return html;
  }
  return sanitizeHtml(html, RICH_TEXT_OPTIONS) as T;
}
