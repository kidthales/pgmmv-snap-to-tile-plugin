import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { assertSafeOutputPath, buildPlugin, resolveRealPath, stripComments } from '../scripts/build.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const pluginPath = path.join(ROOT, 'plugin.js');
const pluginSource = fs.readFileSync(pluginPath, 'utf8');
const buildScript = path.join(ROOT, 'scripts', 'build.mjs');
const eslintBin = path.join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');
const tscBin = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');

const AGTK_CONSTANTS = {
  switchVariableObjects: {
    ProjectCommon: 0,
    SelfObject: -2,
    ParentObject: -7
  },
  actionCommands: {
    UnsetObject: -1,
    commandBehavior: {
      CommandBehaviorNext: 0
    }
  },
  objects: {
    variables: {
      XId: 1,
      YId: 2,
      ParentObjectInstanceIDId: 14
    }
  }
};

function loadPlugin(context = {}) {
  return vm.runInNewContext(pluginSource, context, { filename: 'plugin.js' });
}

function createMockRuntime({ tileWidth = 16, tileHeight = 16, projectVariables = {}, instances = {} } = {}) {
  function makeVariableStore(vars = {}) {
    return {
      get(id) {
        if (!(id in vars) || vars[id] === null || vars[id] === undefined) {
          return null;
        }
        return {
          getValue() {
            return vars[id];
          },
          setValue(value) {
            vars[id] = value;
          }
        };
      }
    };
  }

  const Agtk = {
    constants: AGTK_CONSTANTS,
    settings: {
      tileWidth,
      tileHeight
    },
    log() {},
    variables: makeVariableStore(projectVariables),
    objectInstances: {
      get(instanceId) {
        const spec = instances[instanceId];
        if (!spec) {
          throw new Error(`Unexpected object instance lookup: ${instanceId}`);
        }
        return {
          variables: makeVariableStore(spec.variables)
        };
      }
    }
  };

  const cc = {
    clampf(value, minLimit, maxLimit) {
      return Math.min(Math.max(value, minLimit), maxLimit);
    }
  };

  return { Agtk, cc };
}

test('plugin.js evaluates to an object exposing all PGMMV plugin hooks', () => {
  const plugin = loadPlugin({});
  assert.equal(typeof plugin, 'object');
  assert.notEqual(plugin, null);

  for (const method of [
    'setLocale',
    'getInfo',
    'initialize',
    'finalize',
    'setParamValue',
    'setInternal',
    'call',
    'execActionCommand'
  ]) {
    assert.equal(typeof plugin[method], 'function', `Expected ${method} to be a function`);
  }
});

test('getInfo returns expected metadata and actionCommand schemas for all categories', () => {
  const plugin = loadPlugin({});

  assert.equal(plugin.getInfo('name'), 'PGMMV Snap-To-Tile Plugin');
  assert.equal(plugin.getInfo('description'), 'Position objects within their current tile.');
  assert.equal(plugin.getInfo('author'), 'Tristan Bonsor <kidthales@agogpixel.com>');
  assert.equal(
    plugin.getInfo('help'),
    'This plugin provides a way to position an object with its current tile, relative\n' +
      "to the tile's top or left. Suitable for use with platformer-style ladder tiles,\n" +
      'overview-style grid movement, or any other use case that requires object\n' +
      'positioning within a tile.\n' +
      '\n' +
      'Object position within a tile is expressed as a value between 0 (left or top)\n' +
      'and 1 (right or bottom). Separate action commands are provided for 2-axis and\n' +
      'single-axis positioning.'
  );
  assert.deepEqual(JSON.parse(JSON.stringify(plugin.getInfo('parameter'))), []);
  assert.deepEqual(JSON.parse(JSON.stringify(plugin.getInfo('internal'))), {});
  assert.deepEqual(JSON.parse(JSON.stringify(plugin.getInfo('linkCondition'))), []);
  assert.equal(plugin.getInfo('invalid'), undefined);
  assert.equal(plugin.getInfo(''), undefined);

  const actionCommands = JSON.parse(JSON.stringify(plugin.getInfo('actionCommand')));
  assert.deepEqual(actionCommands, [
    {
      id: 0,
      name: 'Snap to Tile [PGMMV Snap-To-Tile Plugin]',
      description:
        'Snap object position to current tile. Tile origin (0,0) is top left, (1,1) is bottom right, and (0.5, 0.5) is center (default).',
      parameter: [
        {
          id: 100,
          name: 'Variable Source',
          type: 'SwitchVariableObjectId',
          option: ['SelfObject', 'ParentObject'],
          defaultValue: -1
        },
        {
          id: 0,
          name: 'Origin X',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        },
        {
          id: 1,
          name: 'Origin Y',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        }
      ]
    },
    {
      id: 1,
      name: 'Snap to Tile (Horizontal) [PGMMV Snap-To-Tile Plugin]',
      description:
        'Snap object position horizontally to current tile. Tile origin 0 is left, 1 is right, and 0.5 is center (default).',
      parameter: [
        {
          id: 100,
          name: 'Variable Source',
          type: 'SwitchVariableObjectId',
          option: ['SelfObject', 'ParentObject'],
          defaultValue: -1
        },
        {
          id: 0,
          name: 'Origin X',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        }
      ]
    },
    {
      id: 2,
      name: 'Snap to Tile (Vertical) [PGMMV Snap-To-Tile Plugin]',
      description:
        'Snap object position vertically to current tile. Tile origin 0 is top, 1 is bottom, and 0.5 is center (default).',
      parameter: [
        {
          id: 100,
          name: 'Variable Source',
          type: 'SwitchVariableObjectId',
          option: ['SelfObject', 'ParentObject'],
          defaultValue: -1
        },
        {
          id: 0,
          name: 'Origin Y',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        }
      ]
    }
  ]);
});

