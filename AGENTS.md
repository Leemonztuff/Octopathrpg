# AGENTS.md — Motor Octopath Voxel 2.5D

## What this is

Browser-based 2.5D voxel RPG engine. React 19 + Three.js + TypeScript + Vite 6 + Tailwind CSS v4. Originated from Google AI Studio; uses Gemini API for some features.

## Dev commands

- `npm run dev` — Vite dev server on port 3000
- `npm run build` — Production build
- `npm run lint` — **Type-check only** (`tsc --noEmit`). There is no ESLint or Prettier.
- No test suite exists. No test runner, no test files.

**Always run `npm run lint` (type-check) before committing.** There are no other automated checks.

## Architecture

Entry: `index.html` → `src/main.tsx` → `src/App.tsx`

Core engine lives in `src/core/GameEngine.ts` (singleton). It orchestrates:
- `src/renderer/` — Three.js rendering, OctopathCamera, curved-world shader, post-processing
- `src/world/` — Voxel grid, chunk system, materials (MultiChunkWorld, VoxelChunk, WorldGrid)
- `src/entities/` — Actor-Component-System pattern (Entity base class with dynamic component map)
- `src/entities/ai/` — Behavior trees, utility AI, AI Director (dynamic difficulty)
- `src/overworld/` — Overworld map manager
- `src/editor/` — In-game map editor (toggle with F1)
- `src/quests/` — Quest manager
- `src/save/` — Map serialization (MapFormat.ts) and save system
- `src/input/` — Keyboard + touch input manager
- `src/billboards/` — Billboard sprite system
- `src/animation/` — Sprite/animation players

UI layer (`src/ui/`) is React overlaid on the Three.js canvas. State flows through `src/context/StateContext.tsx` (React context) and `src/core/EventBus.ts` (global event bus for engine-level events).

Entity README at `src/entities/README.md` documents the ACS pattern and component map in detail.

## Key conventions

- **Language**: UI strings are in **Spanish** (game HUD, notifications, dialogs). Keep them consistent.
- **Path alias**: `@/*` maps to project root (configured in tsconfig and vite.config).
- **Singletons**: `GameEngine.getInstance()`, `PerformanceManager.getInstance()`, `CurvedWorldManager.getInstance()`.
- **Event bus**: Use `globalEventBus` for decoupled communication. Event types are defined in `src/types.ts` (`EngineEvents` interface).
- **Object pooling**: Enemies and projectiles use `ObjectPool` (`src/core/pooling/`). Always recycle via pool, never `new` + discard.
- **Tailwind v4**: Uses `@tailwindcss/vite` plugin. No `tailwind.config.js` — config is in CSS via `@theme` in `src/index.css`.
- **No ESLint/Prettier**: Style is enforced by convention only. Match the surrounding code.

## Tools

`tools/generateAtlas.js` — generates sprite atlases from PNG sheets. Run manually if asset structure changes.

## Environment

- `.env.local` or `.env` needs `GEMINI_API_KEY` for Gemini API features.
- `DISABLE_HMR=true` disables Vite HMR/file-watching (used in AI Studio to prevent flicker during agent edits). Do not remove this logic.
- `APP_URL` is injected at runtime in hosted environments.

## Assets

Static assets live in `public/`:
- `public/maps/` — JSON map files
- `public/spritesheets/` — Character sprite frames (`frame_XXX.webp`)
- `public/tiles/` — Terrain tile PNGs
- `public/props/` — Prop sprite PNGs
- `public/tiny_gui/extracted/` — HUD/UI pixel-art icons and buttons
- `public/tiny_gui/GUI_Pack/Containers/` — CSS border-image textures (referenced in `src/index.css`)
- `public/map/MiniWorldSprites/` — Overworld tileset sprites (Ground, Buildings, Nature, Miscellaneous)

## Gotchas

- **npm optional deps bug on Windows**: If `npm run dev` fails with `MODULE_NOT_FOUND` for `@rollup/rollup-win32-x64-msvc`, `@esbuild/win32-x64`, `lightningcss-win32-x64-msvc`, or `@tailwindcss/oxide-win32-x64-msvc`, run: `rm -rf node_modules package-lock.json && npm install`. This is a known npm bug ([#4828](https://github.com/npm/cli/issues/4828)).
- `useDefineForClassFields: false` in tsconfig — needed for Three.js decorator compatibility. Do not change.
- `experimentalDecorators: true` — required for some Three.js patterns.
- The game engine creates its own Three.js renderer and scene. React only manages the HUD overlay, not the 3D viewport.
- Map format is custom JSON (`src/save/MapFormat.ts`). If modifying map structure, update the schema there.
- No monorepo. Single package. `node_modules/` is the only dependency boundary.
