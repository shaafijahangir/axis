# NexusEd Design System

> This document defines the visual language of NexusEd. Every UI decision should reference these principles and tokens. The goal: a tool that feels calm, professional, and invisible — so the learning content stays front and center.

---

## Design Principles

### 1. Content First
The UI exists to serve academic content, not to impress. Every pixel of chrome (navigation, borders, shadows) must justify its existence. If removing an element doesn't hurt usability, remove it.

### 2. Minimal and Quiet
- No gratuitous animations, transitions, or visual effects
- No bright colors competing for attention — accent colors are reserved for meaning (deadlines, grades, errors)
- White space is a feature, not wasted space
- The interface should feel like a clean notebook, not a social media feed

### 3. Professional, Not Playful
NexusEd serves universities and institutions. The aesthetic is closer to Notion or Linear than Kahoot or Duolingo. No rounded-everything, no bouncy animations, no emoji-heavy UI.

### 4. Instantly Learnable
- Three navigation items per role (max four for admin). If we need more, the IA is wrong.
- Every action should be reachable in two clicks or fewer from the home feed
- Labels over icons. Icons alone are ambiguous. Use icon + text, or text only.
- Consistent layout patterns — once you learn one page, you know how every page works

### 5. Accessible by Default
- WCAG 2.1 AA compliance is the minimum, not the goal
- Every interactive element has visible focus states
- Color is never the only indicator of state (always pair with text or icons)
- Motion respects `prefers-reduced-motion`
- High contrast mode and forced colors (Windows) are supported

---

## Technology Stack

| Layer | Tool | Notes |
|-------|------|-------|
| CSS Framework | Tailwind CSS 4 | Utility-first, CSS variable theming |
| Component Library | shadcn/ui (Radix UI primitives) | Copy-paste, we own the code |
| Typography | Geist Sans / Geist Mono (Vercel) | Clean, geometric, professional |
| Icons | Lucide React | Consistent stroke-based icon set |
| Forms | react-hook-form + zod | Type-safe validation |
| Rich Text | Tiptap (ProseMirror) | For course content editor |
| Toasts | Sonner | Bottom-right, non-intrusive |

---

## Color System

All colors are defined as HSL triplets in CSS custom properties (`globals.css`), consumed via Tailwind's `hsl(var(--token))` pattern. This enables light/dark mode with a single class toggle.

### Semantic Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `background` | White | Near-black `hsl(240 10% 3.9%)` | Page background |
| `foreground` | Near-black | Near-white | Default body text |
| `card` / `card-foreground` | White / Dark | Dark / Light | Card surfaces and text |
| `primary` / `primary-foreground` | Dark navy / White | White / Dark navy | Primary buttons, active nav items, brand |
| `secondary` / `secondary-foreground` | Light gray / Dark | Dark gray / Light | Secondary buttons, inactive elements |
| `muted` / `muted-foreground` | Light gray / Mid-gray | Dark gray / Light gray | Disabled states, helper text, metadata |
| `accent` / `accent-foreground` | Light gray / Dark | Dark gray / Light | Hover states, subtle highlights |
| `destructive` / `destructive-foreground` | Red / White | Dark red / White | Errors, delete actions, failed states |
| `border` | Light gray | Dark gray | Card borders, dividers, table lines |
| `input` | Light gray | Dark gray | Form field borders |
| `ring` | Dark navy | Light | Focus rings on interactive elements |

### Functional Colors (Hardcoded Tailwind)

Used sparingly for semantic meaning in specific contexts:

| Color | Usage | Tailwind Class |
|-------|-------|----------------|
| Amber-500 | Deadlines, warnings, due dates | `text-amber-500`, `border-l-amber-500` |
| Green-500 | Grades posted, success states | `text-green-500`, `border-l-green-500` |
| Blue-500 | Announcements, informational | `text-blue-500`, `border-l-blue-500` |
| Purple-500 | Course updates, content changes | `text-purple-500`, `border-l-purple-500` |

**Rule:** These functional colors appear ONLY in feed cards and status indicators. They are not used for general UI styling.

---

## Typography

### Font Stack