test('no-op hooks complete without throwing', () => {
  const plugin = loadPlugin({});

  assert.doesNotThrow(() => {
    plugin.setLocale('en');
    plugin.setParamValue([]);
    plugin.setInternal({});
    plugin.call();
    plugin.finalize();
  });
});

test('initialize skips registering window.kt.snapToTile in editor mode', () => {
  for (const agtkCandidate of [null, undefined, {}, { log: 'not-a-function' }]) {
    const windowObj = {};
    const plugin = loadPlugin({ Agtk: agtkCandidate, window: windowObj });
    assert.doesNotThrow(() => {
      plugin.initialize();
    });
    assert.equal('kt' in windowObj, false);
  }
});

test('initialize registers window.kt.snapToTile outside editor and preserves existing window.kt keys', () => {
  const { Agtk, cc } = createMockRuntime();
  const freshWindow = {};
  const pluginFresh = loadPlugin({ Agtk, cc, window: freshWindow });
  pluginFresh.initialize();

  assert.equal(typeof freshWindow.kt, 'object');
  assert.equal(typeof freshWindow.kt.snapToTile, 'object');
  assert.equal(typeof freshWindow.kt.snapToTile.snapToTile, 'function');
  assert.equal(typeof freshWindow.kt.snapToTile.snapToTileHorizontal, 'function');
  assert.equal(typeof freshWindow.kt.snapToTile.snapToTileVertical, 'function');

  const existingWindow = { kt: { otherPlugin: { ready: true } } };
  const pluginExisting = loadPlugin({ Agtk, cc, window: existingWindow });
  pluginExisting.initialize();

  assert.deepEqual(existingWindow.kt.otherPlugin, { ready: true });
  assert.equal(typeof existingWindow.kt.snapToTile.snapToTile, 'function');
});

test('Snap to Tile snaps both axes using SelfObject, ParentObject, ProjectCommon, defaults, and clamping', () => {
  const { ProjectCommon, SelfObject, ParentObject } = AGTK_CONSTANTS.switchVariableObjects;
  const { UnsetObject, commandBehavior } = AGTK_CONSTANTS.actionCommands;
  const { XId, YId, ParentObjectInstanceIDId } = AGTK_CONSTANTS.objects.variables;

  const instances = {
    1: {
      variables: {
        [XId]: 37,
        [YId]: 55,
        [ParentObjectInstanceIDId]: 2,
        10: 0.25,
        11: 0.75
      }
    },
    2: {
      variables: {
        [XId]: 100,
        [YId]: 200,
        20: -2,
        21: 3
      }
    },
    3: {
      variables: {
        [XId]: -10,
        [YId]: 49,
        [ParentObjectInstanceIDId]: UnsetObject,
        30: 0
      }
    }
  };

  const { Agtk, cc } = createMockRuntime({
    tileWidth: 32,
    tileHeight: 16,
    projectVariables: { 5: 1, 6: 0 },
    instances
  });
  const windowObj = {};
  const plugin = loadPlugin({ Agtk, cc, window: windowObj });
  plugin.initialize();

  // SelfObject (tile (1, 3) -> x=32..64, y=48..64; origin (0.25, 0.75) -> x=40, y=60)
  assert.equal(
    plugin.execActionCommand(
      0,
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 10 },
        { id: 1, value: 11 }
      ],
      10,
      1
    ),
    commandBehavior.CommandBehaviorNext
  );
  assert.equal(instances[1].variables[XId], 40);
  assert.equal(instances[1].variables[YId], 60);

  // ParentObject with out-of-range origins (-2 -> 0, 3 -> 1)
  instances[1].variables[XId] = 65;
  instances[1].variables[YId] = 33;
  assert.equal(
    plugin.execActionCommand(
      0,
      [
        { id: 100, value: ParentObject },
        { id: 0, value: 20 },
        { id: 1, value: 21 }
      ],
      10,
      1
    ),
    commandBehavior.CommandBehaviorNext
  );
  assert.equal(instances[1].variables[XId], 64);
  assert.equal(instances[1].variables[YId], 48);

  // ProjectCommon via runtime script hook (x=96+32=128, y=192+0=192)
  assert.equal(windowObj.kt.snapToTile.snapToTile(ProjectCommon, 5, 6, 2), commandBehavior.CommandBehaviorNext);
  assert.equal(instances[2].variables[XId], 128);
  assert.equal(instances[2].variables[YId], 192);

  // Partial variable IDs: X valid (0), Y unset (< 1 -> 0.5) on negative X coordinate (-10 -> tile -32)
  assert.equal(
    plugin.execActionCommand(
      0,
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 30 },
        { id: 1, value: -1 }
      ],
      10,
      3
    ),
    commandBehavior.CommandBehaviorNext
  );
  assert.equal(instances[3].variables[XId], -32);
  assert.equal(instances[3].variables[YId], 56);

  // Unset params, unset ParentObject, unknown source, and missing variable IDs default both axes to 0.5
  for (const params of [
    [],
    [
      { id: 100, value: ParentObject },
      { id: 0, value: 20 },
      { id: 1, value: 21 }
    ],
    [
      { id: 100, value: 999 },
      { id: 0, value: 30 },
      { id: 1, value: 30 }
    ],
    [
      { id: 100, value: SelfObject },
      { id: 0, value: 999 },
      { id: 1, value: 0 }
    ]
  ]) {
    instances[3].variables[XId] = 17;
    instances[3].variables[YId] = 17;
    assert.equal(plugin.execActionCommand(0, params, 10, 3), commandBehavior.CommandBehaviorNext);
    assert.equal(instances[3].variables[XId], 16);
    assert.equal(instances[3].variables[YId], 24);
  }
});

