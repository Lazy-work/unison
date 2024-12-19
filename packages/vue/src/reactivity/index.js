export {
  effect,
  stop,
  enableTracking,
  pauseTracking,
  resetTracking,
  onEffectCleanup,
  ReactiveEffect,
  EffectFlags,
  trigger,
  track,
  ITERATE_KEY,
  ARRAY_ITERATE_KEY,
  MAP_KEY_ITERATE_KEY,
  effectScope,
  EffectScope,
  getCurrentScope,
  onScopeDispose,
} from '@briddge/core';

export { ref, shallowRef, isRef, toRef, toValue, toRefs, unref, proxyRefs, customRef, triggerRef } from './ref.js';
export {
  reactive,
  readonly,
  isReactive,
  isReadonly,
  isShallow,
  isProxy,
  shallowReactive,
  shallowReadonly,
  markRaw,
  toRaw,
  toReactive,
  toReadonly,
} from './reactive.js';
export { computed } from './computed.js';
export { reactiveReadArray, shallowReadArray } from './arrayInstrumentations.js';
export { TrackOpTypes, TriggerOpTypes, ReactiveFlags } from './constants.js';
export { watch, getCurrentWatcher, traverse, onWatcherCleanup, WatchErrorCodes } from './watch.js';