```css
--font-sans: Geist Sans, system-ui, sans-serif
--font-mono: Geist Mono, monospace
```

### Scale

| Usage | Tailwind | Size | Weight |
|-------|----------|------|--------|
| Page title | `text-2xl font-bold` | 1.5rem | 700 |
| Section heading | `text-lg font-semibold` | 1.125rem | 600 |
| Card title | `font-semibold` | 1rem (base) | 600 |
| Body text | `text-sm` | 0.875rem | 400 |
| Helper text / metadata | `text-sm text-muted-foreground` | 0.875rem | 400 |
| Tiny labels | `text-xs text-muted-foreground` | 0.75rem | 400 |

**Rules:**
- Maximum two font weights on any single page (regular + semibold, or regular + bold)
- Geist Mono is only for code blocks and data values, never for UI text
- Line heights are Tailwind defaults — don't override them

---

## Spacing

Tailwind's default spacing scale. Use these values consistently:

| Token | Value | Usage |
|-------|-------|-------|
| `p-6` / `space-y-6` | 1.5rem (24px) | Page padding, card padding, section spacing |
| `p-4` / `space-y-4` | 1rem (16px) | Inner card spacing, form field gaps |
| `space-y-2` | 0.5rem (8px) | Tight spacing between related elements |
| `space-y-1.5` | 0.375rem (6px) | Label-to-input gap (CardHeader) |
| `gap-2` | 0.5rem | Inline element spacing (icon + text) |

**Rule:** The standard page layout is `p-6` on the main content area. Cards use `p-6` for header/content. Don't use arbitrary spacing values.

---

## Border Radius

```css
--radius: 0.5rem (base)
--radius-sm: 0.25rem  (small buttons, badges)
--radius-md: 0.375rem (inputs, smaller cards)
--radius-lg: 0.5rem   (standard cards, dialogs)
--radius-xl: 0.75rem  (large containers)
```

Primary card radius: `rounded-xl` (the shadcn/ui default for Card).

---

## Component Patterns

### Card

The fundamental container for content. Used everywhere: feed items, course cards, forms, stats.

```tsx
<Card>                     {/* rounded-xl border bg-card shadow */}
  <CardHeader>             {/* p-6, flex-col, space-y-1.5 */}
    <CardTitle />          {/* font-semibold tracking-tight */}
    <CardDescription />    {/* text-sm text-muted-foreground */}
  </CardHeader>
  <CardContent>            {/* p-6 pt-0 */}
    {/* Content here */}
  </CardContent>
  <CardFooter>             {/* p-6 pt-0, flex items-center */}
    {/* Actions here */}
  </CardFooter>
</Card>
```

### Button Variants

| Variant | Usage | Appearance |
|---------|-------|------------|
| `default` | Primary actions (submit, create) | Solid primary background |
| `secondary` | Secondary actions (cancel, back) | Light gray background |
| `outline` | Tertiary actions, toggles | Border only |
| `ghost` | Inline actions, nav items | No background, hover reveals |
| `destructive` | Delete, remove, danger | Red background |
| `link` | Inline text links | Underlined text |

**Sizes:** `default` (h-9), `sm` (h-8), `lg` (h-10), `icon` (h-9 w-9, for icon-only buttons)

### Feed Card (Left-Accent Pattern)

Feed items use a `border-l-4` colored accent to indicate type at a glance:

```tsx
<Card className="border-l-4 border-l-amber-500">  {/* Deadline */}
  <CardContent className="p-4">
    <div className="flex items-start gap-3">
      <Clock className="h-5 w-5 text-amber-500 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  </CardContent>
</Card>
```

### Form Layout

```tsx
<Card>
  <CardHeader>
    <CardTitle>Create Thing</CardTitle>
    <CardDescription>Fill in the details below.</CardDescription>
  </CardHeader>
  <CardContent>
    <form className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register('name')} />
        {errors.name && (
          <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
        )}
      </div>
      {/* More fields... */}
      <Button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create'}
      </Button>
    </form>
  </CardContent>
</Card>
```

