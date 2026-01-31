import { isFunction, isObject } from "@vue/shared";

type TrackingType =
  | 'ref'
  | 'shallowRef'
  | 'reactive'
  | 'shallowReactive'
  | 'shallow'
  | 'toRefs'
  | 'refs'
  | 'object'
  | 'shallowObject'
  | 'function';

const TYPE = Symbol('type');
const TRACK_SELF = Symbol('track_self');
interface BaseTrackingConfig {
  [TYPE]: TrackingType;
  inner?: TrackingConfig;
  [TRACK_SELF]?: boolean;
}

 export interface TrackingConfig extends BaseTrackingConfig {
  [key: string]: TrackingConfig | TrackingType | boolean | undefined;
}

export interface NestedTrackingConfig {
  [key: string]: TrackingConfig | NestedTrackingConfig;
}

export type TrackingConfigInput =
  | TrackingConfig
  | NestedTrackingConfig
  | ((...params: any[]) => TrackingConfig | NestedTrackingConfig | undefined);

export type ReactHook = (...args: any[]) => any;

interface TrackableBuilder {
  reactive: (children?: NestedTrackingConfig) => TrackingConfig;
  shallowReactive: (children?: NestedTrackingConfig) => TrackingConfig;
  object: (children?: NestedTrackingConfig) => TrackingConfig;
  shallowObject: (children?: NestedTrackingConfig) => TrackingConfig;
}

function createTrackableBuilder(shouldTrack: boolean): TrackableBuilder {
  const createConfig = (type: TrackingType, children?: NestedTrackingConfig): TrackingConfig => {
    if (children !== undefined && __DEV__) {
      console.warn(
        `[UnisonJS] Invalid composition: ${type}() cannot contain inner tracking config. ` +
          `Inner config will be ignored.`,
      );
    }

    const config: TrackingConfig = {
      [TYPE]: type,
      ...children,
    };

    if (shouldTrack) {
      config[TRACK_SELF] = true;
    }

    return config;
  };

  return {
    reactive: (children) => createConfig('reactive', children),
    shallowReactive: (children) => createConfig('shallowReactive', children),
    object: (children) => createConfig('object', children),
    shallowObject: (children) => createConfig('shallowObject', children),
  };
}

const normalBuilder = createTrackableBuilder(false);
const trackedBuilder = createTrackableBuilder(true);

export const t = {
  ref: (inner?: TrackingConfig): TrackingConfig => ({
    [TYPE]: 'ref',
    inner,
  }),

  shallowRef: (inner?: TrackingConfig): TrackingConfig => ({
    [TYPE]: 'shallowRef',
    inner,
  }),

  shallow: (): TrackingConfig => ({
    [TYPE]: 'shallow',
  }),

  toRefs: (children?: NestedTrackingConfig): TrackingConfig => ({
    [TYPE]: 'toRefs',
    ...children,
  }),

  refs: (children?: NestedTrackingConfig): TrackingConfig => ({
    [TYPE]: 'refs',
    ...children,
  }),

  function: (): TrackingConfig => ({
    [TYPE]: 'function',
  }),

  reactive: normalBuilder.reactive,
  shallowReactive: normalBuilder.shallowReactive,
  object: normalBuilder.object,
  shallowObject: normalBuilder.shallowObject,

  track: () => trackedBuilder,
};


export type DetectedType = 'primitive' | 'object' | 'function';

export function detectType(value: any): DetectedType {
  if (isFunction(value)) return 'function';
  if (isObject(value)) return 'object';
  return 'primitive';
}

export function checkCompatibility(trackingType: TrackingType, actualType: DetectedType): boolean {
  const compatMatrix: Record<TrackingType, DetectedType[]> = {
    ref: ['primitive', 'object', 'function'],
    shallowRef: ['primitive', 'object', 'function'],
    shallow: ['primitive', 'object', 'function'],
    reactive: ['object'],
    shallowReactive: ['object'],
    toRefs: ['object', 'function'],
    refs: ['object', 'function'],
    object: ['object', 'function'],
    shallowObject: ['object', 'function'],
    function: ['function'],
  };

  return compatMatrix[trackingType]?.includes(actualType) ?? false;
}

export function getFallbackConfig(specifiedType: TrackingType, actualType: DetectedType): TrackingConfig {
  if (specifiedType === 'shallowReactive' || specifiedType === 'shallowObject') {
    return { [TYPE]: 'shallowRef' };
  }

  return { [TYPE]: 'ref' };
}

export function getDefaultTracking(actualType: DetectedType): TrackingConfig {
  switch (actualType) {
    case 'primitive':
      return { [TYPE]: 'ref' };
    case 'object':
      return { [TYPE]: 'toRefs' };
    case 'function':
      return { [TYPE]: 'function' };
    default:
      return { [TYPE]: 'ref' };
  }
}

export function getTrackingType(value?: any) {
  if (!value || !isObject(value)) return undefined;
  return Reflect.get(value, TYPE) as TrackingType;
}

export function isTrackSelf(value: any) {
  if (!value || !isObject(value)) return false;
  return !!Reflect.get(value, TRACK_SELF);
}
