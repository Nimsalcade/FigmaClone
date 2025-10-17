# Figma Clone MVP

This repository contains the base application shell for a browser-based design tool inspired by Figma. It is configured with React 18, TypeScript, Vite, Tailwind CSS, Zustand, Fabric.js, and supporting tooling so feature development can begin immediately.

## Getting started

```bash
npm install
npm run dev
```

The development server starts on [http://localhost:5173](http://localhost:5173).

## Available scripts

- `npm run dev` – start the Vite development server
- `npm run build` – create a production build
- `npm run preview` – preview the production build locally
- `npm run lint` – run ESLint with type-aware rules
- `npm run lint:fix` – run ESLint and automatically fix issues when possible
- `npm run typecheck` – check TypeScript types without emitting files
- `npm run format` – format the complete codebase with Prettier
- `npm run format:check` – verify formatting without modifying files

## Tech stack

- **React 18** with **TypeScript**
- **Vite** build tooling with path alias support (`@/*` → `src/*`)
- **Tailwind CSS** for styling and global design tokens
- **Zustand** for state management scaffolding
- **Fabric.js** for canvas rendering
- **react-colorful**, **lucide-react**, and **uuid** for common UI capabilities
- **ESLint** + **Prettier** with Tailwind-aware linting rules

## Project structure

```
src/
├─ App.tsx               # Top-level application layout scaffold
├─ main.tsx              # React entry point with global styles
├─ components/           # UI components (placeholder index file)
├─ hooks/                # Reusable React hooks (placeholder index file)
├─ stores/               # Zustand stores (placeholder index file)
├─ utils/                # Utility helpers (placeholder index file)
├─ types/                # Shared TypeScript types (placeholder index file)
└─ styles/
   └─ global.css         # Tailwind directives and global styles
```

Configuration files for Tailwind (`tailwind.config.cjs`), PostCSS (`postcss.config.cjs`), ESLint (`eslint.config.js`), and Prettier (`prettier.config.cjs`) are included at the repository root.