test('Snap to Tile (Horizontal) snaps only X and leaves Y untouched', () => {
  const { ProjectCommon, SelfObject, ParentObject } = AGTK_CONSTANTS.switchVariableObjects;
  const { UnsetObject, commandBehavior } = AGTK_CONSTANTS.actionCommands;
  const { XId, YId, ParentObjectInstanceIDId } = AGTK_CONSTANTS.objects.variables;

  const instances = {
    1: {
      variables: {
        [XId]: 19,
        [YId]: 77,
        [ParentObjectInstanceIDId]: 2,
        10: 0.25
      }
    },
    2: {
      variables: {
        [XId]: 33,
        [YId]: 88,
        20: 1.5
      }
    },
    3: {
      variables: {
        [XId]: 5,
        [YId]: 99,
        [ParentObjectInstanceIDId]: UnsetObject
      }
    }
  };

  const { Agtk, cc } = createMockRuntime({
    tileWidth: 16,
    tileHeight: 16,
    projectVariables: { 5: -0.5 },
    instances
  });
  const windowObj = {};
  const plugin = loadPlugin({ Agtk, cc, window: windowObj });
  plugin.initialize();

  // SelfObject origin 0.25 -> tile 16 + 4 = 20; Y stays 77
  assert.equal(
    plugin.execActionCommand(
      1,
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 10 }
      ],
      10,
      1
    ),
    commandBehavior.CommandBehaviorNext
  );
  assert.equal(instances[1].variables[XId], 20);
  assert.equal(instances[1].variables[YId], 77);

  // ParentObject clamped to 1 -> tile 16 + 16 = 32; Y stays 77
  instances[1].variables[XId] = 19;
  assert.equal(
    plugin.execActionCommand(
      1,
      [
        { id: 100, value: ParentObject },
        { id: 0, value: 20 }
      ],
      10,
      1
    ),
    commandBehavior.CommandBehaviorNext
  );
  assert.equal(instances[1].variables[XId], 32);
  assert.equal(instances[1].variables[YId], 77);

  // ProjectCommon clamped to 0 via runtime hook -> tile 32 + 0 = 32; Y stays 88
  assert.equal(windowObj.kt.snapToTile.snapToTileHorizontal(ProjectCommon, 5, 2), commandBehavior.CommandBehaviorNext);
  assert.equal(instances[2].variables[XId], 32);
  assert.equal(instances[2].variables[YId], 88);

  // Default / missing variable / unset parent -> 0.5 center (0 + 8 = 8); Y stays 99
  for (const params of [
    [],
    [
      { id: 100, value: ParentObject },
      { id: 0, value: 20 }
    ],
    [
      { id: 100, value: SelfObject },
      { id: 0, value: 999 }
    ]
  ]) {
    instances[3].variables[XId] = 5;
    assert.equal(plugin.execActionCommand(1, params, 10, 3), commandBehavior.CommandBehaviorNext);
    assert.equal(instances[3].variables[XId], 8);
    assert.equal(instances[3].variables[YId], 99);
  }
});

