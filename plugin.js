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

        // TODO
        window.kt.snapToTile = {
          snapToTile: undefined,
          snapToTileHorizontal: undefined,
          snapToTileVertical: undefined
        };
      },
      finalize: function () {},
      setParamValue: function () {},
      setInternal: function () {},
      call: function () {},
      execActionCommand: function (
        actionCommandIndex,
        parameter,
        objectId,
        instanceId,
        actionId,
        commandId,
        commonActionStatus,
        sceneId
      ) {
        /** @type {import("pgmmv-types/lib/agtk/plugins/plugin").AgtkActionCommand} */
        var actionCommand = plugin.getInfo('actionCommand')[actionCommandIndex],
          /** @type {Record<number,import("type-fest").JsonValue>} */
          np = normalizeParameters(parameter, actionCommand.parameter);

        switch (actionCommand.id) {
          case snapToTileActionCommand.id:
          case snapToTileHorizontalActionCommand.id:
          case snapToTileVerticalActionCommand.id:
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
