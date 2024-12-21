/** @import { BridgePluginClass } from './plugins.js' */
/** @import { SetupComponent } from './types.js' */
import React, { useEffect, useState } from 'react';
import Context from './context.js';
import { setCurrentInstance } from './index.js';


const pluginsList = new Set();

/**
 * @template {BridgePluginClass} T
 * @template {object} O
 * @param {T} pluginClass
 * @param {O} [options]
 */
export function usePlugin(pluginClass, options) {
  pluginClass.options = options;
  pluginsList.add(pluginClass);
}

export function initInstance() {
  const instance = new Context();
  for (const Plugin of pluginsList) {
    const plugin = new Plugin();
    instance.setPlugin(Plugin, plugin);
    plugin.onInstanceCreated(instance);
  }
  return instance;
}

/** @typedef {(...args: any[]) => any} AnyFunction */

/**
 * @template {AnyFunction} T
 * @param {T} bridgeHook
 * @returns
 */
export function createReactHook(bridgeHook) {
/**
 * @template {Parameters<T>} P
 * @param {...P} params
 * @returns {ReturnType<T>}
 */
  return (...args) => {
    const [result] = useState(() => bridgeHook(...args));
    return result;
  };
}


/**
 * @template {Record<string, any>} T
 * @param {SetupComponent<T>} fn - bridge component setup
 * @param {string} [name] - component name
 */
export function $bridge(fn, name) {
  /** @type {React.ForwardRefExoticComponent<T>} */
  const component = React.forwardRef((props, ref) => {
    const [instance] = useState(initInstance);
    const unset = setCurrentInstance(instance);
    instance.init();
    instance.setupState();
    const trackedProps = instance.trackProps({ ...props, ref });

    if (!instance.isExecuted() || instance.isFastRefresh()) {
      instance.children = fn(trackedProps);
      instance.invalidateChildren();
    }

    instance.runEffects();
    useEffect(unset);
    return instance.render();
  });
  if (name) {
    Object.defineProperty(component, 'name', {
      value: name,
    });
  }
  return component;
}
