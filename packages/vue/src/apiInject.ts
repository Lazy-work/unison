import { type BridgePlugin, type ComponentInternalInstance, getCurrentInstance } from '@bridge/core';
import { isFunction } from '@vue/shared';
import { warn } from '@vue-internals/reactivity/warning';
import { AppContext, createAppContext, currentApp, currentAppContext } from './apiCreateApp';

type Data = Record<string, unknown>

const emptyAppContext = createAppContext();

function getAppContext(instance: ComponentInternalInstance) {
  return instance.getPlugin(InjectionPlugin)?.appContext;
}
export class InjectionPlugin implements BridgePlugin {
  provides: Data = {};
  appContext: AppContext = emptyAppContext;
  onInstanceCreated(instance: ComponentInternalInstance): void {
    if (!instance.parent) {
      this.appContext = currentAppContext || emptyAppContext
      this.provides = this.appContext.provides;
    } else {
      this.appContext = instance.parent && getAppContext(instance.parent) || emptyAppContext;
      this.provides = getProvides(instance.parent)!;
    }
  }
  onInstanceDisposed(instance: ComponentInternalInstance): void { }
}
interface InjectionConstraint<T> { }

export type InjectionKey<T> = symbol & InjectionConstraint<T>;

export function provide<T, K = InjectionKey<T> | string | number>(
  key: K,
  value: K extends InjectionKey<infer V> ? V : T,
): void {
  const currentInstance = getCurrentInstance();
  const injectionPlugin = currentInstance?.getPlugin(InjectionPlugin);
  if (!injectionPlugin) {
    if (__DEV__) {
      warn(`provide() can only be used inside setup().`);
    }
  } else {
    let provides = injectionPlugin.provides;
    // by default an instance inherits its parent's provides object
    // but when it needs to provide values of its own, it creates its
    // own provides object using parent provides object as prototype.
    // this way in `inject` we can simply look up injections from direct
    // parent and let the prototype chain do the work.
    const parentProvides = currentInstance!.parent && currentInstance!.parent.getPlugin(InjectionPlugin)?.provides;
    if (parentProvides === provides) {
      provides = injectionPlugin.provides = Object.create(parentProvides);
    }
    // TS doesn't allow symbol as index type
    provides[key as string] = value;
  }
}

function getProvides(instance: ComponentInternalInstance) {
  return instance.getPlugin(InjectionPlugin)?.provides;
}

export function inject<T>(key: InjectionKey<T> | string): T | undefined;
export function inject<T>(key: InjectionKey<T> | string, defaultValue: T, treatDefaultAsFactory?: false): T;
export function inject<T>(key: InjectionKey<T> | string, defaultValue: T | (() => T), treatDefaultAsFactory: true): T;

export function inject(key: InjectionKey<any> | string, defaultValue?: unknown, treatDefaultAsFactory = false) {
  const currentInstance = getCurrentInstance();
  // fallback to `currentRenderingInstance` so that this can be called in
  // a functional component
  const instance = currentInstance;

  // also support looking up from app-level provides w/ `app.runWithContext()`
  if (instance || currentApp) {
    // #2400
    // to support `app.use` plugins,
    // fallback to appContext's `provides` if the instance is at root
    // #11488, in a nested createApp, prioritize using the provides from currentApp

    // const provides = currentApp
    //   ? currentApp._context.provides
    //   : instance
    //     ? instance.parent != null
    //       ? instance.parent.getPlugin(InjectionPlugin)?.provides
    //       : undefined
    //     : undefined;
    const provides = currentApp
      ? currentApp._context.provides
      : instance
        ? instance.parent == null
          ? getAppContext(instance)!.provides
          : getProvides(instance.parent)
        : undefined

    if (provides && (key as string | symbol) in provides) {
      // TS doesn't allow symbol as index type
      return provides[key as string];
    } else if (arguments.length > 1) {
      return treatDefaultAsFactory && isFunction(defaultValue)
        ? defaultValue.call(instance && {})
        : defaultValue;
    } else if (__DEV__) {
      warn(`injection "${String(key)}" not found.`);
    }
  } else if (__DEV__) {
    warn(`inject() can only be used inside setup() or functional components.`);
  }
}

/**
 * Returns true if `inject()` can be used without warning about being called in the wrong place (e.g. outside of
 * setup()). This is used by libraries that want to use `inject()` internally without triggering a warning to the end
 * user. One example is `useRoute()` in `vue-router`.
 */
export function hasInjectionContext(): boolean {
  const currentInstance = getCurrentInstance();
  const injectionPlugin = currentInstance?.getPlugin(InjectionPlugin);
  return !!(injectionPlugin || currentApp)
}
