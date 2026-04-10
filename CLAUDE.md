# CLAUDE.md

## Purpose
This document defines implementation rules for integrating Figma designs into this repository using MCP tools, while staying aligned with the current codebase architecture.

## Quick Stack Snapshot
- Frontend: React 19 + TypeScript + React Router 7
- Styling: Tailwind CSS v4 via `@theme` in global CSS
- Motion: `motion/react`
- Icons: `lucide-react`
- Build: Vite 6
- Backend: Express.js, serving uploaded assets under `/uploads`

---

## 1. Design System Structure

### 1.1 Token Definitions

#### Where tokens are defined
- Primary token source: `src/index.css`
- Tokens are declared inside Tailwind v4 `@theme`.

#### Token format and structure
- Tokens are CSS custom properties exposed through Tailwind's theme layer.
- Naming pattern:
  - Font tokens: `--font-*`
  - Radius tokens: `--radius-*`
  - Color scale tokens: `--color-brand-*`
  - Accent tokens: `--color-accent-*`, `--color-spark-*`

Example pattern from `src/index.css`:
```css
@theme {
  --font-sans: "Manrope", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Sora", sans-serif;

  --radius-2xl: 1.1rem;
  --radius-3xl: 1.6rem;

  --color-brand-500: #2f84ee;
  --color-brand-600: #1869d4;
  --color-accent-500: #00a892;
}
```

#### Token transformation systems
- No separate transformation pipeline (no Style Dictionary, no token build scripts).
- Tokens are authored directly in CSS and consumed by Tailwind utility classes.

Rule:
- Add new tokens in `src/index.css` under `@theme` and consume via class names (for example `text-brand-600`).
- Do not hardcode repeated color literals inside components when a token exists.

---

## 2. Component Library

### 2.1 Where UI components are defined
- Shared primitives: `src/components/ui`
  - `Button.tsx`
  - `Card.tsx`
- Layout shell: `src/components/layout`
  - `Navbar.tsx`
  - `Footer.tsx`
- Page-level components: `src/pages`

### 2.2 Component architecture
- Functional React components with typed props.
- Utility-first styling in JSX class names.
- Shared class composition helper: `src/utils/cn.ts`.

Example pattern from `src/components/ui/Button.tsx`:
```tsx
export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', ...props }) => {
  const variants = {
    primary: 'gradient-bg text-white ...',
    outline: 'border-2 border-brand-500 text-brand-600 ...',
  };

  return (
    <button className={cn('inline-flex ...', variants[variant], sizes[size])} {...props} />
  );
};
```

### 2.3 Component documentation / Storybook
- No Storybook setup detected.
- No standalone component docs site detected.

Rule:
- Treat `src/components/ui` as the design-system source of truth.
- Reuse `Button` and `Card` before creating new primitives.

---

## 3. Frameworks and Libraries

### 3.1 UI framework
- React + TypeScript
- Routing with `react-router-dom`

### 3.2 Styling framework and motion
- Tailwind CSS v4 (`@tailwindcss/vite` plugin)
- Global utility classes and custom layers in `src/index.css`
- Motion animations via `motion/react`

### 3.3 Build system and bundler
- Vite config in `vite.config.ts`
- Alias: `@` -> project root
- Dev proxy:
  - `/api` to backend `http://localhost:8000`
  - `/uploads` to backend `http://localhost:8000`

Example pattern from `vite.config.ts`:
```ts
plugins: [react(), tailwindcss()],
server: {
  proxy: {
    '/api': { target: 'http://localhost:8000', changeOrigin: true },
    '/uploads': { target: 'http://localhost:8000', changeOrigin: true },
  },
}
```

---

## 4. Asset Management

### 4.1 Storage and references
- Backend serves user-uploaded files from `uploads/`.
- Express static mount in `backend/src/server.js`:
```js
app.use('/uploads', express.static(config.uploadDir));
```
- Frontend requests uploads through Vite dev proxy at `/uploads/...`.

### 4.2 Optimization techniques
- No dedicated frontend image optimization pipeline detected.
- Current pages often use external placeholders (`picsum.photos`) for mock imagery.

### 4.3 CDN configuration
- No CDN config detected in this repo.
- Docker compose runs local frontend/backend + postgres + redis + mailhog.

Rule:
- For production assets, prefer backend-managed uploads or project-controlled assets over hotlinked placeholders.

