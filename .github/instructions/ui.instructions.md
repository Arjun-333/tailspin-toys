---
description: 'Central UI strategy and component development philosophy'
applyTo: '**/*.{astro,css}'
---

# UI Component Strategy

This file defines the central UI development strategy for Tailspin Toys. Technology-specific guidance is in separate instruction files.

## Documentation and comments

- Comment **why**: explain intent, constraints, trade-offs, or non-obvious decisions.
- Do not comment **what** the code already makes clear; avoid paraphrasing the next line.
- Keep comments current. When changing the related code, update or remove comments that no longer describe the implementation.
- Prefer a clear name and simple structure over a comment that explains straightforward mechanics.

## TypeScript formatting

For TypeScript and Astro frontmatter, use single-quoted strings, semicolons, trailing commas in multiline collections and calls, and spaces inside object braces. ESLint enforces these rules for `.ts` and `.astro` files.

## Related instruction files

- [`astro.instructions.md`](./astro.instructions.md) — page/component patterns for Astro, data fetching, and layout structure
- [`style.instructions.md`](./style.instructions.md) — Tailwind v4 styling, dark theme, and utility conventions
- [`playwright.instructions.md`](./playwright.instructions.md) — accessible, resilient browser-test authoring
- [`unit-tests.instructions.md`](./unit-tests.instructions.md) — Vitest + Drizzle data-layer test guidance
- [`drizzle.instructions.md`](./drizzle.instructions.md) — database schema and helper patterns

## Component Architecture

### Technology Separation

- **Astro** (`.astro` files): Pages, layouts, components, routing, and static content. The site is fully prerendered (`output: 'static'`), so components render to HTML at build time.
- **Tailwind CSS** (utility classes): Styling
- **Astro `<script>`**: Reach for a small client-side script only when genuine interactivity is required — there is no client-side UI framework.

Refer to technology-specific instruction files:
- [`astro.instructions.md`](astro.instructions.md) - Astro pages, layouts, and components
- [`style.instructions.md`](style.instructions.md) - Tailwind CSS styling patterns

## Core Principles

### Testability

- Every interactive element MUST include a `data-testid` attribute
- Use descriptive test IDs that identify the element's purpose and context
- Examples: `data-testid="game-card-{game.id}"`, `data-testid="submit-button"`, `data-testid="nav-home"`

### Accessibility

- Use semantic HTML elements (`<nav>`, `<main>`, `<article>`, `<button>`)
- Provide ARIA labels and roles where semantic HTML isn't sufficient
- Use plain `<nav>` with `<a>`/`<button>` elements for site navigation — do **not** add `role="menu"`. Reserve `role="menu"` / `role="menuitem"` for true application-style menus that implement full composite keyboard semantics (arrow-key roving focus, Home/End, type-ahead)
- Loading states should use `role="status"` and `aria-live="polite"` for screen reader announcements
- Include Escape key handlers for dismissible elements (menus, modals)
- Ensure keyboard navigation works for all interactive elements, with proper focus management
- Include visible focus states: `focus:ring-2 focus:ring-blue-500 focus:outline-none`
- Maintain sufficient color contrast (especially in dark theme)

### Design Consistency

- Dark theme throughout the application
- Modern, clean UI with rounded corners and smooth transitions
- Consistent spacing and visual hierarchy
- Responsive design that works on mobile, tablet, and desktop

### Component Reusability

- Create reusable components for common UI patterns
- Keep components focused on a single responsibility
- Use props for configuration, not duplication
- Document component APIs with TypeScript types
- Every reusable `.astro` component must document its `Props` interface, including what each prop controls and any meaningful constraints or defaults

## Development Workflow

1. **Choose the right tool**: 
   - Content & structure → Astro components/pages
   - Styling → Tailwind
   - Client interactivity (rare) → a scoped Astro `<script>`

2. **Follow technology-specific patterns**: 
   - Refer to the appropriate instruction file

3. **Ensure testability**: 
   - Add `data-testid` to all interactive elements

4. **Verify accessibility**: 
   - Test keyboard navigation
   - Check focus states
   - Validate semantic structure
