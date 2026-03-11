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
            return [];
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

        Agtk.log('Initialize ' + plugin.getInfo('name'));
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
      ) {}
    },
    /**
     * @returns {boolean}
     */
    isEditor = function () {
      return !Agtk || typeof Agtk.log !== 'function';
    };

  return plugin;
})();
