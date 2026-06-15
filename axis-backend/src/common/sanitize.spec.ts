import { sanitizeRichText } from './sanitize';

describe('sanitizeRichText', () => {
  it('passes through null and undefined unchanged', () => {
    expect(sanitizeRichText(null)).toBeNull();
    expect(sanitizeRichText(undefined)).toBeUndefined();
  });

  it('preserves allowed Tiptap formatting tags', () => {
    const html =
      '<p>Hello <strong>world</strong> and <em>friends</em></p><ul><li>one</li></ul>';
    expect(sanitizeRichText(html)).toBe(html);
  });

  it('strips <script> tags and their contents', () => {
    const out = sanitizeRichText('<p>hi</p><script>alert(1)</script>');
    expect(out).toBe('<p>hi</p>');
    expect(out).not.toContain('alert');
  });

  it('removes inline event-handler attributes', () => {
    const out = sanitizeRichText(
      '<img src="x" onerror="alert(document.cookie)" />',
    );
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('alert');
  });

  it('strips javascript: URLs from links', () => {
    const out = sanitizeRichText('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain('javascript:');
  });

  it('drops iframes and embeds', () => {
    const out = sanitizeRichText(
      '<p>ok</p><iframe src="https://evil.test"></iframe>',
    );
    expect(out).toBe('<p>ok</p>');
  });

  it('forces rel=noopener on links', () => {
    const out = sanitizeRichText('<a href="https://example.com">x</a>');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
  });

  it('keeps safe images but strips disallowed attributes', () => {
    const out = sanitizeRichText(
      '<img src="https://cdn.test/a.png" alt="a" onclick="x()" />',
    );
    expect(out).toContain('src="https://cdn.test/a.png"');
    expect(out).toContain('alt="a"');
    expect(out).not.toContain('onclick');
  });

  it('neutralises a nested obfuscated payload', () => {
    const out = sanitizeRichText(
      '<div><p>safe</p><svg/onload=alert(1)><math><mtext></mtext></math></div>',
    );
    expect(out).not.toContain('onload');
    expect(out).not.toContain('alert');
    expect(out).toContain('safe');
  });
});