### Empty State

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Icon className="h-12 w-12 text-muted-foreground/50 mb-4" />
  <h3 className="font-semibold text-lg">No things yet</h3>
  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
    Description of what they can do to populate this view.
  </p>
  <Button className="mt-4">Create your first thing</Button>
</div>
```

### Loading / Skeleton

Use skeleton screens, not spinners. Skeletons maintain layout and feel faster.

```tsx
<Card>
  <CardContent className="p-4 space-y-3">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <Skeleton className="h-4 w-full" />
  </CardContent>
</Card>
```

Reserve spinners (`<Loader2 className="h-4 w-4 animate-spin" />`) for inline loading indicators only (e.g., inside a button during submission).

---

## Layout Patterns

### Dashboard Shell

```
┌────────────────────────────────────────────────┐
│ Skip Nav Link (visible on Tab)                  │
├──────────┬─────────────────────────────────────┤
│          │  TopNav (h-16, border-b, bg-card)    │
│ Sidebar  ├─────────────────────────────────────┤
│ (w-64)   │                                      │
│ bg-card  │  Main Content Area                   │
│ border-r │  (flex-1, overflow-y-auto, p-6)      │
│          │                                      │
│ Desktop  │  max-w-7xl mx-auto (optional)        │
│ only     │                                      │
├──────────┴─────────────────────────────────────┤
│ MobileNav (mobile only, bottom, h-16)           │
└────────────────────────────────────────────────┘
```

- Sidebar: `hidden md:block`, fixed `w-64`
- Mobile: Bottom navigation bar replaces sidebar
- Content area: Always `p-6` padding, scrollable independently

### Sidebar Navigation

- Active item: `bg-primary/10 text-primary font-medium`
- Inactive item: `text-muted-foreground hover:bg-accent hover:text-accent-foreground`
- Each item: icon (20px) + label + optional badge (unread count)
- Logo/brand area: `h-16` header with GraduationCap icon

### Two-Panel Layout (Messaging, AI Chat)

```
┌───────────────┬──────────────────────────────┐
│ List Panel    │ Detail/Thread Panel           │
│ (w-80)        │ (flex-1)                      │
│ border-r      │                               │
│ overflow-y    │ overflow-y                     │
│               │                               │
│ Selectable    │ Messages / content             │
│ items         │                               │
│               │ ─────────────────────────      │
│               │ Input area (bottom, sticky)   │
└───────────────┴──────────────────────────────┘
```

---

## Accessibility Checklist

Built into `globals.css` and component patterns:

| Requirement | Implementation |
|-------------|---------------|
| Skip navigation | `.skip-nav` link targets `#main-content` |
| Focus visible | `2px solid ring` on all `:focus-visible` elements |
| Reduced motion | All animations → 0.01ms under `prefers-reduced-motion` |
| High contrast | Stronger borders/rings under `prefers-contrast: more` |
| Forced colors | System palette respected under `forced-colors: active` |
| Screen readers | `role="article"` + `aria-label` on feed cards |
| Route changes | `RouteAnnouncer` + `FocusOnRouteChange` components |
| Color independence | Status always indicated by icon + text, never color alone |

---

## Do NOT

| Rule | Why |
|------|-----|
| No custom colors outside the palette | Use semantic tokens. If you need a new color, it's a design system change. |
| No animations unless purposeful | Motion should communicate state changes, not decorate. |
| No more than 2 font weights per page | Keeps visual hierarchy clean. |
| No icons without labels | Icons are ambiguous. Always pair with text for primary navigation. |
| No custom CSS / CSS modules | Tailwind utilities only. If Tailwind can't do it, reconsider the design. |
| No inline styles | Use Tailwind classes. |
| No new component primitives | Use shadcn/ui. If a primitive is missing, add it via `npx shadcn@latest add`. |
| No gradient backgrounds | Flat and clean. Gradients feel dated for a professional tool. |
| No rounded-full on containers | Reserve full rounding for avatars and badges only. |

---

*Last updated: 2026-02-17*
*Companion docs: [ARCHITECTURE.md](./ARCHITECTURE.md) | [CONVENTIONS.md](./CONVENTIONS.md) | [DATA-MODEL.md](./DATA-MODEL.md)*
