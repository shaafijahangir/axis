import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

const PRODUCT_LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/about', label: 'About' },
  { href: '/login', label: 'Log in' },
  { href: '/register', label: 'Get started' },
];

const INSTITUTION_LINKS = [
  { href: '/features', label: 'AI Catalog Import' },
  { href: '/features', label: 'Graduation Planning' },
  { href: '/features', label: 'LTI 1.3 Integration' },
  { href: '/features', label: 'Multi-tenant SaaS' },
];

const STUDENT_LINKS = [
  { href: '/features', label: 'AI Study Coach' },
  { href: '/features', label: 'Smart Enrollment' },
  { href: '/features', label: 'Graduation Roadmap' },
  { href: '/features', label: 'Feed-first Dashboard' },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-muted">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <GraduationCap
                  className="h-4.5 w-4.5 text-primary-foreground"
                  aria-hidden="true"
                />
              </div>
              <span className="font-bold text-foreground">Axis</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI-native LMS built by someone who lived the problem, for every
              student who deserves better.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Product
            </h3>
            <ul className="space-y-2.5">
              {PRODUCT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Institutions */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              For Institutions
            </h3>
            <ul className="space-y-2.5">
              {INSTITUTION_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Students */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              For Students
            </h3>
            <ul className="space-y-2.5">
              {STUDENT_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Axis. Built to serve students
            first.
          </p>
          <p className="text-xs text-muted-foreground">
            Questions?{' '}
            <a
              href="mailto:hello@Axis.app"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              hello@Axis.app
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
