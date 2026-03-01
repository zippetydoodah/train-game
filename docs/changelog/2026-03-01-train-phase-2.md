# Phase 2 — Build & Connect

**Date**: 2026-03-01
**Feature branch**: `features/train-phase-2`
**PR**: https://github.com/zippetydoodah/train-game/pull/3

## Summary

Phase 2 activates the build layer of Rail Tycoon. Players gain the ability to lay rail (tile-by-tile and auto-route with A* pathfinding), elevated rail, bridges, and three tiers of stations across the procedurally generated world. Terrain type governs buildability and cost. The treasury becomes a live, reactive resource that deducts on every placement and permits debt with visible warnings. A demolish tool provides partial refunds based on infrastructure age. All placed infrastructure persists through save/load with backward compatibility.

## Changes

**21 files changed** — 2,743 insertions, 70 deletions

### New files (12)
- `src/types/infrastructure.ts` — InfrastructureType, Direction, InfrastructureTile, grid types
- `src/types/tools.ts` — ToolType enum, hotkey mappings, button-to-tool mapping
- `src/types/costs.ts` — Terrain cost multipliers, base costs, demolish refund tiers
- `src/systems/TreasuryManager.ts` — Balance tracking, debit/credit, debt detection
- `src/systems/CostCalculator.ts` — Per-tile cost computation with terrain multipliers
- `src/systems/InfrastructureManager.ts` — Sparse grid storage, CRUD, validation, auto-connect
- `src/systems/InfrastructureTilesetGenerator.ts` — Canvas-based sprite generation (23 sprites)
- `src/systems/BuildToolStateMachine.ts` — Build phases, tool selection, state transitions
- `src/systems/GhostPreviewManager.ts` — Preview sprite pool with validity coloring
- `src/systems/Pathfinder.ts` — A* pathfinding with 45-degree turn rule, binary heap
- `src/ui/CostTooltip.ts` — Floating cost tooltip following cursor
- `src/ui/StationSubMenu.ts` — Station tier selection popup

### Modified files (9)
- `src/config/palette.ts` — Infrastructure colors, warning text color
- `src/types/save.ts` — Treasury balance and infrastructure fields (backward-compatible)
- `src/scenes/BootScene.ts` — Infrastructure tileset generation call
- `src/scenes/GameScene.ts` — Full build system integration (+643 lines)
- `src/scenes/HUDScene.ts` — Event wiring for all Phase 2 features (+142 lines)
- `src/ui/Button.ts` — Tool-active guards, hover tooltips, setEnabled
- `src/ui/Toolbar.ts` — Enabled tool buttons, tool selection, hotkey tooltips
- `src/ui/TreasuryPanel.ts` — Dynamic updates, debt styling, flash warnings
- `src/ui/SidePanel.ts` — Route cost breakdown, demolish info display

## Key decisions

- **Sparse grid** for infrastructure storage (Map keyed by `y*MAP_SIZE+x`) instead of a dense 2D array — most tiles are empty, so sparse is far more memory-efficient
- **Canvas-based tileset generation** at boot — all 23 infrastructure sprites are drawn programmatically, avoiding external asset dependencies
- **A* pathfinding with binary heap** for auto-route — enforces a 45-degree turn rule limiting direction changes between consecutive tiles
- **BuildToolStateMachine** with explicit phase transitions (Idle → ToolActive → Dragging → BridgeStart → BridgeEnd) — clean separation of input handling per build mode
- **Ghost preview with validity coloring** — green/red tinting on preview sprites for immediate buildability feedback
- **Backward-compatible save format** — new fields (`treasuryBalance`, `infrastructure`) are optional; Phase 1 saves load without error

## Known limitations

- **LOW-1**: Tool hotkeys (R, T, B, E, X) fire during save menu text input — cosmetic only, does not affect save operations
- **LOW-2**: `DEMOLISH_REFUND_TIERS` has an unreachable fallback due to `Infinity` as the last tier's maxAge — dead code matches the Infinity tier's percentage, so behavior is correct
- **LOW-3**: `autoConnect` 3-connection clamping removes the lowest set bit — deterministic but may not always produce the most visually sensible 2-connection pattern
- **LOW-4**: The 45-degree turn rule is only enforced during auto-route pathfinding, not during single-click tile-by-tile placement — primary placement method (auto-route drag) does enforce the rule

## PRs

- train-game: https://github.com/zippetydoodah/train-game/pull/3
