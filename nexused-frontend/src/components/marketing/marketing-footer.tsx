import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

export function MarketingFooter() {
  return (
    <footer className="py-12 bg-card border-t">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <GraduationCap
                className="h-5 w-5 text-primary"
                aria-hidden="true"
              />
              <span className="font-bold">NexusEd</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI-native LMS built by someone who lived the problem, for every
              student who deserves better.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Product
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/features"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Log in
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Get started
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              For Institutions
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>AI Catalog Import</li>
              <li>Graduation Planning</li>
              <li>LTI 1.3 Integration</li>
              <li>Multi-tenant SaaS</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              For Students
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>AI Study Coach</li>
              <li>Smart Enrollment</li>
              <li>Graduation Roadmap</li>
              <li>Feed-first dashboard</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} NexusEd. Built to serve students
            first.
          </p>
          <p>
            Questions?{' '}
            <a
              href="mailto:hello@nexused.app"
              className="hover:text-foreground transition-colors"
            >
              hello@nexused.app
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