test('Snap to Tile (Vertical) snaps only Y and leaves X untouched', () => {
  const { ProjectCommon, SelfObject, ParentObject } = AGTK_CONSTANTS.switchVariableObjects;
  const { UnsetObject, commandBehavior } = AGTK_CONSTANTS.actionCommands;
  const { XId, YId, ParentObjectInstanceIDId } = AGTK_CONSTANTS.objects.variables;

  const instances = {
    1: {
      variables: {
        [XId]: 77,
        [YId]: 19,
        [ParentObjectInstanceIDId]: 2,
        10: 0.75
      }
    },
    2: {
      variables: {
        [XId]: 88,
        [YId]: 33,
        20: -1
      }
    },
    3: {
      variables: {
        [XId]: 99,
        [YId]: 5,
        [ParentObjectInstanceIDId]: UnsetObject
      }
    }
  };

  const { Agtk, cc } = createMockRuntime({
    tileWidth: 16,
    tileHeight: 16,
    projectVariables: { 5: 4 },
    instances
  });
  const windowObj = {};
  const plugin = loadPlugin({ Agtk, cc, window: windowObj });
  plugin.initialize();

  // SelfObject origin 0.75 -> tile 16 + 12 = 28; X stays 77
  assert.equal(
    plugin.execActionCommand(
      2,
      [
        { id: 100, value: SelfObject },
        { id: 0, value: 10 }
      ],
      10,
      1
    ),
    commandBehavior.CommandBehaviorNext
  );
  assert.equal(instances[1].variables[XId], 77);
  assert.equal(instances[1].variables[YId], 28);

  // ParentObject clamped to 0 -> tile 16 + 0 = 16; X stays 77
  instances[1].variables[YId] = 19;
  assert.equal(
    plugin.execActionCommand(
      2,
      [
        { id: 100, value: ParentObject },
        { id: 0, value: 20 }
      ],
      10,
      1
    ),
    commandBehavior.CommandBehaviorNext
  );
  assert.equal(instances[1].variables[XId], 77);
  assert.equal(instances[1].variables[YId], 16);

  // ProjectCommon clamped to 1 via runtime hook -> tile 32 + 16 = 48; X stays 88
  assert.equal(windowObj.kt.snapToTile.snapToTileVertical(ProjectCommon, 5, 2), commandBehavior.CommandBehaviorNext);
  assert.equal(instances[2].variables[XId], 88);
  assert.equal(instances[2].variables[YId], 48);

  // Default / missing variable / unset parent -> 0.5 center (0 + 8 = 8); X stays 99
  for (const params of [
    [],
    [
      { id: 100, value: ParentObject },
      { id: 0, value: 20 }
    ],
    [
      { id: 100, value: SelfObject },
      { id: 0, value: 999 }
    ]
  ]) {
    instances[3].variables[YId] = 5;
    assert.equal(plugin.execActionCommand(2, params, 10, 3), commandBehavior.CommandBehaviorNext);
    assert.equal(instances[3].variables[XId], 99);
    assert.equal(instances[3].variables[YId], 8);
  }
});

