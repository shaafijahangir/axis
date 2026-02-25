'use client';

import Link from 'next/link';
import { useState } from 'react';
import { GraduationCap, ChevronRight, Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/about', label: 'About' },
];

export function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <GraduationCap
              className="h-4.5 w-4.5 text-white"
              aria-hidden="true"
            />
          </div>
          <span className="text-lg font-bold tracking-tight">NexusEd</span>
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden md:flex items-center gap-1"
          aria-label="Marketing navigation"
        >
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
          >
            Get Started
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {/* Mobile: Get Started + Hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/register"
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
          >
            Get Started
          </Link>
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-6 py-4 space-y-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <div className="border-t border-slate-100 pt-3 mt-3">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Log in
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
