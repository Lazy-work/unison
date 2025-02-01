import React, { useEffect, useState } from 'react';
import Context, { isFastRefresh } from './context';
import { setCurrentInstance } from './index';

import type { UnisonPluginClass } from './plugins';
import type { ShallowReactive } from '#vue-internals/reactivity/index';

const pluginsList = new Set<UnisonPluginClass>();

/**
 *
 * @param pluginClass
 * @param options
 */
export function usePlugin<T extends UnisonPluginClass, O extends object>(pluginClass: T, options?: O) {
  pluginClass.options = options;
  pluginsList.add(pluginClass);
}

export function initInstance() {
  const instance = new Context();
  for (const Plugin of pluginsList) {
    const plugin = new (Plugin as any)();
    instance.setPlugin(Plugin, plugin);
    plugin.onInstanceCreated(instance);
  }
  return instance;
}

type AnyFunction = (...args: any[]) => any;
export function createReactHook<T extends AnyFunction>(unisonHook: T) {
  return <P extends Parameters<T>>(...args: P): ReturnType<T> => {
    const [result] = useState(() => unisonHook(...args));
    return result;
  };
}

export type SetupComponent<T extends Record<string, any>> = (props: ShallowReactive<T>) => () => React.ReactNode;

/**
 * @param fn - unison component setup
 * @param name - component name
 */
export function $unison<T extends Record<string, any>>(fn: SetupComponent<T>, name?: string) {
  if (!isFastRefresh() && typeof window !== "undefined") {
    window.__UNISON_REFRESH__ = { root: null };
  }
  const component = React.forwardRef<T['ref'], T>((props, ref) => {
    const [instance] = useState(initInstance);
    const unset = setCurrentInstance(instance);
    instance.init();
    instance.setupState();
    const trackedProps = instance.trackProps({ ...props, ref });

    if (isFastRefresh() && instance.plugins) {
      for (const plugin of instance.plugins.values()) plugin.onInstanceFastRefresh?.(instance);
    }

    if (!instance.isExecuted() || isFastRefresh()) {
      instance.children = fn(trackedProps as any);
      instance.invalidateChildren();
    }

    instance.runEffects();
    useEffect(unset);
    const result = instance.render();

    if (isFastRefresh() && window.__UNISON_REFRESH__.root === instance) {
      window.__UNISON_REFRESH__ = undefined;
    }

    return result;
  });
  if (name) {
    Object.defineProperty(component, 'name', {
      value: name,
    });
  }
  return component;
}