test('scripts/build.mjs builds plugin.js preserving /**! banner and stripping JSDoc/line comments', () => {
  const distDir = path.join(ROOT, 'dist');
  fs.mkdirSync(distDir, { recursive: true });
  const distTmpDir = fs.mkdtempSync(path.join(distDir, '.tmp-build-out-'));
  try {
    const outFile = path.join(distTmpDir, 'bundle.js');
    const result = spawnSync(process.execPath, [buildScript, outFile], {
      cwd: ROOT,
      encoding: 'utf8'
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const built = fs.readFileSync(outFile, 'utf8');
    assert.match(built, /^\/\*\*![\s\S]*@version 0\.2\.0[\s\S]*\*\//);
    assert.doesNotMatch(built, /\/\/\/ <reference/);
    assert.doesNotMatch(built, /noinspection/);
    assert.doesNotMatch(built, /@param/);

    const { XId, YId } = AGTK_CONSTANTS.objects.variables;
    const instances = { 1: { variables: { [XId]: 21, [YId]: 39 } } };
    const { Agtk, cc } = createMockRuntime({ tileWidth: 16, tileHeight: 16, instances });
    const windowObj = {};
    const plugin = vm.runInNewContext(built, { Agtk, cc, window: windowObj }, { filename: 'bundle.js' });
    plugin.initialize();
    assert.equal(plugin.getInfo('name'), 'PGMMV Snap-To-Tile Plugin');
    assert.equal(
      plugin.execActionCommand(0, [], 10, 1),
      AGTK_CONSTANTS.actionCommands.commandBehavior.CommandBehaviorNext
    );
    assert.equal(instances[1].variables[XId], 24);
    assert.equal(instances[1].variables[YId], 40);
    assert.equal(typeof windowObj.kt.snapToTile.snapToTile, 'function');
  } finally {
    fs.rmSync(distTmpDir, { recursive: true, force: true });
  }
});

test('buildPlugin emits default unscoped dist filename from package.json metadata', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pgmmv-build-fixture-'));
  try {
    fs.writeFileSync(
      path.join(tempRoot, 'package.json'),
      JSON.stringify({ name: '@kidthales/sample-plugin', version: '1.2.3' }),
      'utf8'
    );
    fs.writeFileSync(
      path.join(tempRoot, 'plugin.js'),
      '/**!\n * @license MIT\n */\n// strip me\n(function () { return {}; })();\n',
      'utf8'
    );

    const outPath = await buildPlugin({ rootDir: tempRoot, cwd: tempRoot });
    assert.equal(path.basename(outPath), 'sample-plugin-v1.2.3.js');
    assert.equal(path.dirname(outPath), path.join(tempRoot, 'dist'));

    const built = fs.readFileSync(outPath, 'utf8');
    assert.match(built, /@license MIT/);
    assert.doesNotMatch(built, /strip me/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('scripts/build.mjs enforces self-overwrite and dist/ containment guards including symlinks', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pgmmv-build-guards-'));
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pgmmv-build-outside-'));
  try {
    const inputPath = path.join(tempRoot, 'plugin.js');
    const distDir = path.join(tempRoot, 'dist');
    fs.writeFileSync(inputPath, 'var x = 1;\n', 'utf8');
    fs.mkdirSync(distDir, { recursive: true });

    for (const target of [inputPath, path.join(distDir, '..', 'plugin.js')]) {
      assert.throws(
        () => assertSafeOutputPath({ rootDir: tempRoot, inputPath, distDir, outputPath: target }),
        /Refusing to overwrite input file/
      );
    }

    for (const target of [
      distDir,
      path.join(distDir, '.'),
      path.join(tempRoot, 'outside.js'),
      path.join(outsideDir, 'escape.js'),
      path.join(distDir, '..', 'outside.js')
    ]) {
      assert.throws(
        () => assertSafeOutputPath({ rootDir: tempRoot, inputPath, distDir, outputPath: target }),
        /Refusing to write outside dist directory/
      );
    }

    const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';
    const rootAliasInDist = path.join(distDir, 'root-alias');
    fs.symlinkSync(tempRoot, rootAliasInDist, symlinkType);
    assert.throws(
      () =>
        assertSafeOutputPath({
          rootDir: tempRoot,
          inputPath,
          distDir,
          outputPath: path.join(rootAliasInDist, 'plugin.js')
        }),
      /Refusing to overwrite input file/
    );

    const escapeLinkInDist = path.join(distDir, 'escape-link');
    fs.symlinkSync(outsideDir, escapeLinkInDist, symlinkType);
    assert.throws(
      () =>
        assertSafeOutputPath({
          rootDir: tempRoot,
          inputPath,
          distDir,
          outputPath: path.join(escapeLinkInDist, 'out.js')
        }),
      /Refusing to write outside dist directory/
    );

    const cliFail = spawnSync(process.execPath, [buildScript, '../outside.js'], {
      cwd: ROOT,
      encoding: 'utf8'
    });
    assert.notEqual(cliFail.status, 0);
    assert.match(cliFail.stderr + cliFail.stdout, /Refusing to write outside dist directory/);

    const danglingLink = path.join(distDir, 'dangling-dir');
    fs.symlinkSync(path.join(outsideDir, 'missing-target'), danglingLink, symlinkType);
    assert.throws(() => resolveRealPath(danglingLink), { code: 'ENOENT' });
    assert.throws(() => resolveRealPath(path.join(danglingLink, 'nested', 'out.js')), { code: 'ENOENT' });
    assert.throws(
      () =>
        assertSafeOutputPath({
          rootDir: tempRoot,
          inputPath,
          distDir,
          outputPath: path.join(danglingLink, 'out.js')
        }),
      { code: 'ENOENT' }
    );

    const symlinkDistRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pgmmv-build-symdist-'));
    try {
      const symDistInput = path.join(symlinkDistRoot, 'plugin.js');
      const symDistDir = path.join(symlinkDistRoot, 'dist');
      fs.writeFileSync(symDistInput, 'var x = 1;\n', 'utf8');
      fs.symlinkSync(outsideDir, symDistDir, symlinkType);

      assert.throws(
        () =>
          assertSafeOutputPath({
            rootDir: symlinkDistRoot,
            inputPath: symDistInput,
            distDir: symDistDir,
            outputPath: path.join(symDistDir, 'out.js')
          }),
        /Refusing to write through non-canonical dist directory/
      );
    } finally {
      fs.rmSync(symlinkDistRoot, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    fs.rmSync(outsideDir, { recursive: true, force: true });
  }
});

test('stripComments preserves ES5.1 §7.3 LineTerminator boundaries across CR, LS, and PS', () => {
  assert.equal(stripComments('return/*\r*/1;'), 'return\n1;');
  assert.equal(stripComments('return/*\u2028*/1;'), 'return\n1;');
  assert.equal(stripComments('return/*\u2029*/1;'), 'return\n1;');
  assert.equal(stripComments('var a/*inline*/=1;'), 'var a =1;');
  assert.equal(stripComments('var a = 1; // c\u2028var b = 2;'), 'var a = 1; \u2028var b = 2;');
  assert.equal(stripComments('var a = 1;\u2029'), 'var a = 1;\u2029');
});

test('stripComments rescans template literal braces and regex literals without stripping content', () => {
  const input = [
    'var a = `head ${ { k: 1 /* strip */ } } /* keep */ // keep`;',
    'var b = `m1 ${1} /* keep1 */ ${ `nested ${2} /* keep2 */` } // keep3`;',
    'var c = `div ${1}` / 2; // strip',
    'var r = /foo\\/\\*bar\\*\\/baz/g; /* strip */'
  ].join('\n');

  const output = stripComments(input);
  assert.match(output, /\/\* keep \*\/ \/\/ keep`/);
  assert.match(output, /\/\* keep1 \*\//);
  assert.match(output, /\/\* keep2 \*\//);
  assert.match(output, /\/\/ keep3`/);
  assert.match(output, /var c = `div \$\{1\}` \/ 2;/);
  assert.match(output, /var r = \/foo\\\/\\\*bar\\\*\\\/baz\/g;/);
  assert.doesNotMatch(output, /\/\* strip \*\//);
  assert.doesNotMatch(output, /\/\/ strip/);
});

test('stripComments and buildPlugin handle division after contextual/future-reserved identifiers and member keywords', async () => {
  const snippet = [
    '/**! @license MIT */',
    'var type = 10, out = 20, from = 4, set = 6, get = 8, of = 12, await = 14, yield = 16;',
    'var cfg = { default: 8, return: 10, await: 12 };',
    "var half = type / 2; // don't clip",
    "out /= 2; // don't break",
    "var mid = cfg.default / 2; // don't expose midpoint",
    "var opt = cfg?.return / 2; // don't break optional chaining",
    "var optAwait = cfg?.await / 2; // don't break member await",
    "var ratio = from / 2 + set / 2 + get / 2 + of / 2 + await / 2 + yield / 2; // don't leak",
    "var undef = undefined / 2; // don't break undefined",
    "for (var i = of / 2; i < 1; i++) {} // don't break for-init of"
  ].join('\n');

  const stripped = stripComments(snippet);
  assert.doesNotMatch(stripped, /don't/);
  assert.match(stripped, /var half = type \/ 2;/);
  assert.match(stripped, /out \/= 2;/);
  assert.match(stripped, /var mid = cfg\.default \/ 2;/);
  assert.match(stripped, /var opt = cfg\?\.return \/ 2;/);

  const es5BuildSnippet = [
    '/**! @license MIT */',
    'var type = 10, out = 20, from = 4, of = 12, await = 14, yield = 16;',
    'var cfg = { default: 8, return: 10 };',
    "var half = type / 2; // don't clip",
    "out /= 2; // don't break",
    "var mid = cfg.default / 2; // don't expose midpoint",
    "var ratio = from / 2 + of / 2 + await / 2 + yield / 2; // don't leak",
    "var ret = cfg.return / 2; // don't fail"
  ].join('\n');

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pgmmv-build-div-'));
  try {
    fs.writeFileSync(
      path.join(tempRoot, 'package.json'),
      JSON.stringify({ name: '@kidthales/div-plugin', version: '0.2.0' }),
      'utf8'
    );
    fs.writeFileSync(path.join(tempRoot, 'plugin.js'), es5BuildSnippet, 'utf8');

    const outPath = await buildPlugin({ rootDir: tempRoot, cwd: tempRoot });
    const built = fs.readFileSync(outPath, 'utf8');
    assert.doesNotMatch(built, /don't/);
    assert.match(built, /type \/ 2/);
    assert.match(built, /out \/= 2/);
    assert.match(built, /cfg\.default \/ 2/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('stripComments still rescans regex literals after for-of, async await, and generator yield', () => {
  const input = [
    'for (var x of /a\\/\\*keep\\*\\//g) {} /* strip */',
    'async function f() { return await /b\\/\\*keep\\*\\//g; /* strip */ }',
    'const g = async (x) => await /c\\/\\*keep\\*\\//g; /* strip */',
    'function* gen() { yield /d\\/\\*keep\\*\\//g; /* strip */ }',
    'async function outer() {',
    '  function inner() {',
    '    var await = 10;',
    "    return await / 2; // don't leak",
    '  }',
    '  return inner() && (await /e\\/\\*keep\\*\\//g); /* strip */',
    '}'
  ].join('\n');

  const output = stripComments(input);
  assert.match(output, /\/a\\\/\\\*keep\\\*\\\/\/g/);
  assert.match(output, /\/b\\\/\\\*keep\\\*\\\/\/g/);
  assert.match(output, /\/c\\\/\\\*keep\\\*\\\/\/g/);
  assert.match(output, /\/d\\\/\\\*keep\\\*\\\/\/g/);
  assert.match(output, /\/e\\\/\\\*keep\\\*\\\/\/g/);
  assert.doesNotMatch(output, /\/\* strip \*\//);
  assert.doesNotMatch(output, /don't leak/);
});

test('stripComments and buildPlugin handle statement-header regexes, prefix/postfix ++/--, and expression braces', async () => {
  const input = [
    'if (cond) /[//]/.test(s);',
    'var x = 1;',
    'if (cond) /[/*]/.test(s) && /[*/]/.test(s);',
    'while (cond) /[//]/.test(s);',
    'for (var i = 0; i < 1; i++) /[/*]/.test(s) && /[*/]/.test(s);',
    'with (obj) /[//]/.test(s);',
    'var callDiv = obj.if(cond) / 2; /* strip */',
    'var optCallDiv = obj?.while(cond) / 2; /* strip */',
    'var n = ++/[//]/.lastIndex;',
    'var y = 1;',
    'var sum = ++/[/*]/.lastIndex + --/[*/]/.lastIndex;',
    'a',
    '++/[//]/.lastIndex;',
    'a /*',
    '*/ --/[//]/.lastIndex;',
    '{ foo(); } ++/[//]/.lastIndex;',
    'if (cond) ++/[//]/.lastIndex;',
    'var postA = a++ / 2; /* strip */',
    'var postB = arr[i]-- / 2; /* strip */',
    'var postC = obj.default++ / 2; /* strip */',
    'var objDiv = { a: 1 } / 2; /* strip */',
    'var fnDiv = function () {} / 2; /* strip */',
    'var asyncFnDiv = async function () {} / 2; /* strip */',
    'var clsDiv = class {} / 2; /* strip */',
    'var ternDiv = cond ? { a: 1 } : { b: 2 } / 2; /* strip */',
    'var nestedObjDiv = { a: { b: 1 } / 2 }; /* strip */',
    'if (cond) { foo(); } /[//]/.test(s);',
    'function decl() {} /[/*]/.test(s) && /[*/]/.test(s);',
    'class Decl {} /[//]/.test(s);',
    'lbl: { foo(); } /[//]/.test(s);',
    'switch (v) { case 1: { foo(); } /[//]/.test(s); }',
    'const arrowBlock = () => {}',
    '/[//]/.test(s);'
  ].join('\n');

  const output = stripComments(input);
  assert.doesNotMatch(output, /\/\* strip \*\//);
  assert.match(output, /if \(cond\) \/\[\/\/\]\/\.test\(s\);/);
  assert.match(output, /if \(cond\) \/\[\/\*\]\/\.test\(s\) && \/\[(\*\/)\]\/\.test\(s\);/);
  assert.match(output, /while \(cond\) \/\[\/\/\]\/\.test\(s\);/);
  assert.match(output, /for \(var i = 0; i < 1; i\+\+\) \/\[\/\*\]\/\.test\(s\) && \/\[(\*\/)\]\/\.test\(s\);/);
  assert.match(output, /with \(obj\) \/\[\/\/\]\/\.test\(s\);/);
  assert.match(output, /var n = \+\+\/\[\/\/\]\/\.lastIndex;/);
  assert.match(output, /var sum = \+\+\/\[\/\*\]\/\.lastIndex \+ --\/\[(\*\/)\]\/\.lastIndex;/);
  assert.match(output, /a\n\+\+\/\[\/\/\]\/\.lastIndex;/);
  assert.match(output, /--\/\[\/\/\]\/\.lastIndex;/);
  assert.match(output, /\{ foo\(\); \} \+\+\/\[\/\/\]\/\.lastIndex;/);
  assert.match(output, /if \(cond\) \+\+\/\[\/\/\]\/\.lastIndex;/);
  assert.match(output, /var objDiv = \{ a: 1 \} \/ 2;/);
  assert.match(output, /var fnDiv = function \(\) \{\} \/ 2;/);
  assert.match(output, /if \(cond\) \{ foo\(\); \} \/\[\/\/\]\/\.test\(s\);/);
  assert.match(output, /function decl\(\) \{\} \/\[\/\*\]\/\.test\(s\) && \/\[(\*\/)\]\/\.test\(s\);/);
  assert.match(output, /class Decl \{\} \/\[\/\/\]\/\.test\(s\);/);
  assert.match(output, /lbl: \{ foo\(\); \} \/\[\/\/\]\/\.test\(s\);/);
  assert.match(output, /switch \(v\) \{ case 1: \{ foo\(\); \} \/\[\/\/\]\/\.test\(s\); \}/);
  assert.match(output, /const arrowBlock = \(\) => \{\}\n\/\[\/\/\]\/\.test\(s\);/);

  const es5BuildSnippet = [
    '/**! @license MIT */',
    'if (cond) /[//]/.test(s);',
    'var x = 1;',
    'if (cond) /[/*]/.test(s) && /[*/]/.test(s);',
    'var n = ++/[//]/.lastIndex;',
    'var y = 1;',
    'var objDiv = { a: 1 } / 2; /* strip */',
    'var fnDiv = function () {} / 2; /* strip */'
  ].join('\n');

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pgmmv-build-f1-'));
  try {
    fs.writeFileSync(
      path.join(tempRoot, 'package.json'),
      JSON.stringify({ name: '@kidthales/f1-plugin', version: '0.2.0' }),
      'utf8'
    );
    fs.writeFileSync(path.join(tempRoot, 'plugin.js'), es5BuildSnippet, 'utf8');

    const outPath = await buildPlugin({ rootDir: tempRoot, cwd: tempRoot });
    const built = fs.readFileSync(outPath, 'utf8');
    assert.doesNotMatch(built, /\/\* strip \*\//);
    assert.match(built, /if \(cond\) \/\[\/\/\]\/\.test\(s\);/);
    assert.match(built, /if \(cond\) \/\[\/\*\]\/\.test\(s\) && \/\[(\*\/)\]\/\.test\(s\);/);
    assert.match(built, /var n = \+\+\/\[\/\/\]\/\.lastIndex;/);
    assert.match(built, /var objDiv = \{ a: 1 \} \/ 2;/);
    assert.match(built, /var fnDiv = function \(\) \{\} \/ 2;/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('stripComments handles member-keyword for-of LHS, ASI-terminated concise async arrows, and object methods', () => {
  const input = [
    'for (obj.default of /[/*]/.exec(s) || []) {} /* strip */',
    'for (obj.of of /[/*]/.exec(s) || []) {} /* strip */',
    'const f = async (x) => x',
    'var y = await / 2; /* strip */',
    'async function outer() {',
    '  var o = {',
    '    m() {',
    '      var await = 10;',
    '      return await / 2; /* strip */',
    '    }',
    '  };',
    '  return o;',
    '}'
  ].join('\n');

  const output = stripComments(input);
  assert.doesNotMatch(output, /\/\* strip \*\//);
  assert.match(output, /for \(obj\.default of \/\[\/\*\]\/\.exec\(s\) \|\| \[\]\)/);
  assert.match(output, /for \(obj\.of of \/\[\/\*\]\/\.exec\(s\) \|\| \[\]\)/);
  assert.match(output, /var y = await \/ 2;/);
  assert.match(output, /return await \/ 2;/);
});

test('stripComments and buildPlugin preserve regexes and divisions across nested for-headers, async blocks, template interpolations, and adjacent JSDoc banners', async () => {
  const input = [
    '/**!',
    ' * @license MIT',
    ' *//**',
    ' * @description strip me',
    ' */',
    'for (var f = function () { s = "a"; { s = "b"; } /[/*]/.test(s) && /[*/]/.test(s); }; false; ) {}',
    'for (var g = function () { s = "a"; { s = "b"; } /[//]/.test(s);',
    'var z = 1; }; false; ) {}',
    'for (let [x = function () { a(); }()] of /[/*]/.exec(s) && /[*/]/.exec(s)) {}',
    'async function outer() {',
    '  var async = function () {};',
    '  async()',
    '  { return await /[/*]/.test(s) && /[*/]/.test(s); }',
    '}',
    'var await = 10;',
    "var x = `${async () => 1}` && await / 2; // don't crash"
  ].join('\n');

  const output = stripComments(input);
  assert.match(output, /@license MIT/);
  assert.doesNotMatch(output, /@description strip me/);
  assert.doesNotMatch(output, /don't crash/);
  assert.match(output, /\{ s = "b"; \} \/\[\/\*\]\/\.test\(s\) && \/\[(\*\/)\]\/\.test\(s\);/);
  assert.match(output, /\{ s = "b"; \} \/\[\/\/\]\/\.test\(s\);\nvar z = 1;/);
  assert.match(output, /of \/\[\/\*\]\/\.exec\(s\) && \/\[(\*\/)\]\/\.exec\(s\)/);
  assert.match(output, /\{ return await \/\[\/\*\]\/\.test\(s\) && \/\[(\*\/)\]\/\.test\(s\); \}/);
  assert.match(output, /var x = `\$\{async \(\) => 1\}` && await \/ 2;/);

  const es5BuildSnippet = [
    '/**!',
    ' * @license MIT',
    ' *//**',
    ' * @description strip me',
    ' */',
    'for (var f = function () { s = "a"; { s = "b"; } /[/*]/.test(s) && /[*/]/.test(s); }; false; ) {}',
    'for (var g = function () { s = "a"; { s = "b"; } /[//]/.test(s);',
    'var z = 1; }; false; ) {}'
  ].join('\n');

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pgmmv-build-vectors-'));
  try {
    fs.writeFileSync(
      path.join(tempRoot, 'package.json'),
      JSON.stringify({ name: '@kidthales/vectors-plugin', version: '0.2.0' }),
      'utf8'
    );
    fs.writeFileSync(path.join(tempRoot, 'plugin.js'), es5BuildSnippet, 'utf8');

    const outPath = await buildPlugin({ rootDir: tempRoot, cwd: tempRoot });
    const built = fs.readFileSync(outPath, 'utf8');
    assert.match(built, /@license MIT/);
    assert.doesNotMatch(built, /@description strip me/);
    assert.match(built, /\/\[\/\*\]\/\.test\(s\) && \/\[(\*\/)\]\/\.test\(s\)/);
    assert.match(built, /\/\[\/\/\]\/\.test\(s\);/);
    assert.match(built, /var z = 1;/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('eslint rejects non-ES5 syntax in plugin.js', () => {
  const result = spawnSync(process.execPath, [eslintBin, '--stdin', '--stdin-filename', 'plugin.js'], {
    cwd: ROOT,
    input: 'const x = () => 1;\n',
    encoding: 'utf8'
  });

  assert.notEqual(result.status, 0, 'ESLint must reject ES6+ syntax under ecmaVersion: 5');
  assert.match(result.stdout + result.stderr, /Parsing error/i);
});

test('tsc --noEmit rejects invalid @kidthales/pgmmv-types usage under checkJs', () => {
  const tempDir = fs.mkdtempSync(path.join(ROOT, '.tmp-tsc-probe-'));
  try {
    const probePath = path.join(tempDir, 'probe.js');
    fs.writeFileSync(
      probePath,
      [
        '/// <reference types="@kidthales/pgmmv-types/pgmmv.d.ts" />',
        '(function () {',
        '  /** @type {import("@kidthales/pgmmv-types").AgtkPlugin} */',
        '  var invalidPlugin = {',
        '    setLocale: function () {},',
        '    getInfo: function () {},',
        '    initialize: function () {',
        '      Agtk.nonexistent();',
        '    },',
        '    finalize: function () {},',
        '    setParamValue: function () {},',
        '    setInternal: function () {},',
        '    call: function () {},',
        '    execActionCommand: function () {',
        "      return 'not-a-boolean';",
        '    }',
        '  };',
        '  return invalidPlugin;',
        '})();'
      ].join('\n'),
      'utf8'
    );

    const tsconfigPath = path.join(tempDir, 'tsconfig.json');
    fs.writeFileSync(
      tsconfigPath,
      JSON.stringify(
        {
          compilerOptions: {
            target: 'es2020',
            lib: ['es2020', 'dom'],
            module: 'nodenext',
            moduleResolution: 'nodenext',
            allowJs: true,
            checkJs: true,
            noEmit: true,
            strict: true,
            types: ['@kidthales/pgmmv-types']
          },
          include: ['probe.js']
        },
        null,
        2
      ),
      'utf8'
    );

    const result = spawnSync(process.execPath, [tscBin, '-p', tsconfigPath, '--noEmit'], {
      cwd: ROOT,
      encoding: 'utf8'
    });

    assert.notEqual(result.status, 0, 'tsc --noEmit must reject invalid Agtk API and return types');
    const output = result.stdout + result.stderr;
    assert.match(output, /TS2339/);
    assert.match(output, /TS2322/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
