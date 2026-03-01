# Changelog: train-deploy (GitHub Pages Deployment via CI/CD)

**Date**: 2026-03-01
**Branch**: `features/train-deploy` → `main`

## Summary

Adds automated deployment of the Rail Tycoon game to GitHub Pages using GitHub Actions. Every push to `main` now triggers a CI/CD pipeline that type-checks, lints, builds, and deploys the game to `https://zippetydoodah.github.io/train-game/` — eliminating the need for manual builds and publishes.

## Changes

### train-game

```
 .github/workflows/deploy.yml | 84 ++++++++++++++++++++++++++++++++++++
 vite.config.ts               |  1 +
 2 files changed, 85 insertions(+)
```

- **`.github/workflows/deploy.yml`** (new) — Complete CI/CD pipeline: triggers on pushes to `main` + manual dispatch; installs Node 22 LTS with npm caching; runs `npm ci`, `npm run lint`, `npm run build`; uploads `dist/` artifact; deploys to GitHub Pages via `actions/deploy-pages@v4`. Includes concurrency control and least-privilege permissions.
- **`vite.config.ts`** (modified) — Added `base: '/train-game/'` for correct asset path resolution on GitHub Pages subdirectory hosting.

## Key decisions

- **Deployment approach**: Used official `actions/deploy-pages@v4` (GitHub's newer Pages API method) instead of the `gh-pages` branch approach. Avoids maintaining a separate branch and uses direct Pages API deployment.
- **Node version**: Pinned to Node 22 (current active LTS as of 2026).
- **Concurrency**: Enabled `cancel-in-progress: true` to prevent stale deployments from overlapping runs.
- **Permissions**: Least-privilege model — only `pages:write`, `id-token:write`, and `contents:read`.
- **Lint in CI**: Added `npm run lint` step to catch style issues before build.
- **Manual dispatch**: Added `workflow_dispatch` trigger for manual re-deploys.

## Known limitations

- **GitHub Pages must be enabled manually** — A repository administrator must enable GitHub Pages with "GitHub Actions" source in repo settings (`Settings > Pages`) before the first deployment. The workflow cannot enable this programmatically.
- **Local dev URL change** — `vite dev` now serves at `localhost:3000/train-game/` instead of `localhost:3000/` due to the `base` path. The dev server auto-redirects from `/`.
- **Large bundle** — The production build produces a single 1.2 MB chunk (342 KB gzipped). The Vite chunk size warning is informational; code-splitting is out of scope for this feature.

## PRs

- **train-game**: https://github.com/zippetydoodah/train-game/pull/2
