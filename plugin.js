/**!
 * @file PGMMV Snap-To-Tile Plugin
 * @author Tristan Bonsor <kidthales@agogpixel.com>
 * @copyright 2026 Tristan Bonsor
 * @license {@link https://opensource.org/licenses/MIT MIT License}
 * @version 0.1.0
 */
// noinspection ES6ConvertVarToLetConst
(function () {
  // noinspection UnnecessaryLocalVariableJS
  /**
   * @type {import("pgmmv-types/lib/agtk/plugins/plugin").AgtkPlugin}
   */
  var plugin = {
      setLocale: function () {},
      getInfo: function (category) {
        switch (category) {
          case 'name':
            return 'PGMMV Snap-To-Tile Plugin';
          case 'description':
            return 'Snap-to-tile action commands.';
          case 'author':
            return 'Tristan Bonsor <kidthales@agogpixel.com>';
          case 'help':
            return '';
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
        /** @type {import("pgmmv-types/lib/agtk/plugins/plugin").AgtkActionCommand} */
        var actionCommand = plugin.getInfo('actionCommand')[actionCommandIndex],
          /** @type {Record<number,import("type-fest").JsonValue>} */
          np = normalizeParameters(parameter, actionCommand.parameter);

        switch (actionCommand.id) {
          case snapToTileActionCommand.id:
            return snapToTile(
              np[actionCommand.parameter[0].id],
              np[actionCommand.parameter[1].id],
              np[actionCommand.parameter[2].id],
              instanceId
            );
          case snapToTileHorizontalActionCommand.id:
            return snapToTileHorizontal(
              np[actionCommand.parameter[0].id],
              np[actionCommand.parameter[1].id],
              instanceId
            );
          case snapToTileVerticalActionCommand.id:
            return snapToTileVertical(np[actionCommand.parameter[0].id], np[actionCommand.parameter[1].id], instanceId);
          default:
            break;
        }

        return Agtk.constants.actionCommands.commandBehavior.CommandBehaviorNext;
      }
    },
    /** @type {import("pgmmv-types/lib/agtk/plugins/plugin").AgtkActionCommand} */
    snapToTileActionCommand = {
      id: 0,
      name: 'Snap to Tile [PGMMV Snap-To-Tile Plugin]',
      description:
        'Snap object position to current tile. Tile origin (0,0) is top left, (1,1) is bottom right, and (0.5, 0.5) is center (default).',
      parameter: [
        {
          id: 100,
          name: 'Variable Source:',
          type: 'SwitchVariableObjectId',
          option: ['SelfObject', 'ParentObject'],
          defaultValue: -1
        },
        {
          id: 0,
          name: 'Origin X:',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        },
        {
          id: 1,
          name: 'Origin Y:',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        }
      ]
    },
    /** @type {import("pgmmv-types/lib/agtk/plugins/plugin").AgtkActionCommand} */
    snapToTileHorizontalActionCommand = {
      id: 1,
      name: 'Snap to Tile (Horizontal) [PGMMV Snap-To-Tile Plugin]',
      description:
        'Snap object position horizontally to current tile. Tile origin 0 is left, 1 is right, and 0.5 is center (default).',
      parameter: [
        {
          id: 100,
          name: 'Variable Source:',
          type: 'SwitchVariableObjectId',
          option: ['SelfObject', 'ParentObject'],
          defaultValue: -1
        },
        {
          id: 0,
          name: 'Origin X:',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        }
      ]
    },
    /** @type {import("pgmmv-types/lib/agtk/plugins/plugin").AgtkActionCommand} */
    snapToTileVerticalActionCommand = {
      id: 2,
      name: 'Snap to Tile (Vertical) [PGMMV Snap-To-Tile Plugin]',
      description:
        'Snap object position vertically to current tile. Tile origin 0 is top, 1 is bottom, and 0.5 is center (default).',
      parameter: [
        {
          id: 100,
          name: 'Variable Source:',
          type: 'SwitchVariableObjectId',
          option: ['SelfObject', 'ParentObject'],
          defaultValue: -1
        },
        {
          id: 0,
          name: 'Origin Y:',
          type: 'VariableId',
          referenceId: 100,
          withNewButton: true,
          defaultValue: -1
        }
      ]
    },
    /**
     * @param variableObjectId {
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['ProjectCommon'] |
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['SelfObject'] |
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['ParentObject']
     * }
     * @param originXVariableId {number}
     * @param originYVariableId {number}
     * @param instanceId {number}
     * @returns {import("pgmmv-types/lib/agtk/constants/action-commands/command-behavior").AgtkCommandBehavior['CommandBehaviorNext']}
     */
    snapToTile = function (variableObjectId, originXVariableId, originYVariableId, instanceId) {
      var projectCommon = Agtk.constants.switchVariableObjects.ProjectCommon,
        source = resolveSwitchVariableObject(variableObjectId, instanceId),
        /**
         * @type {
         *   import("pgmmv-types/lib/agtk/variables/variable").AgtkVariable |
         *   import("pgmmv-types/lib/agtk/object-instances/object-instance/variables/variable").AgtkVariable
         * }
         */
        originXVariable,
        /**
         * @type {
         *   import("pgmmv-types/lib/agtk/variables/variable").AgtkVariable |
         *   import("pgmmv-types/lib/agtk/object-instances/object-instance/variables/variable").AgtkVariable
         * }
         */
        originYVariable,
        /** @type {number} */
        originX,
        /** @type {number} */
        originY,
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
      }

      if (originX === undefined) {
        originXVariable = (source === projectCommon ? Agtk : source).variables.get(originXVariableId);
        originX = !originXVariable ? 0.5 : cc.clampf(originXVariable.getValue(), 0, 1);
      }

      if (originY === undefined) {
        originYVariable = (source === projectCommon ? Agtk : source).variables.get(originYVariableId);
        originY = !originYVariable ? 0.5 : cc.clampf(originYVariable.getValue(), 0, 1);
      }

      xVariable.setValue(Math.floor(xVariable.getValue() / tileWidth) * tileWidth + originX * tileWidth);
      yVariable.setValue(Math.floor(yVariable.getValue() / tileHeight) * tileHeight + originY * tileHeight);

      return Agtk.constants.actionCommands.commandBehavior.CommandBehaviorNext;
    },
    /**
     * @param variableObjectId {
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['ProjectCommon'] |
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['SelfObject'] |
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['ParentObject']
     * }
     * @param originXVariableId {number}
     * @param instanceId {number}
     * @returns {import("pgmmv-types/lib/agtk/constants/action-commands/command-behavior").AgtkCommandBehavior['CommandBehaviorNext']}
     */
    snapToTileHorizontal = function (variableObjectId, originXVariableId, instanceId) {
      var source = resolveSwitchVariableObject(variableObjectId, instanceId),
        /**
         * @type {
         *   import("pgmmv-types/lib/agtk/variables/variable").AgtkVariable |
         *   import("pgmmv-types/lib/agtk/object-instances/object-instance/variables/variable").AgtkVariable
         * }
         */
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
    },
    /**
     * @param variableObjectId {
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['ProjectCommon'] |
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['SelfObject'] |
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['ParentObject']
     * }
     * @param originYVariableId {number}
     * @param instanceId {number}
     * @returns {import("pgmmv-types/lib/agtk/constants/action-commands/command-behavior").AgtkCommandBehavior['CommandBehaviorNext']}
     */
    snapToTileVertical = function (variableObjectId, originYVariableId, instanceId) {
      var source = resolveSwitchVariableObject(variableObjectId, instanceId),
        /**
         * @type {
         *   import("pgmmv-types/lib/agtk/variables/variable").AgtkVariable |
         *   import("pgmmv-types/lib/agtk/object-instances/object-instance/variables/variable").AgtkVariable
         * }
         */
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
    },
    /**
     * @returns {boolean}
     */
    isEditor = function () {
      return !Agtk || typeof Agtk.log !== 'function';
    },
    /**
     * @param paramValue {import("pgmmv-types/lib/agtk/plugins/plugin").AgtkParameterValue[]} Parameter values to normalize.
     * @param defaults {import("pgmmv-types/lib/agtk/plugins/plugin/parameter").AgtkParameter[]} Default parameter values available.
     * @returns {Record<number, import("type-fest").JsonValue>}
     */
    normalizeParameters = function (paramValue, defaults) {
      /** @type {Record<number,import("type-fest").JsonValue>} */
      var normalized = {},
        /** @type {number} */
        len = defaults.length,
        /** @type {number} */
        i = 0,
        /** @type {import("pgmmv-types/lib/agtk/plugins/plugin/parameter").AgtkParameter|import("pgmmv-types/lib/agtk/plugins/plugin").AgtkParameterValue} */
        p;

      for (; i < len; ++i) {
        p = defaults[i];
        normalized[p.id] = p.type === 'Json' ? JSON.stringify(p.defaultValue) : p.defaultValue;
      }

      len = paramValue.length;

      for (i = 0; i < len; ++i) {
        p = paramValue[i];
        normalized[p.id] = p.value;
      }

      return normalized;
    },
    /**
     * @param switchVariableObjectId {
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['ProjectCommon'] |
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['SelfObject'] |
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['ParentObject']
     * }
     * @param instanceId {number}
     * @returns {
     *   import("pgmmv-types/lib/agtk/object-instances/object-instance").AgtkObjectInstance |
     *   import("pgmmv-types/lib/agtk/constants/switch-variable-objects").AgtkSwitchVariableObjects['ProjectCommon'] |
     *   import("pgmmv-types/lib/agtk/constants/action-commands").AgtkActionCommands['UnsetObject']
     * }
     */
    resolveSwitchVariableObject = function (switchVariableObjectId, instanceId) {
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
