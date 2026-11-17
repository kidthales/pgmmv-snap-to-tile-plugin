/**!
 * @file PGMMV Snap-To-Tile Plugin
 * @author Tristan Bonsor <kidthales@agogpixel.com>
 * @copyright 2026 Tristan Bonsor
 * @license {@link https://opensource.org/licenses/MIT MIT License}
 * @version 0.2.0
 */
/// <reference path="./node_modules/@kidthales/pgmmv-types/pgmmv.d.ts" />
// noinspection ES6ConvertVarToLetConst
(function () {
  /**
   * @typedef {import("@kidthales/pgmmv-types").Agtk['constants']['switchVariableObjects']} AgtkSwitchVariableObjects
   * @typedef {AgtkSwitchVariableObjects['ProjectCommon'] | AgtkSwitchVariableObjects['SelfObject'] | AgtkSwitchVariableObjects['ParentObject']} SwitchVariableObjectId
   * @typedef {import("@kidthales/pgmmv-types").Agtk['constants']['actionCommands']['commandBehavior']['CommandBehaviorNext']} CommandBehaviorNext
   * @typedef {import("@kidthales/pgmmv-types").Agtk['constants']['actionCommands']['UnsetObject']} AgtkUnsetObject
   * @typedef {ReturnType<import("@kidthales/pgmmv-types").Agtk['objectInstances']['get']>} AgtkObjectInstance
   * @typedef {ReturnType<import("@kidthales/pgmmv-types").Agtk['variables']['get']> | ReturnType<AgtkObjectInstance['variables']['get']>} AgtkVariable
   * @typedef {import("@kidthales/pgmmv-types").AgtkParameterValue['value']} JsonValue
   */

  // noinspection UnnecessaryLocalVariableJS
  /**
   * @type {import("@kidthales/pgmmv-types").AgtkPlugin}
   */
  var plugin = {
    setLocale: function () {},
    getInfo: function (category) {
      switch (category) {
        case 'name':
          return 'PGMMV Snap-To-Tile Plugin';
        case 'description':
          return 'Position objects within their current tile.';
        case 'author':
          return 'Tristan Bonsor <kidthales@agogpixel.com>';
        case 'help':
          return (
            'This plugin provides a way to position an object with its current tile, relative\n' +
            "to the tile's top or left. Suitable for use with platformer-style ladder tiles,\n" +
            'overview-style grid movement, or any other use case that requires object\n' +
            'positioning within a tile.\n' +
            '\n' +
            'Object position within a tile is expressed as a value between 0 (left or top)\n' +
            'and 1 (right or bottom). Separate action commands are provided for 2-axis and\n' +
            'single-axis positioning.'
          );
        case 'parameter':
          return [];
        case 'internal':
          return {};
        case 'actionCommand':
          return [snapToTileActionCommand, snapToTileHorizontalActionCommand, snapToTileVerticalActionCommand];
        case 'linkCondition':
          return [];
        default:
          break;
      }
    },
    initialize: function () {
      if (isEditor()) {
        return;
      }

      if (!window.kt) {
        window.kt = {};
      }

      window.kt.snapToTile = {
        snapToTile: snapToTile,
        snapToTileHorizontal: snapToTileHorizontal,
        snapToTileVertical: snapToTileVertical
      };
    },
    finalize: function () {},
    setParamValue: function () {},
    setInternal: function () {},
    call: function () {},
    execActionCommand: function (actionCommandIndex, parameter, objectId, instanceId) {
      /** @type {import("@kidthales/pgmmv-types").AgtkActionCommand} */
      var actionCommand = /** @type {import("@kidthales/pgmmv-types").AgtkPluginInfoResult<'actionCommand'>} */ (
          plugin.getInfo('actionCommand')
        )[actionCommandIndex],
        /** @type {Record<number, JsonValue>} */
        np = normalizeParameters(parameter, actionCommand.parameter);

      switch (actionCommand.id) {
        case snapToTileActionCommand.id:
          return snapToTile(
            /** @type {SwitchVariableObjectId} */ (np[actionCommand.parameter[0].id]),
            /** @type {number} */ (np[actionCommand.parameter[1].id]),
            /** @type {number} */ (np[actionCommand.parameter[2].id]),
            instanceId
          );
        case snapToTileHorizontalActionCommand.id:
          return snapToTileHorizontal(
            /** @type {SwitchVariableObjectId} */ (np[actionCommand.parameter[0].id]),
            /** @type {number} */ (np[actionCommand.parameter[1].id]),
            instanceId
          );
        case snapToTileVerticalActionCommand.id:
          return snapToTileVertical(
            /** @type {SwitchVariableObjectId} */ (np[actionCommand.parameter[0].id]),
            /** @type {number} */ (np[actionCommand.parameter[1].id]),
            instanceId
          );
        default:
          break;
      }

      return Agtk.constants.actionCommands.commandBehavior.CommandBehaviorNext;
    }
  };

  /** @type {import("@kidthales/pgmmv-types").AgtkActionCommand} */
  var snapToTileActionCommand = {
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
  };

  /** @type {import("@kidthales/pgmmv-types").AgtkActionCommand} */
  var snapToTileHorizontalActionCommand = {
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
  };

  /** @type {import("@kidthales/pgmmv-types").AgtkActionCommand} */
  var snapToTileVerticalActionCommand = {
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
  };

  /**
   * @param {SwitchVariableObjectId} variableObjectId
   * @param {number} originXVariableId
   * @param {number} originYVariableId
   * @param {number} instanceId
   * @returns {CommandBehaviorNext}
   */
  var snapToTile = function (variableObjectId, originXVariableId, originYVariableId, instanceId) {
    var projectCommon = Agtk.constants.switchVariableObjects.ProjectCommon,
      source = resolveSwitchVariableObject(variableObjectId, instanceId),
      /** @type {AgtkVariable} */
      originXVariable,
      /** @type {AgtkVariable} */
      originYVariable,
      /** @type {number | undefined} */
      originX = undefined,
      /** @type {number | undefined} */
      originY = undefined,
      objectInstance = Agtk.objectInstances.get(instanceId),
      xVariable = objectInstance.variables.get(Agtk.constants.objects.variables.XId),
      yVariable = objectInstance.variables.get(Agtk.constants.objects.variables.YId),
      tileWidth = Agtk.settings.tileWidth,
      tileHeight = Agtk.settings.tileHeight;

    if (source === Agtk.constants.actionCommands.UnsetObject) {
      originX = originY = 0.5;
    } else {
      if (originXVariableId < 1) {
        originX = 0.5;
      }

      if (originYVariableId < 1) {
        originY = 0.5;
      }

      if (originX === undefined) {
        originXVariable = (source === projectCommon ? Agtk : source).variables.get(originXVariableId);
        originX = !originXVariable ? 0.5 : cc.clampf(originXVariable.getValue(), 0, 1);
      }

      if (originY === undefined) {
        originYVariable = (source === projectCommon ? Agtk : source).variables.get(originYVariableId);
        originY = !originYVariable ? 0.5 : cc.clampf(originYVariable.getValue(), 0, 1);
      }
    }

    xVariable.setValue(Math.floor(xVariable.getValue() / tileWidth) * tileWidth + originX * tileWidth);
    yVariable.setValue(Math.floor(yVariable.getValue() / tileHeight) * tileHeight + originY * tileHeight);

    return Agtk.constants.actionCommands.commandBehavior.CommandBehaviorNext;
  };

  /**
   * @param {SwitchVariableObjectId} variableObjectId
   * @param {number} originXVariableId
   * @param {number} instanceId
   * @returns {CommandBehaviorNext}
   */
  var snapToTileHorizontal = function (variableObjectId, originXVariableId, instanceId) {
    var source = resolveSwitchVariableObject(variableObjectId, instanceId),
      /** @type {AgtkVariable} */
      originXVariable,
      /** @type {number} */
      originX,
      objectInstance = Agtk.objectInstances.get(instanceId),
      xVariable = objectInstance.variables.get(Agtk.constants.objects.variables.XId),
      tileWidth = Agtk.settings.tileWidth;

    if (source === Agtk.constants.actionCommands.UnsetObject || originXVariableId < 1) {
      originX = 0.5;
    } else {
      originXVariable = (source === Agtk.constants.switchVariableObjects.ProjectCommon ? Agtk : source).variables.get(
        originXVariableId
      );
      originX = !originXVariable ? 0.5 : cc.clampf(originXVariable.getValue(), 0, 1);
    }

    xVariable.setValue(Math.floor(xVariable.getValue() / tileWidth) * tileWidth + originX * tileWidth);

    return Agtk.constants.actionCommands.commandBehavior.CommandBehaviorNext;
  };

  /**
   * @param {SwitchVariableObjectId} variableObjectId
   * @param {number} originYVariableId
   * @param {number} instanceId
   * @returns {CommandBehaviorNext}
   */
  var snapToTileVertical = function (variableObjectId, originYVariableId, instanceId) {
    var source = resolveSwitchVariableObject(variableObjectId, instanceId),
      /** @type {AgtkVariable} */
      originYVariable,
      /** @type {number} */
      originY,
      objectInstance = Agtk.objectInstances.get(instanceId),
      yVariable = objectInstance.variables.get(Agtk.constants.objects.variables.YId),
      tileHeight = Agtk.settings.tileHeight;

    if (source === Agtk.constants.actionCommands.UnsetObject || originYVariableId < 1) {
      originY = 0.5;
    } else {
      originYVariable = (source === Agtk.constants.switchVariableObjects.ProjectCommon ? Agtk : source).variables.get(
        originYVariableId
      );
      originY = !originYVariable ? 0.5 : cc.clampf(originYVariable.getValue(), 0, 1);
    }

    yVariable.setValue(Math.floor(yVariable.getValue() / tileHeight) * tileHeight + originY * tileHeight);

    return Agtk.constants.actionCommands.commandBehavior.CommandBehaviorNext;
  };

  /**
   * @returns {boolean}
   */
  var isEditor = function () {
    return !Agtk || typeof Agtk.log !== 'function';
  };

  /**
   * @param {import("@kidthales/pgmmv-types").AgtkParameterValue[]} paramValue Parameter values to normalize.
   * @param {import("@kidthales/pgmmv-types").AgtkParameter[]} defaults Default parameter values available.
   * @returns {Record<number, JsonValue>}
   */
  var normalizeParameters = function (paramValue, defaults) {
    /** @type {Record<number, JsonValue>} */
    var normalized = {},
      /** @type {number} */
      len = defaults.length,
      /** @type {number} */
      i = 0,
      /** @type {import("@kidthales/pgmmv-types").AgtkParameter} */
      defaultParam,
      /** @type {import("@kidthales/pgmmv-types").AgtkParameterValue} */
      param;

    for (; i < len; ++i) {
      defaultParam = defaults[i];
      normalized[defaultParam.id] =
        defaultParam.type === 'Json'
          ? JSON.stringify(defaultParam.defaultValue)
          : /** @type {JsonValue} */ (defaultParam.defaultValue);
    }

    len = paramValue.length;

    for (i = 0; i < len; ++i) {
      param = paramValue[i];
      normalized[param.id] = param.value;
    }

    return normalized;
  };

  /**
   * @param {SwitchVariableObjectId} switchVariableObjectId
   * @param {number} instanceId
   * @returns {AgtkObjectInstance | AgtkSwitchVariableObjects['ProjectCommon'] | AgtkUnsetObject}
   */
  var resolveSwitchVariableObject = function (switchVariableObjectId, instanceId) {
    var instance = Agtk.objectInstances.get(instanceId),
      pId;

    switch (switchVariableObjectId) {
      case Agtk.constants.switchVariableObjects.ProjectCommon:
        return switchVariableObjectId;
      case Agtk.constants.switchVariableObjects.SelfObject:
        return instance;
      case Agtk.constants.switchVariableObjects.ParentObject:
        pId = instance.variables.get(Agtk.constants.objects.variables.ParentObjectInstanceIDId).getValue();

        if (pId !== Agtk.constants.actionCommands.UnsetObject) {
          return Agtk.objectInstances.get(pId);
        }

        break;
      default:
        break;
    }

    return Agtk.constants.actionCommands.UnsetObject;
  };

  return plugin;
})();
