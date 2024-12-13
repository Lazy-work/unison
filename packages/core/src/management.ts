import React, { useEffect, useState } from 'react';
import Context from './context';
import { setCurrentInstance } from './index';

import type { BridgePluginClass } from './plugins';
import type { ShallowReactive } from '#vue-internals/reactivity/index';

const pluginsList = new Set<BridgePluginClass>();

/**
 * 
 * @param pluginClass 
 * @param options
 */
export function usePlugin<T extends BridgePluginClass, O extends object>(pluginClass: T, options?: O) {
  pluginClass.options = options;
  pluginsList.add(pluginClass);
}

function initInstance() {
  const instance = new Context();
  for (const Plugin of pluginsList) {
    const plugin = new (Plugin as any)();
    instance.setPlugin(Plugin, plugin);
    plugin.onInstanceCreated(instance);
  }
  return instance;
}

type AnyFunction = (...args: any[]) => any
export function createReactHook<T extends AnyFunction>(bridgeHook: T) {
  return (...args: Parameters<T>) => {
    if (isReactComponent() && !getCurrentInstance()) {
      const instance = useMemo(initInstance, deps);
      const unset = setCurrentInstance(instance);
      instance.init();
      instance.setupState();

      if (!instance.isExecuted()) {
        instance.children = bridgeHook(...args);
      }

      instance.runEffects();
      useEffect(unset);
      instance.executed();
      return instance.children;
    } else {
      return bridgeHook(...args);
    }
  };
}

export type SetupComponent<T extends Record<string, any>> = (props: ShallowReactive<T>) => () => React.ReactNode;

/**
 * @param fn - bridge component setup
 * @param name - component name
 */
export function $bridge<T extends Record<string, any>>(fn: SetupComponent<T>, name?: string) {
  const component = (props: T) => {
    const [instance] = useState(initInstance);
    const unset = setCurrentInstance(instance);
    instance.init();
    instance.setupState();
    const trackedProps = instance.trackProps(props);

    if (!instance.isExecuted() || instance.isFastRefresh()) {
      instance.children = fn(trackedProps);
      instance.invalidateChildren();
    }

    instance.runEffects();
    useEffect(unset);
    return instance.render();
  };

  if (name) {
    Object.defineProperty(component, 'name', {
      value: name,
    });
  }
  
  return component;
}