---

## 5. Icon System

### 5.1 Where icons are stored
- Icon components are imported directly from `lucide-react`.
- No local SVG directory currently used.

### 5.2 Icon usage pattern
- Named imports at file top, then JSX usage.

Example from `src/pages/ServicesPage.tsx`:
```tsx
import { Search, Filter, Star, ShieldCheck, ArrowRight } from 'lucide-react';
...
<Star size={14} className='text-yellow-500' fill='currentColor' />
```

### 5.3 Naming convention
- Mixed approach:
  - Direct component usage (`<Search />`)
  - String-to-icon mapping in data-driven areas (`iconMap` in `LandingPage.tsx`)

Rule:
- Standardize on PascalCase Lucide names in data (`Zap`, `Droplets`, `Sparkles`, etc.) when dynamic mapping is needed.
- Keep a local `iconMap` near rendering code unless reused across multiple pages.

---

## 6. Styling Approach

### 6.1 Methodology
- Utility-first Tailwind classes in JSX.
- Centralized visual primitives via utility classes in `src/index.css`:
  - `.glass`
  - `.gradient-bg`
  - `.gradient-text`
  - `.mesh-panel`
  - `.hero-grid`

### 6.2 Global styles
- Global styles and font imports are in `src/index.css`.
- Base body styles and typographic defaults are defined in `@layer base`.

### 6.3 Responsive implementation
- Mobile-first utility breakpoints (`sm`, `md`, `lg`, `xl`).
- Typical layout pattern:
```tsx
<div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5'>...</div>
```

Rule:
- New UI should remain mobile-first and use the existing breakpoint vocabulary.
- Prefer reusable utility classes over page-specific custom CSS unless complexity demands extraction.

---

## 7. Project Structure

### 7.1 Overall organization
- Frontend app: `src/`
  - `components/` reusable UI and layout pieces
  - `pages/` route-level screens
  - `context/` app state providers
  - `api/` typed request client wrappers
  - `data/` mock/demo data
  - `utils/` helpers
- Backend app: `backend/src/`
  - `server.js` API endpoints and websocket tracking
  - `auth.js` auth/JWT helpers and middleware
  - `db.js` PostgreSQL pool and bootstrap
  - `pricing.js` pricing logic

### 7.2 Feature organization patterns
- Frontend is primarily route-driven with shared primitives.
- Backend uses centralized route handlers in `backend/src/server.js` with helper modules.

Rule:
- Keep frontend feature logic inside pages; extract only repeated logic/patterns into `components/ui`, `components/layout`, or `utils`.

---

## MCP Workflow Rules for Figma + Stitch

### Figma MCP rules
1. Source of truth for design extraction is Figma node context.
2. Pull context first, then adapt to existing components/tokens.
3. Preserve project conventions (Tailwind classes, `Button`, `Card`, `cn`).
4. Avoid generating one-off components if a shared primitive already exists.

### Stitch rules
1. Use Stitch for concept exploration and style direction (project-level themes/screens).
2. Convert Stitch concepts into repo-compatible React + Tailwind implementation.
3. Validate all final UI decisions against token and component rules in this file.

### Practical integration loop
1. Generate/inspect design in Figma or Stitch.
2. Map design elements to existing primitives and tokens.
3. Implement in React pages/components.
4. Run build/type check.
5. Refine for responsive behavior and dark mode parity.

---

## Implementation Guardrails for Future UI Work

1. Reuse `Button` and `Card` before introducing new base primitives.
2. Add any new cross-page token to `src/index.css` `@theme` first.
3. Keep icon usage on `lucide-react`; avoid mixing icon libraries unless required.
4. Keep route composition in `src/App.tsx` and page logic in `src/pages/*`.
5. Maintain consistent radii and spacing rhythm from current token set.
6. Ensure every new page works at mobile and desktop widths.
7. Prefer API-backed data from `src/api/client.ts`; use mock data only for placeholders.

---

## Evidence File Index
- `src/index.css`
- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/components/layout/Navbar.tsx`
- `src/components/layout/Footer.tsx`
- `src/pages/LandingPage.tsx`
- `src/pages/ServicesPage.tsx`
- `src/pages/ProfessionalsPage.tsx`
- `src/api/client.ts`
- `vite.config.ts`
- `package.json`
- `backend/app/main.py`
- `backend/app/config.py`
- `docker-compose.yml`
