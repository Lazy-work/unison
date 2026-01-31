import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, isRef, isReactive, nextTick, watchEffect, isShallow, shallowRef } from '../../../src';

import { toUnisonHook as toUnisonHookImpl } from '../../../src/hook-manager';
import { HookManager } from '../../../src/hook-manager/hook-manager';
import { t } from '../../../src/hook-manager/tracking-types';

describe('t.shallowObject()', () => {
  let hookManager: HookManager;
  let toUnisonHook: typeof toUnisonHookImpl;

  beforeEach(() => {
    hookManager = new HookManager();
    toUnisonHook = (hook, options) => toUnisonHookImpl(hook, options, hookManager);
    vi.clearAllMocks();
  });

  it('should make object shallow reactive', () => {
    const mockHook = vi.fn(() => ({ name: 'Alice', age: 30 }));
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowObject() });

    const result = useTestHook();

    expect(isReactive(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(result.name).toBe('Alice');
  });

  it('should enforce object type on valid object', () => {
    const mockHook = vi.fn(() => ({
      user: { name: 'Alice' },
      count: 42,
    }));
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowObject() });

    const result = useTestHook();

    expect(isReactive(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(isReactive(result.user)).toBe(false);
  });

  it('should trigger effect on top-level property change', async () => {
    const source = shallowRef({ count: 1, name: 'Alice' });
    const mockHook = vi.fn((obj) => obj);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowObject() });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result.count;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    source.value = { count: 2, name: 'Alice' };
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(2);
  });

  it('should NOT trigger effect on nested property change', async () => {
    const source = shallowRef({
      user: { name: 'Alice' },
    });
    const mockHook = vi.fn((obj) => obj);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowObject() });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result.user.name;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    // Change nested property value (but user reference is same)
    const sameUser = source.value.user;
    source.value.user = sameUser;
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(1); // Should NOT retrigger
  });

  it('should trigger effect when replacing nested object reference', async () => {
    const source = shallowRef({
      user: { name: 'Alice' },
    });
    const mockHook = vi.fn((obj) => obj);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowObject() });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result.user; // Track the user reference
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    // Replace entire user object (different reference)
    source.value = {
      user: { name: 'Bob' },
    };
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(2);
  });

  it('should work on function (functions are objects)', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fn = () => 'test';
    fn.customProp = 'value';
    const mockHook = vi.fn(() => fn);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowObject() });

    const result = useTestHook();

    expect(consoleSpy).not.toHaveBeenCalled();
    expect(isReactive(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(result.customProp).toBe('value');

    consoleSpy.mockRestore();
  });

  it('should fallback to shallowRef on primitive with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockHook = vi.fn(() => 42);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowObject() });

    const result = useTestHook();

    expect(consoleSpy).toHaveBeenCalled();
    expect(isRef(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(result.value).toBe(42);

    consoleSpy.mockRestore();
  });

  it('should fallback to shallowRef on array with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockHook = vi.fn(() => [1, 2, 3]);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowObject() });

    const result = useTestHook();

    expect(consoleSpy).toHaveBeenCalled();
    expect(isRef(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(result.value).toEqual([1, 2, 3]);

    consoleSpy.mockRestore();
  });

  it('should fallback to shallowRef on null with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockHook = vi.fn(() => null);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowObject() });

    const result = useTestHook();

    expect(consoleSpy).toHaveBeenCalled();
    expect(isRef(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(result.value).toBe(null);

    consoleSpy.mockRestore();
  });

  it('should verify fallback structure is correct', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockHook = vi.fn(() => 'string');
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowObject() });

    const result = useTestHook();

    expect(consoleSpy).toHaveBeenCalled();
    expect(isRef(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(typeof result.value).toBe('string');

    consoleSpy.mockRestore();
  });

  it('should track top-level function property changes', async () => {
    const fn1 = () => 'v1';
    fn1.version = 1;
    fn1.config = { setting: 'a' };

    const fn2 = () => 'v2';
    fn2.version = 2;
    fn2.config = { setting: 'b' };

    const source = shallowRef(fn1);
    const mockHook = vi.fn((f) => f);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowObject() });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result.version;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);
    expect(result.version).toBe(1);

    source.value = fn2;
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(2);
    expect(result.version).toBe(2);
  });

  it('should NOT track nested property changes in function properties', async () => {
    const fn = () => 'test';
    fn.config = { setting: 'a', nested: { deep: 'value' } };

    const source = shallowRef(fn);
    const mockHook = vi.fn((f) => f);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowObject() });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result.config.nested.deep;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    // Mutate deep property but keep same config reference
    const sameConfig = fn.config;
    sameConfig.nested.deep = 'changed';
    source.value = fn; // Same function, same config ref
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(1); // Should NOT retrigger (shallow)
  });

  it('should trigger when function property object reference changes', async () => {
    const fn = () => 'test';
    fn.config = { setting: 'a' };

    const source = shallowRef(fn);
    const mockHook = vi.fn((f) => f);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowObject() });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result.config; // Track config reference
      effectRuns++;
    });

    expect(effectRuns).toBe(1);
    expect(result.config.setting).toBe('a');

    // Replace config with new object
    const fn2 = () => 'test';
    fn2.config = { setting: 'b' };
    source.value = fn2;
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(2);
    expect(result.config.setting).toBe('b');
  });

  it('should allow function to be called', () => {
    const fn = vi.fn(() => 'test result');
    fn.metadata = { name: 'testFn' };

    const mockHook = vi.fn(() => fn);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowObject() });

    const result = useTestHook();

    expect(isReactive(result)).toBe(true);
    expect(isShallow(result)).toBe(true);

    // Function should still be callable
    expect(typeof result).toBe('function');
    expect(result()).toBe('test result');
    expect(fn).toHaveBeenCalledTimes(1);

    // Properties should be accessible
    expect(result.metadata.name).toBe('testFn');
  });

  it('should track multiple function properties independently', async () => {
    const fn = () => 'test';
    fn.prop1 = 'a';
    fn.prop2 = 'x';

    const source = shallowRef(fn);
    const mockHook = vi.fn((f) => f);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowObject() });

    const result = useTestHook(source);

    let prop1Runs = 0;
    let prop2Runs = 0;

    watchEffect(() => {
      result.prop1;
      prop1Runs++;
    });

    watchEffect(() => {
      result.prop2;
      prop2Runs++;
    });

    // Change only prop1
    const fn2 = () => 'test';
    fn2.prop1 = 'b';
    fn2.prop2 = 'x';

    source.value = fn2;
    hookManager.processHookAt(0);
    await nextTick();

    expect(prop1Runs).toBe(2);
    expect(prop2Runs).toBe(1); // Should not retrigger

    // Change only prop2
    const fn3 = () => 'test';
    fn3.prop1 = 'b';
    fn3.prop2 = 'y';
    source.value = fn3;
    hookManager.processHookAt(0);
    await nextTick();

    expect(prop1Runs).toBe(2); // Should not retrigger
    expect(prop2Runs).toBe(2);
  });

  it('should handle function with array property shallowly', async () => {
    const fn = () => 'test';
    fn.items = [{ id: 1 }, { id: 2 }];

    const source = ref(fn);
    const mockHook = vi.fn((f) => f);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowObject() });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result.items[0].id; // Access deep in array
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    // Mutate array item deeply but keep same array reference
    const sameItems = fn.items;
    sameItems[0].id = 10;
    source.value = fn;
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(1); // Should NOT retrigger (shallow)
  });

  it('should trigger when function array property reference changes', async () => {
    const fn = () => 'test';
    fn.items = [{ id: 1 }, { id: 2 }];

    const source = ref(fn);
    const mockHook = vi.fn((f) => f);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowObject() });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result.items; // Track items reference
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    // Replace with new array
    const fn2 = () => 'test';
    fn2.items = [{ id: 3 }, { id: 4 }];
    source.value = fn2;
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(2);
  });

  it('should preserve function identity across updates', async () => {
    const fn = () => 'test';
    fn.count = 0;

    const source = ref(fn);
    const mockHook = vi.fn((f) => f);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowObject() });

    const result = useTestHook(source);

    const initialRef = result;
    expect(typeof result).toBe('function');

    // Update property
    fn.count = 1;
    source.value = fn;
    hookManager.processHookAt(0);
    await nextTick();

    // Should still be the same reactive proxy
    expect(result).toBe(initialRef);
    expect(result.count).toBe(1);
  });
});
