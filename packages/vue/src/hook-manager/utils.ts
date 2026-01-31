type Accessor = {
  getValue: (obj: object) => any;
  setValue: (obj: object, value: any) => any;
};

type PathSegment =
  | { type: 'string'; key: string }
  | { type: 'symbol'; index: number };

const accessors = new Map<string, Accessor>();

// Symbol registry - bidirectional mapping
const symbolToIndex = new Map<symbol, number>();
const indexToSymbol = new Map<number, symbol>();
let symbolCounter = 0;

function registerSymbol(sym: symbol): number {
  let index = symbolToIndex.get(sym);
  if (index === undefined) {
    index = symbolCounter++;
    symbolToIndex.set(sym, index);
    indexToSymbol.set(index, sym);
  }
  return index;
}

export function buildPath(basePath: string, key: string | symbol): string {
  const keyPart = typeof key === 'symbol'
    ? `@@sym:${registerSymbol(key)}`
    : key;

  return basePath ? `${basePath}.${keyPart}` : keyPart;
}

function parsePathToSegments(path: string): PathSegment[] {
  if (path === '') return [];

  return path.split('.').map(segment => {
    // Check if segment starts with '@@sym:' (symbol notation)
    if (segment.startsWith('@@sym:')) {
      const indexStr = segment.slice(6); // Remove '@@sym:' prefix
      const index = parseInt(indexStr, 10);
      return { type: 'symbol', index };
    }
    return { type: 'string', key: segment };
  });
}

export function getAccessor(path: string) {
  let accessor = accessors.get(path);
  if (!accessor) {
    accessors.set(
      path,
      (accessor = {
        getValue: createGetter(path),
        setValue: createSetter(path),
      }),
    );
  }
  return accessor;
}

// Detect if unsafe-eval is allowed
let canUseUnsafeEval: boolean | undefined = undefined;
let getterCache = new Map();
let setterCache = new Map();

function detectUnsafeEval() {
  if (canUseUnsafeEval !== undefined) return canUseUnsafeEval;
  try {
    new Function('return 1')();
    canUseUnsafeEval = true;
  } catch (e) {
    canUseUnsafeEval = false;
  }
  return canUseUnsafeEval;
}

export function createGetter(path: string): Accessor['getValue'] {
  if (getterCache.has(path)) {
    return getterCache.get(path);
  }

  if (path === '') {
    return (obj) => obj;
  }

  const segments = parsePathToSegments(path);

  if (detectUnsafeEval()) {
    // Generate code that accesses symbol registry for symbol keys
    const accessors = segments.map((segment) => {
      if (segment.type === 'symbol') {
        return `?.[indexToSymbol.get(${segment.index})]`;
      } else {
        return `?.[${JSON.stringify(segment.key)}]`;
      }
    }).join('');

    const getter = new Function(
      'obj',
      'indexToSymbol',
      `return obj${accessors}`
    );

    const boundGetter = (obj: any) => getter(obj, indexToSymbol);
    getterCache.set(path, boundGetter);
    return boundGetter as Accessor['getValue'];
  } else {
    // Fallback: use actual symbols from registry
    const getter = (obj: any) => {
      let current = obj;
      for (let i = 0; i < segments.length; i++) {
        if (current == null) return undefined;

        const segment = segments[i];
        const key = segment.type === 'symbol'
          ? indexToSymbol.get(segment.index)!
          : segment.key;

        current = current[key];
      }
      return current;
    };
    getterCache.set(path, getter);
    return getter;
  }
}

