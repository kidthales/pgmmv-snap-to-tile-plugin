# Changelog

All notable changes to `@kidthales/pgmmv-snap-to-tile-plugin` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-11-19

Modernizes `@kidthales/pgmmv-snap-to-tile-plugin` for PGMMV's SpiderMonkey 33 (ES5.1) runtime with strict `@kidthales/pgmmv-types` JSDoc checking, a canonical `scripts/build.mjs` release bundler, a `node:test` verification suite, CI/publish workflow parity, and self-contained documentation.

### Added

- **Canonical release bundler (`scripts/build.mjs`, `npm run build`) (`#71`)**: Added `buildPlugin`, `stripComments`, `assertSafeOutputPath`, and `resolveRealPath` to emit Prettier-formatted `dist/pgmmv-snap-to-tile-plugin-v<version>.js` bundles while preserving `/**!` / `/*!` license banners, enforcing `fs.realpathSync` self-overwrite and `dist/` containment guards, preserving ES5.1 §7.3 `LineTerminator` boundaries, and rescanning template literal braces.
- **Automated `node:test` suite (`tests/plugin.test.mjs`, `npm test`) (`#71`)**: Added 20 tests covering `plugin.js` metadata/hooks, editor-mode guards, `window.kt.snapToTile` runtime registration, all 3 Action Commands (`Snap to Tile`, `Snap to Tile (Horizontal)`, `Snap to Tile (Vertical)`), `scripts/build.mjs` symlink/containment/scanner edge cases, ESLint ES5 enforcement, and `tsc --noEmit` negative type checks.
- **Self-contained documentation (`README.md`, `CHANGELOG.md`) (`#71`)**: Removed the nonexistent `kidthales.com/pgmmv/snap-to-tile-plugin/` link and documented standardized badges, GitHub Releases `.js` installation, all 3 Action Commands, normalized `[0, 1]` tile origin coordinates and parameters, the `window.kt.snapToTile` script API, npm scripts, and this Keep-a-Changelog history.

### Changed

- **Strict `@kidthales/pgmmv-types` JSDoc typing (`tsconfig.json`, `env.d.ts`, `plugin.js`) (`#67`, `#70`, `#72`)**: Upgraded to `@kidthales/pgmmv-types@^0.2.1`, declared `Window.kt` in `env.d.ts`, enabled `allowJs`/`checkJs`/`strict`/`noEmit`, and standardized `plugin.js` JSDoc annotations with `@version 0.2.0`.
- **Toolchain, CI, release workflow, ignore & Dependabot parity (`package.json`, `eslint.config.js`, `.prettierignore`, `.gitignore`, `.github/workflows/{ci,publish}.yml`, `.github/dependabot.yml`, `.github/CODEOWNERS`) (`#71`, `#72`)**: Updated `devDependencies` (ESLint 9, Prettier 3, TypeScript 7, `concurrently` 10), ignored `.ci-local` and `**/.tmp-*/**`, wired `npm test` and `npm run build` into CI with least-privilege `contents: read` permissions, hardened `publish.yml` (`cancel-in-progress: false`, tag/package/plugin version parity checks, `npm run lint && npm test`, stripped `.js` + `SHA256SUMS.txt` asset uploads), and configured quarterly non-major Dependabot updates.

## [0.1.1] - 2026-04-02

### Changed

- **Plugin metadata & parameter labels (`plugin.js`) (`#12`)**: Expanded `getInfo('description')` and `getInfo('help')` copy and removed trailing colons from Action Command parameter names (`Variable Source`, `Origin X`, `Origin Y`).
- **Release publishing workflow (`.github/workflows/publish.yml`)**: Added tag-triggered GitHub Release `.js` asset build and upload automation.

## [0.1.0] - 2026-03-10

Initial release of `@kidthales/pgmmv-snap-to-tile-plugin`.

### Added

- **`Snap to Tile [PGMMV Snap-To-Tile Plugin]` Action Command**: Snaps an object instance's `X` and `Y` position within its current tile using clamped `[0, 1]` origin variables (defaulting to `(0.5, 0.5)`).
- **`Snap to Tile (Horizontal) [PGMMV Snap-To-Tile Plugin]` and `Snap to Tile (Vertical) [PGMMV Snap-To-Tile Plugin]` Action Commands**: Single-axis tile snapping commands leaving the perpendicular axis untouched.
- **`window.kt.snapToTile` script API**: Exposes `snapToTile`, `snapToTileHorizontal`, and `snapToTileVertical` for PGMMV Execute Script calls.
