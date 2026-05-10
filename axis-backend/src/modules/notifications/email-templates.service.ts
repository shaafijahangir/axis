import { Injectable } from '@nestjs/common';

/**
 * WHY plain HTML over React Email: No render step, no extra dependency,
 * inline styles work universally across email clients including Outlook.
 * The templates are simple enough that the overhead of React Email
 * wouldn't be justified.
 *
 * PATTERN: Each template method returns { subject, html } so callers
 * don't have to know about template internals.
 */
@Injectable()
export class EmailTemplatesService {
  private readonly brandColor = '#2563eb'; // Tailwind blue-600
  private readonly bgColor = '#f8fafc';
  private readonly cardBg = '#ffffff';
  private readonly textPrimary = '#0f172a';
  private readonly textMuted = '#64748b';
  private readonly borderColor = '#e2e8f0';

  private layout(content: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Axis</title>
</head>
<body style="margin:0;padding:0;background-color:${this.bgColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${this.bgColor};padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;">
              <span style="font-size:20px;font-weight:700;color:${this.brandColor};letter-spacing:-0.5px;">Axis</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:${this.cardBg};border:1px solid ${this.borderColor};border-radius:8px;padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;font-size:12px;color:${this.textMuted};">
              You're receiving this because you have an account on Axis.<br>
              To manage your notification preferences, visit your account settings.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private h1(text: string): string {
    return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${this.textPrimary};letter-spacing:-0.3px;">${text}</h1>`;
  }

  private p(text: string): string {
    return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${this.textPrimary};">${text}</p>`;
  }

  private muted(text: string): string {
    return `<p style="margin:0 0 16px;font-size:13px;color:${this.textMuted};">${text}</p>`;
  }

  private badge(text: string, color: string = this.brandColor): string {
    return `<span style="display:inline-block;background-color:${color};color:#fff;font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px;">${text}</span>`;
  }

  private cta(text: string, url: string): string {
    return `<a href="${url}" style="display:inline-block;background-color:${this.brandColor};color:#fff;font-size:14px;font-weight:600;padding:10px 24px;border-radius:6px;text-decoration:none;margin-top:8px;">${text}</a>`;
  }

  private divider(): string {
    return `<hr style="border:none;border-top:1px solid ${this.borderColor};margin:20px 0;">`;
  }

  // ─── Templates ───────────────────────────────────────────────────────────

  submissionGraded(data: {
    studentName: string;
    assignmentTitle: string;
    courseCode: string;
    score: number;
    pointsPossible: number;
    feedback?: string;
    appUrl: string;
  }): { subject: string; html: string } {
    const pct = Math.round((data.score / data.pointsPossible) * 100);
    const scoreColor =
      pct >= 70 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';

    const content = `
      ${this.h1('Your assignment has been graded')}
      ${this.muted(data.courseCode)}
      ${this.divider()}
      ${this.p(`<strong>${data.assignmentTitle}</strong>`)}
      <div style="margin:20px 0;">
        <span style="font-size:36px;font-weight:700;color:${scoreColor};">${data.score}</span>
        <span style="font-size:18px;color:${this.textMuted};">/${data.pointsPossible}</span>
        <span style="margin-left:12px;">${this.badge(`${pct}%`, scoreColor)}</span>
      </div>
      ${data.feedback ? `${this.divider()}${this.p('<strong>Feedback</strong>')}<p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:${this.textPrimary};background:${this.bgColor};padding:12px 16px;border-radius:6px;border-left:3px solid ${this.brandColor};">${data.feedback}</p>` : ''}
      ${this.cta('View Submission', data.appUrl)}
    `;
    return {
      subject: `Graded: ${data.assignmentTitle} — ${data.score}/${data.pointsPossible} (${pct}%)`,
      html: this.layout(content),
    };
  }

  assignmentCreated(data: {
    studentName: string;
    assignmentTitle: string;
    courseCode: string;
    courseTitle: string;
    dueAt: Date | null;
    pointsPossible: number;
    appUrl: string;
  }): { subject: string; html: string } {
    const dueStr = data.dueAt
      ? data.dueAt.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : 'No deadline';

    const content = `
      ${this.h1('New assignment posted')}
      ${this.muted(`${data.courseCode} · ${data.courseTitle}`)}
      ${this.divider()}
      ${this.p(`<strong>${data.assignmentTitle}</strong>`)}
      <table cellpadding="0" cellspacing="0" style="margin:16px 0;">
        <tr>
          <td style="padding-right:32px;">
            <div style="font-size:12px;color:${this.textMuted};margin-bottom:4px;">DUE</div>
            <div style="font-size:14px;font-weight:600;color:${this.textPrimary};">${dueStr}</div>
          </td>
          <td>
            <div style="font-size:12px;color:${this.textMuted};margin-bottom:4px;">POINTS</div>
            <div style="font-size:14px;font-weight:600;color:${this.textPrimary};">${data.pointsPossible}</div>
          </td>
        </tr>
      </table>
      ${this.cta('View Assignment', data.appUrl)}
    `;
    return {
      subject: `New assignment: ${data.assignmentTitle} — due ${dueStr}`,
      html: this.layout(content),
    };
  }

  enrollmentConfirmed(data: {
    studentName: string;
    courseCode: string;
    courseTitle: string;
    instructorName: string;
    appUrl: string;
  }): { subject: string; html: string } {
    const content = `
      ${this.h1("You're enrolled!")}
      ${this.p(`Welcome to <strong>${data.courseCode}: ${data.courseTitle}</strong>.`)}
      <div style="background:${this.bgColor};border:1px solid ${this.borderColor};border-radius:6px;padding:16px;margin:16px 0 24px;">
        <div style="font-size:12px;color:${this.textMuted};margin-bottom:6px;">INSTRUCTOR</div>
        <div style="font-size:14px;font-weight:600;color:${this.textPrimary};">${data.instructorName}</div>
      </div>
      ${this.p('Head to your course to review the syllabus and upcoming assignments.')}
      ${this.cta('Go to Course', data.appUrl)}
    `;
    return {
      subject: `Enrolled in ${data.courseCode}: ${data.courseTitle}`,
      html: this.layout(content),
    };
  }

  dueDateReminder(data: {
    studentName: string;
    assignmentTitle: string;
    courseCode: string;
    dueAt: Date;
    hoursUntilDue: number;
    appUrl: string;
  }): { subject: string; html: string } {
    const urgency = data.hoursUntilDue <= 2 ? '🚨 Due soon' : '⏰ Reminder';
    const urgencyColor = data.hoursUntilDue <= 2 ? '#dc2626' : '#d97706';
    const timeLabel =
      data.hoursUntilDue <= 2
        ? `in ${data.hoursUntilDue} hour${data.hoursUntilDue !== 1 ? 's' : ''}`
        : 'tomorrow';

    const dueStr = data.dueAt.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const content = `
      <div style="margin-bottom:16px;">${this.badge(urgency, urgencyColor)}</div>
      ${this.h1(`Assignment due ${timeLabel}`)}
      ${this.muted(data.courseCode)}
      ${this.divider()}
      ${this.p(`<strong>${data.assignmentTitle}</strong>`)}
      <p style="margin:0 0 24px;font-size:14px;color:${urgencyColor};font-weight:600;">Due: ${dueStr}</p>
      ${this.cta('Submit Now', data.appUrl)}
    `;
    return {
      subject: `${data.hoursUntilDue <= 2 ? '🚨' : '⏰'} Due ${timeLabel}: ${data.assignmentTitle}`,
      html: this.layout(content),
    };
  }
}