export function createSetter(path: string): Accessor['setValue'] {
  if (setterCache.has(path)) {
    return setterCache.get(path);
  }

  if (path === '') {
    return (obj) => obj;
  }

  const segments = parsePathToSegments(path);

  if (detectUnsafeEval()) {
    if (segments.length === 1) {
      // Simple case: obj[key] = value
      const segment = segments[0];

      if (segment.type === 'symbol') {
        const setter = new Function(
          'obj',
          'value',
          'indexToSymbol',
          `if (obj != null) obj[indexToSymbol.get(${segment.index})] = value`
        );
        const boundSetter = (obj: object, value: any) => setter(obj, value, indexToSymbol);
        setterCache.set(path, boundSetter);
        return boundSetter;
      } else {
        const setter = new Function(
          'obj',
          'value',
          `if (obj != null) obj[${JSON.stringify(segment.key)}] = value`
        );
        setterCache.set(path, setter);
        return setter as (obj: object, value: any) => any;
      }
    } else {
      // Complex case: ensure path exists, then set
      const parentSegments = segments.slice(0, -1);
      const lastSegment = segments[segments.length - 1];

      const parentCode = parentSegments.map((segment, i) => {
        if (segment.type === 'symbol') {
          return `
            let key${i} = indexToSymbol.get(${segment.index});
            if (current[key${i}] == null) current[key${i}] = {};
            current = current[key${i}];
          `;
        } else {
          return `
            if (current[${JSON.stringify(segment.key)}] == null) current[${JSON.stringify(segment.key)}] = {};
            current = current[${JSON.stringify(segment.key)}];
          `;
        }
      }).join('\n');

      const lastKeyCode = lastSegment.type === 'symbol'
        ? `indexToSymbol.get(${lastSegment.index})`
        : JSON.stringify(lastSegment.key);

      const setter = new Function(
        'obj',
        'value',
        'indexToSymbol',
        `
          if (obj == null) return;
          let current = obj;
          ${parentCode}
          current[${lastKeyCode}] = value;
        `
      );

      const boundSetter = (obj: object, value: any) => setter(obj, value, indexToSymbol);
      setterCache.set(path, boundSetter);
      return boundSetter;
    }
  } else {
    // Loop fallback
    const setter = (obj: any, value: any) => {
      if (obj == null) return;
      let current = obj;

      // Navigate to parent, creating objects as needed
      for (let i = 0; i < segments.length - 1; i++) {
        const segment = segments[i];
        const key = segment.type === 'symbol'
          ? indexToSymbol.get(segment.index)!
          : segment.key;

        if (current[key] == null) {
          current[key] = {};
        }
        current = current[key];
      }

      // Set the final value
      const lastSegment = segments[segments.length - 1];
      const lastKey = lastSegment.type === 'symbol'
        ? indexToSymbol.get(lastSegment.index)!
        : lastSegment.key;

      current[lastKey] = value;
    };
    setterCache.set(path, setter);
    return setter;
  }
}


// ============================================================================
// Utility: Attach class instance via Proxy
// ============================================================================

const INSTANCE = Symbol('@@instance');

type ConstructorParams<T> = T extends new (...args: infer P) => any ? P : never;
type InstanceType<T> = T extends new (...args: any[]) => infer R ? R : never;

/**
 * Create a proxy that forwards to a class instance
 */
export function createProxy<TTarget extends object, TInstance>(
  target: TTarget,
  instance: TInstance
): TTarget & TInstance {
  // Store instance reference
  // (target as any)[INSTANCE] = instance;

  return new Proxy(target, {
    get(target, prop, receiver) {
      // Check if property exists on target first
      if (prop in target) {
        return Reflect.get(target, prop, receiver);
      }

      // Otherwise get from instance
      const value = (instance as any)[prop];

      // Bind methods to instance
      if (typeof value === 'function') {
        return value.bind(instance);
      }

      return value;
    },

    set(target, prop, value, receiver) {
      // If property exists on target, set it there
      if (prop in target) {
        return Reflect.set(target, prop, value, receiver);
      }

      // Otherwise set on instance
      (instance as any)[prop] = value;
      return true;
    },

    has(target, prop) {
      return prop in target || prop in (instance as any);
    },

    ownKeys(target) {
      const targetKeys = Reflect.ownKeys(target);
      const instanceKeys = Reflect.ownKeys(instance as any);
      return [...new Set([...targetKeys, ...instanceKeys])];
    },

    getOwnPropertyDescriptor(target, prop) {
      const targetDesc = Reflect.getOwnPropertyDescriptor(target, prop);
      if (targetDesc) {
        return targetDesc;
      }

      const instanceDesc = Reflect.getOwnPropertyDescriptor(instance as any, prop);
      return instanceDesc;
    }
  }) as TTarget & TInstance;
}

/**
 * Helper to get the instance from a proxied object
 */
export function getInstance<T>(obj: any): T | undefined {
  return obj[INSTANCE];
}
