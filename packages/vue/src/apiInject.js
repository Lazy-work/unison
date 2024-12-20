/** @import { BridgePlugin, ComponentInternalInstance } from '@briddge/core' */
/** @import { AppContext, InjectionKey } from './types.js' */
import { getCurrentInstance } from '@briddge/core';
import { isFunction } from '@vue/shared';
import { warn } from './reactivity/warning.js';
import { createAppContext, currentApp, currentAppContext } from './apiCreateApp.js';

/**
 * @typedef {Record<string, unknown>} Data
 * Represents a key-value pair object for injection data.
 */

/**
 * @type {AppContext}
 * A constant representing an empty application context.
 */
const emptyAppContext = createAppContext();

/**
 * Retrieves the application context associated with a component instance.
 * @param {ComponentInternalInstance} instance - The component instance.
 * @returns {AppContext | undefined} The application context if available.
 */
function getAppContext(instance) {
  return instance.getPlugin(InjectionPlugin)?.appContext;
}

/**
 * @implements {BridgePlugin}
 * A plugin for managing dependency injection in components.
 */
export class InjectionPlugin {
  /**
   * @type {Data}
   */
  provides = {};

  /**
   * @type {AppContext}
   */
  appContext = emptyAppContext;

  /**
   * Hook triggered when a component instance is created.
   * @param {ComponentInternalInstance} instance - The component instance being created.
   */
  onInstanceCreated(instance) {
    if (!instance.parent) {
      this.appContext = currentAppContext || emptyAppContext;
      this.provides = this.appContext.provides;
    } else {
      this.appContext = instance.parent && getAppContext(instance.parent) || emptyAppContext;
      this.provides = getProvides(instance.parent) || {};
    }
  }

  /**
   * Hook triggered when a component instance is disposed.
   * @param {ComponentInternalInstance} instance - The component instance being disposed.
   */
  onInstanceDisposed() {}
}

/**
 * Provides a value associated with a key for dependency injection.
 * @template T, K
 * @param {K} key - The key to associate with the value.
 * @param {K extends InjectionKey<infer V> ? V : T} value - The value to provide.
 */
export function provide(key, value) {
  const currentInstance = getCurrentInstance();
  const injectionPlugin = currentInstance?.getPlugin(InjectionPlugin);
  if (!injectionPlugin) {
    if (!!(process.env.NODE_ENV !== 'production')) {
      warn(`provide() can only be used inside setup().`);
    }
  } else {
    let provides = injectionPlugin.provides;
    const parentProvides = currentInstance.parent?.getPlugin(InjectionPlugin)?.provides;
    if (parentProvides === provides) {
      provides = injectionPlugin.provides = Object.create(parentProvides);
    }
    provides[key] = value;
  }
}

/**
 * Retrieves the provides object of a component instance.
 * @param {ComponentInternalInstance} instance - The component instance.
 * @returns {Data | undefined} The provides object.
 */
function getProvides(instance) {
  return instance.getPlugin(InjectionPlugin)?.provides;
}

/**
 * Injects a value associated with a key, with optional default handling.
 * @template T
 * @param {InjectionKey<T> | string} key - The key to inject.
 * @param {T} [defaultValue] - The default value if the injection is not found.
 * @param {boolean} [treatDefaultAsFactory=false] - Whether the default value should be treated as a factory function.
 * @returns {T | undefined} The injected value or default value.
 */
export function inject(key, defaultValue, treatDefaultAsFactory = false) {
  const currentInstance = getCurrentInstance();
  const instance = currentInstance;

  const provides = currentApp
    ? currentApp._context.provides
    : instance
      ? instance.parent == null
        ? getAppContext(instance)?.provides
        : getProvides(instance.parent)
      : undefined;

  if (provides && (key in provides)) {
    return provides[key];
  } else if (arguments.length > 1) {
    return treatDefaultAsFactory && isFunction(defaultValue)
      ? defaultValue.call(instance && {})
      : defaultValue;
  } else if (!!(process.env.NODE_ENV !== 'production')) {
    warn(`injection "${String(key)}" not found.`);
  }
}

/**
 * Checks if `inject()` can be used without warning about being called in the wrong place.
 * @returns {boolean} True if injection is valid, otherwise false.
 */
export function hasInjectionContext() {
  const currentInstance = getCurrentInstance();
  const injectionPlugin = currentInstance?.getPlugin(InjectionPlugin);
  return !!(injectionPlugin || currentApp);
}
