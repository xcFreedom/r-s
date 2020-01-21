/**
 * 注册插件以便它们可以提取和分派事件。
 *
 * @see {EventPluginHub}
 */

/**
 * 注入插件的顺序列表。
 */
export const plugins = [];

/**
 * 从事件名称到调度配置的映射
 */
export const eventNameDispatchConfigs = {};

/**
 * 从注册名到插件模块的映射
 */
export const registrationNameModules = {};

/**
 * 从注册名到事件名的映射
 */
export const registrationNameDependencies = {};

/**
 * Mapping from lowercase registration names to the properly cased version,
 * used to warn in the case of missing event handlers. Available
 * only in __DEV__.
 * @type {Object}
 */
export const possibleRegistrationNames = null;