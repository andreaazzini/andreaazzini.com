# Andrea’s Walkable Life

A small **TypeScript + Phaser 3** game built with **Vite**.

## Getting started

- **Install**

```bash
npm ci
```

- **Run dev server**

```bash
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Scripts

- **`npm run dev`**: Start the dev server (hot reload).
- **`npm run build`**: Type-check with `tsc` and build a production bundle with Vite.
- **`npm run preview`**: Serve the production build locally.

## Routes

- **`/`**: Runs the game.
- **`/catalog`**: Sprite catalog page (**dev-only**).
  - In `src/main.ts`, the catalog is only mounted when `import.meta.env.DEV` is true.

## Project structure (high level)

- **`src/main.ts`**: Entry point; decides whether to run the game or the catalog page.
- **`src/game/`**: Game bootstrapping (`createGame`) and shared config.
- **`src/scenes/`**: Phaser scenes (boot/title/overworld/interiors/catalog).
- **`src/systems/`**: Game systems (movement, dialogue, audio, interactions, etc.).
- **`src/world/`**: World data (NPCs, tilesets, character catalog).
- **`public/assets/`**: Maps, sprites, tilesets used at runtime.

## Assets / credits

See `public/assets/CREDITS.md` for attribution (assets are listed as **CC0 / Public Domain** in that file).

## Build & deploy

This is a static site:

```bash
npm run build
```

Deploy the generated `dist/` directory to any static host (GitHub Pages, Netlify, Vercel static output, S3, etc.).


