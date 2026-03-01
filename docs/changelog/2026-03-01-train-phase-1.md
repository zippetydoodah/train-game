# Changelog: Rail Tycoon — Phase 1 (World Foundation)

**Date**: 2026-03-01
**Feature branch**: `features/train-phase-1`

## Summary

Rail Tycoon Phase 1 establishes the foundational layer for a browser-based 2D top-down pixel art train management game. It delivers procedural world generation (200×200 tile map from seeded noise), camera controls (click-drag panning, smooth mouse-wheel zoom with LOD), an in-game time system (clock/date/year with 4 speed settings), a main menu with 5 save slots (localStorage persistence), and a full HUD shell (treasury placeholder, toolbar, side panel). No gameplay mechanics — this phase exists solely to make the world feel real, navigable, and persistent.

## Changes

### train-game (32 files, +3,684 lines)

**Project scaffolding**
- `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore` — Phaser 3 + TypeScript + Vite build pipeline

**Type definitions** (`src/types/`)
- `terrain.ts`, `save.ts`, `time.ts`, `ui.ts` — strict TypeScript types for all game systems

**Configuration** (`src/config/`)
- `game-config.ts` — game constants (map size, zoom range, time settings)
- `palette.ts` — 40+ hex color definitions for terrain, UI, and elevation shading

**Scenes** (`src/scenes/`)
- `BootScene.ts` — bitmap font generation (including £ sign), asset loading, scene transition
- `GameScene.ts` — full game scene: world rendering, camera (drag-pan, zoom-toward-cursor with tweens, LOD layer switching), keyboard shortcuts
- `HUDScene.ts` — HUD overlay with treasury, time panel, toolbar, side panel, save menu, return-to-menu
- `MainMenuScene.ts` — main menu with title, New Game button, Continue button, 5 save slots with load/delete

**Systems** (`src/systems/`)
- `TilesetGenerator.ts` — programmatic 103-tile terrain tileset with cardinal bitmask transitions and elevation shading
- `WorldGenerator.ts` — seeded fBm noise world generation (Mulberry32 PRNG + simplex-noise)
- `AutoTiler.ts` — cardinal bitmask terrain transition mapping
- `TimeSystem.ts` — game clock with speed controls (Paused/1×/2×/4×), day/month/year rollover, force-pause
- `SaveManager.ts` — localStorage save/load/delete with validation and quota error handling

**UI components** (`src/ui/`)
- `Panel.ts`, `Button.ts`, `TimePanel.ts`, `Toolbar.ts`, `SidePanel.ts`, `TreasuryPanel.ts`
- `SaveMenu.ts` — save slot selector with name input and overwrite flow
- `ConfirmDialog.ts` — modal confirmation for destructive actions
- `TextInput.ts` — HTML-overlay text input with Phaser scene lifecycle integration

## Key decisions

- **Programmatic tileset** — all 103 terrain tiles generated at runtime via canvas, avoiding external sprite assets entirely
- **Mulberry32 PRNG** — deterministic seeded random for reproducible world generation (map regenerated from seed on load, not stored)
- **Dual-layer LOD** — separate detail and simplified tilemap layers, toggled at zoom ≤ 0.5 for performance
- **Separate HUD scene** — UI overlay runs as a parallel Phaser scene, decoupled from world camera
- **localStorage persistence** — save data < 1 KB per slot (seed + camera + time state only)
- **Bitmap font** — generated in BootScene from browser monospace font at 8px, supporting full ASCII + £ sign

## Known limitations

- Bitmap font uses browser monospace at 8px — may not render crisply on all systems
- Vite production bundle is ~1.2 MB (Phaser 3 dominates); could benefit from code splitting in future phases
- No test framework — this is a visual game; all testing is manual/visual
- No animated tiles (water, trees) — deferred to future polish pass

## PRs

- **train-game**: https://github.com/zippetydoodah/train-game/pull/1
