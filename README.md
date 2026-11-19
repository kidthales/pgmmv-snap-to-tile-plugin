# PGMMV Snap-To-Tile Plugin

[![CI](https://github.com/kidthales/pgmmv-snap-to-tile-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/kidthales/pgmmv-snap-to-tile-plugin/actions/workflows/ci.yml)
[![GitHub Release](https://img.shields.io/github/v/release/kidthales/pgmmv-snap-to-tile-plugin.svg)](https://github.com/kidthales/pgmmv-snap-to-tile-plugin/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![ES5 / PGMMV 1.0.6+](https://img.shields.io/badge/ES5-PGMMV%201.0.6%2B-brightgreen.svg)](https://rpgmakerofficial.com/product/act/en/manual/01_01.html)

Position [Pixel Game Maker MV (PGMMV)](https://rpgmakerofficial.com/product/act/en/manual/01_01.html) objects within their current tile using normalized `[0, 1]` tile origin coordinates, providing 2-axis and single-axis Action Commands plus a `window.kt.snapToTile` runtime script API.

## Installation (PGMMV Editor)

1. Download the latest `pgmmv-snap-to-tile-plugin-v<version>.js` asset (and optionally verify it against `SHA256SUMS.txt`) from [GitHub Releases](https://github.com/kidthales/pgmmv-snap-to-tile-plugin/releases).
    - Alternatively, build the stripped release bundle locally from source with `npm run build` (outputs `dist/pgmmv-snap-to-tile-plugin-v0.2.0.js`).
2. In PGMMV, open **Plugins** -> **Add** and select the downloaded `.js` file.
3. Enable the plugin in your project's plugin list.

> Compatible with **PGMMV 1.0.6+** (SpiderMonkey 33 / ECMAScript 5.1).

## Action Commands

All three Action Commands appear under an object state's **Action Command** menu in PGMMV and reposition the target object instance within its current tile (`Math.floor(pos / tileSize) * tileSize + origin * tileSize`).

Tile origin values use normalized `[0, 1]` coordinates relative to the tile's top-left corner and are clamped with `cc.clampf(value, 0, 1)`:

- **Horizontal (`Origin X`)**: `0` is tile left, `0.5` is horizontal center (default), and `1` is tile right.
- **Vertical (`Origin Y`)**: `0` is tile top, `0.5` is vertical center (default), and `1` is tile bottom.
- **Defaults**: Leaving `Variable Source` unset (`-1`), resolving an unset `ParentObject`, or specifying an origin variable ID `< 1` (or missing) defaults that axis's origin to `0.5`.

### `Snap to Tile [PGMMV Snap-To-Tile Plugin]`

Snaps both `X` and `Y` coordinates of the object instance to its current tile. Tile origin `(0, 0)` is top-left, `(1, 1)` is bottom-right, and `(0.5, 0.5)` is center (default).

| Parameter         | Type                     | Default      | Description                                                                                        |
| :---------------- | :----------------------- | :----------- | :------------------------------------------------------------------------------------------------- |
| `Variable Source` | `SwitchVariableObjectId` | `-1` (Unset) | Variable source (`ProjectCommon`, `SelfObject`, or `ParentObject`) holding the origin variables.   |
| `Origin X`        | `VariableId`             | `-1` (Unset) | Variable whose value specifies the normalized `[0, 1]` horizontal tile origin (defaults to `0.5`). |
| `Origin Y`        | `VariableId`             | `-1` (Unset) | Variable whose value specifies the normalized `[0, 1]` vertical tile origin (defaults to `0.5`).   |

### `Snap to Tile (Horizontal) [PGMMV Snap-To-Tile Plugin]`

Snaps only the `X` coordinate of the object instance to its current tile (leaving `Y` untouched). Tile origin `0` is left, `1` is right, and `0.5` is center (default).

| Parameter         | Type                     | Default      | Description                                                                                         |
| :---------------- | :----------------------- | :----------- | :-------------------------------------------------------------------------------------------------- |
| `Variable Source` | `SwitchVariableObjectId` | `-1` (Unset) | Variable source (`ProjectCommon`, `SelfObject`, or `ParentObject`) holding the `Origin X` variable. |
| `Origin X`        | `VariableId`             | `-1` (Unset) | Variable whose value specifies the normalized `[0, 1]` horizontal tile origin (defaults to `0.5`).  |

### `Snap to Tile (Vertical) [PGMMV Snap-To-Tile Plugin]`

Snaps only the `Y` coordinate of the object instance to its current tile (leaving `X` untouched). Tile origin `0` is top, `1` is bottom, and `0.5` is center (default).

| Parameter         | Type                     | Default      | Description                                                                                         |
| :---------------- | :----------------------- | :----------- | :-------------------------------------------------------------------------------------------------- |
| `Variable Source` | `SwitchVariableObjectId` | `-1` (Unset) | Variable source (`ProjectCommon`, `SelfObject`, or `ParentObject`) holding the `Origin Y` variable. |
| `Origin Y`        | `VariableId`             | `-1` (Unset) | Variable whose value specifies the normalized `[0, 1]` vertical tile origin (defaults to `0.5`).    |

## Script API (`window.kt.snapToTile`)

Outside the PGMMV editor, `initialize()` registers the snap-to-tile helper functions on `window.kt.snapToTile` (each returns `Agtk.constants.actionCommands.commandBehavior.CommandBehaviorNext`):

- `window.kt.snapToTile.snapToTile(variableObjectId, originXVariableId, originYVariableId, instanceId)` -> `CommandBehaviorNext`
- `window.kt.snapToTile.snapToTileHorizontal(variableObjectId, originXVariableId, instanceId)` -> `CommandBehaviorNext`
- `window.kt.snapToTile.snapToTileVertical(variableObjectId, originYVariableId, instanceId)` -> `CommandBehaviorNext`

Parameters:

- `variableObjectId`: `Agtk.constants.switchVariableObjects.ProjectCommon` (`0`), `SelfObject` (`-2`), `ParentObject` (`-7`), or `Agtk.constants.actionCommands.UnsetObject` (`-1`).
- `originXVariableId` / `originYVariableId`: Variable ID holding the normalized `[0, 1]` origin value (`< 1`, missing variables, or an unset `variableObjectId` fall back to `0.5`).
- `instanceId`: Target object instance ID.

Example (ES5 inside a PGMMV **Execute Script** action or condition):

```js
// Snap both axes to tile center (0.5, 0.5) using unset variable source.
window.kt.snapToTile.snapToTile(Agtk.constants.actionCommands.UnsetObject, -1, -1, instanceId);

// Snap horizontally using SelfObject variable ID 2001 (clamped to [0, 1]).
window.kt.snapToTile.snapToTileHorizontal(Agtk.constants.switchVariableObjects.SelfObject, 2001, instanceId);

// Snap vertically to tile center (0.5).
window.kt.snapToTile.snapToTileVertical(Agtk.constants.actionCommands.UnsetObject, -1, instanceId);
```

## Development

### Requirements

- Any current [Node.js](https://nodejs.org/en/download) LTS (Long-Term Support) version.
- A [Git](https://git-scm.com/) client.

### Setup

```bash
git clone https://github.com/kidthales/pgmmv-snap-to-tile-plugin.git
cd pgmmv-snap-to-tile-plugin
npm install
```

### SpiderMonkey 33 & ES5 Constraints

PGMMV embeds **SpiderMonkey 33**, which executes plugins in an [ECMAScript 5.1](https://262.ecma-international.org/5.1/) script environment. `eslint.config.js` enforces `ecmaVersion: 5` and `sourceType: 'script'` on `plugin.js` with `Agtk`, `cc`, and `jsb` declared as read-only globals, while `tsconfig.json` runs strict JSDoc type-checking against `@kidthales/pgmmv-types` without emitting ES6+ syntax.

### Scripts Reference

| Script             | Command                                                | Purpose                                                                                                                                                                                                                             |
| :----------------- | :----------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`     | `eslint --cache .`, `prettier --check`, `tsc --noEmit` | Verify ES5 compliance (`plugin.js`), ESM syntax (`scripts/**/*.mjs`, `tests/**/*.mjs`), Markdown/JSON/YAML formatting, and strict JSDoc types.                                                                                      |
| `npm run lint-fix` | `eslint --cache --fix .`, `prettier --write`           | Auto-fix ESLint and Prettier formatting issues across source and documentation files.                                                                                                                                               |
| `npm test`         | `node --test`                                          | Run `tests/plugin.test.mjs` covering `plugin.js` hooks, editor-mode guards, all 3 Action Commands, `window.kt.snapToTile`, `scripts/build.mjs` path-containment and comment-stripping invariants, and negative ESLint/`tsc` checks. |
| `npm run build`    | `node scripts/build.mjs`                               | Strip non-banner comments from `plugin.js`, format with Prettier, and emit `dist/pgmmv-snap-to-tile-plugin-v<version>.js` (accepts an optional output path strictly inside `dist/`).                                                |

## References & License

- [Changelog](./CHANGELOG.md)
- [MIT License](./LICENSE)
- [@kidthales/pgmmv-types](https://github.com/kidthales/pgmmv-types)
- [PGMMV Plug-in Specifications](https://rpgmakerofficial.com/product/act/en/manual/Plug-in_Spec_en.pdf)
