import {
  getCurrentInstance,
  mustBeUnisonComponent,
  usePlugin,
} from '@unisonjs/core';
import { NOOP } from '@vue/shared';
import { HookManager } from './hook-manager';
import type { ReactHook, TrackingConfigInput } from './tracking-types';

function getHookManager() {
  mustBeUnisonComponent();

  const instance = getCurrentInstance();

  const hookManager = instance?.getPlugin(HookManager);
  if (!hookManager) {
    if (__DEV__) {
      throw new Error('HookManager not found');
    } else {
      return;
    }
  }

  return hookManager;
}

export interface UnisonHookOptions {
  paths?: any | ((...args: any[]) => any);
  shallow?: boolean;
}


export interface UnisonHookOptions {
  tracking?: TrackingConfigInput;
}

usePlugin(HookManager);

export { t } from "./tracking-types";
export function toUnisonHook<T extends ReactHook>(
  hook: T,
  options: UnisonHookOptions = {},
  hookManager = getHookManager(),
) {
  return (...params: any[]) => {
    mustBeUnisonComponent();

    if (!hookManager) return NOOP;

    const hookIndex = hookManager.registerHook({
      hook,
      params,
      tracking: options.tracking,
    });

    const result = hookManager.processHookAt(hookIndex);

    return result;
  };
}
