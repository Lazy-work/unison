import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, isRef, isReactive, nextTick, watchEffect, isShallow, shallowRef } from '../../../src';

import { toUnisonHook as toUnisonHookImpl, t } from '../../../src/hook-manager';
import { HookManager } from '../../../src/hook-manager/hook-manager';
describe('t.object()', () => {
  let hookManager: HookManager;
  let toUnisonHook: typeof toUnisonHookImpl;

  beforeEach(() => {
    hookManager = new HookManager();
    toUnisonHook = (hook, options) => toUnisonHookImpl(hook, options, hookManager);
    vi.clearAllMocks();
  });

  it('should make object deeply reactive', () => {
    const mockHook = vi.fn(() => ({ name: 'Alice', age: 30 }));
    const useTestHook = toUnisonHook(mockHook, { tracking: t.object() });

    const result = useTestHook();

    expect(isReactive(result)).toBe(true);
    expect(isShallow(result)).toBe(false);
    expect(result.name).toBe('Alice');
  });

  it('should enforce object type on valid object', () => {
    const mockHook = vi.fn(() => ({
      user: { name: 'Alice' },
      count: 42,
    }));
    const useTestHook = toUnisonHook(mockHook, { tracking: t.object() });

    const result = useTestHook();

    expect(isReactive(result)).toBe(true);
    expect(isReactive(result.user)).toBe(true);
  });

  // REMOVED: Invalid .track() test that just accessed result
  // .track() would need custom implementation to track object reference itself

  it('should NOT track reference changes without .track()', async () => {
    const source = ref({ name: 'Alice' });
    const mockHook = vi.fn((obj) => obj);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.object() });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result.name; // Access property, not reference
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    // Same data, different reference
    source.value = { name: 'Alice' };
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(1); // Should NOT retrigger
  });

  it('should work on function (functions are objects)', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fn = () => 'test';
    fn.customProp = 'value';
    const mockHook = vi.fn(() => fn);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.object() });

    const result = useTestHook();

    expect(consoleSpy).not.toHaveBeenCalled();
    expect(isReactive(result)).toBe(true);
    expect(result.customProp).toBe('value');

    consoleSpy.mockRestore();
  });

  it('should track top-level function property changes deeply', async () => {
    const fn1 = () => 'v1';
    fn1.version = 1;
    fn1.config = { setting: 'a', nested: { deep: 'value1' } };

    const fn2 = () => 'v2';
    fn2.version = 2;
    fn2.config = { setting: 'b', nested: { deep: 'value2' } };

    const source = shallowRef(fn1);
    const mockHook = vi.fn((f) => f);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.object() });

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

  it('should track deeply nested property changes in function properties', async () => {
    const fn = () => 'test';
    fn.config = { setting: 'a', nested: { deep: 'value1' } };

    const source = shallowRef(fn);
    const mockHook = vi.fn((f) => f);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.object() });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result.config.nested.deep; // Access deeply nested property
      effectRuns++;
    });

    expect(effectRuns).toBe(1);
    expect(result.config.nested.deep).toBe('value1');

    // Change deep property
    const fn2 = () => 'test';
    fn2.config = { setting: 'a', nested: { deep: 'value2' } };
    source.value = fn2;
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(2);
    expect(result.config.nested.deep).toBe('value2');
  });

  it('should track nested object property changes', async () => {
    const fn = () => 'test';
    fn.metadata = { author: 'Alice', tags: { primary: 'test' } };

    const source = shallowRef(fn);
    const mockHook = vi.fn((f) => f);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.object() });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result.metadata.tags.primary;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);
    expect(result.metadata.tags.primary).toBe('test');

    // Change nested property
    const fn2 = () => 'test';
    fn2.metadata = { author: 'Alice', tags: { primary: 'updated' } };
    source.value = fn2;
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(2);
    expect(result.metadata.tags.primary).toBe('updated');
  });

  it('should allow function to be called with deep reactive properties', () => {
    const fn = vi.fn(() => 'test result');
    fn.metadata = {
      name: 'testFn',
      config: {
        options: {
          verbose: true,
        },
      },
    };

    const mockHook = vi.fn(() => fn);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.object() });

    const result = useTestHook();

    expect(isReactive(result)).toBe(true);
    expect(isShallow(result)).toBe(false);

    // Function should still be callable
    expect(typeof result).toBe('function');
    expect(result()).toBe('test result');
    expect(fn).toHaveBeenCalledTimes(1);

    // Nested properties should be reactive
    expect(isReactive(result.metadata)).toBe(true);
    expect(isReactive(result.metadata.config)).toBe(true);
    expect(result.metadata.config.options.verbose).toBe(true);
  });

  it('should track multiple nested function properties independently', async () => {
    const fn = () => 'test';
    fn.settings = { theme: 'dark', layout: { mode: 'grid' } };
    fn.user = { name: 'Alice', preferences: { lang: 'en' } };

    const source = shallowRef(fn);
    const mockHook = vi.fn((f) => f);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.object() });

    const result = useTestHook(source);

    let settingsRuns = 0;
    let userRuns = 0;

    watchEffect(() => {
      result.settings.layout.mode;
      settingsRuns++;
    });

    watchEffect(() => {
      result.user.preferences.lang;
      userRuns++;
    });

    expect(settingsRuns).toBe(1);
    expect(userRuns).toBe(1);

    // Change only settings
    const fn2 = () => 'test';
    fn2.settings = { theme: 'dark', layout: { mode: 'list' } };
    fn2.user = { name: 'Alice', preferences: { lang: 'en' } };
    source.value = fn2;
    hookManager.processHookAt(0);
    await nextTick();

    expect(settingsRuns).toBe(2);
    expect(userRuns).toBe(1); // Should not retrigger

    // Change only user
    const fn3 = () => 'test';
    fn3.settings = { theme: 'dark', layout: { mode: 'list' } };
    fn3.user = { name: 'Alice', preferences: { lang: 'fr' } };
    source.value = fn3;
    hookManager.processHookAt(0);
    await nextTick();

    expect(settingsRuns).toBe(2); // Should not retrigger
    expect(userRuns).toBe(2);
  });

  it('should handle function with deeply nested array property', async () => {
    const fn = () => 'test';
    fn.data = {
      items: [
        { id: 1, nested: { value: 'a' } },
        { id: 2, nested: { value: 'b' } },
      ],
    };

    const source = ref(fn);
    const mockHook = vi.fn((f) => f);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.object() });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result.data.items[0].nested.value;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);
    expect(result.data.items[0].nested.value).toBe('a');

    // Change nested array item
    const fn2 = () => 'test';
    fn2.data = {
      items: [
        { id: 1, nested: { value: 'changed' } },
        { id: 2, nested: { value: 'b' } },
      ],
    };
    source.value = fn2;
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(2);
    expect(result.data.items[0].nested.value).toBe('changed');
  });

  it('should maintain deep reactivity across nested objects', async () => {
    const fn = () => 'test';
    fn.complex = {
      level1: {
        level2: {
          level3: {
            value: 'deep',
          },
        },
      },
    };

    const source = shallowRef(fn);
    const mockHook = vi.fn((f) => f);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.object() });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result.complex.level1.level2.level3.value;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);
    expect(result.complex.level1.level2.level3.value).toBe('deep');

    // All nested levels should be reactive
    expect(isReactive(result.complex)).toBe(true);
    expect(isReactive(result.complex.level1)).toBe(true);
    expect(isReactive(result.complex.level1.level2)).toBe(true);
    expect(isReactive(result.complex.level1.level2.level3)).toBe(true);

    // Change deeply nested value
    const fn2 = () => 'test';
    fn2.complex = {
      level1: {
        level2: {
          level3: {
            value: 'updated',
          },
        },
      },
    };
    source.value = fn2;
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(2);
    expect(result.complex.level1.level2.level3.value).toBe('updated');
  });

  it('should preserve function identity across updates with deep changes', async () => {
    const fn = () => 'test';
    fn.state = { count: 0, meta: { timestamp: 100 } };

    const source = ref(fn);
    const mockHook = vi.fn((f) => f);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.object() });

    const result = useTestHook(source);

    const initialRef = result;
    expect(typeof result).toBe('function');
    expect(result.state.count).toBe(0);

    // Update nested property
    fn.state = { count: 1, meta: { timestamp: 200 } };
    source.value = fn;
    hookManager.processHookAt(0);
    await nextTick();

    // Should still be the same reactive proxy
    expect(result).toBe(initialRef);
    expect(result.state.count).toBe(1);
    expect(result.state.meta.timestamp).toBe(200);
  });

  it('should track array mutations in function properties deeply', async () => {
    const fn = () => 'test';
    fn.list = {
      items: [1, 2, 3],
    };

    const source = shallowRef(fn);
    const mockHook = vi.fn((f) => f);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.object() });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result.list.items.length;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);
    expect(result.list.items.length).toBe(3);

    // Change array length
    const fn2 = () => 'test';
    fn2.list = { items: [1, 2, 3, 4, 5] };
    source.value = fn2;
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(2);
    expect(result.list.items.length).toBe(5);
  });

  it('should handle mixed deep structures in function properties', async () => {
    const fn = () => 'test';
    fn.data = {
      primitive: 42,
      nested: {
        array: [{ id: 1 }, { id: 2 }],
        object: { key: 'value' },
      },
    };

    const source = shallowRef(fn);
    const mockHook = vi.fn((f) => f);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.object() });

    const result = useTestHook(source);

    // All should be deeply reactive
    expect(isReactive(result.data)).toBe(true);
    expect(isReactive(result.data.nested)).toBe(true);
    expect(isReactive(result.data.nested.array)).toBe(true);
    expect(isReactive(result.data.nested.array[0])).toBe(true);
    expect(isReactive(result.data.nested.object)).toBe(true);

    let effectRuns = 0;
    watchEffect(() => {
      result.data.nested.array[0].id;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    const fn2 = () => 'test';
    fn2.data = {
      primitive: 42,
      nested: {
        array: [{ id: 10 }, { id: 2 }],
        object: { key: 'value' },
      },
    };
    source.value = fn2;
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(2);
  });

  it('should fallback to ref on primitive with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockHook = vi.fn(() => 42);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.object() });

    const result = useTestHook();

    expect(consoleSpy).toHaveBeenCalled();
    expect(isRef(result)).toBe(true);
    expect(result.value).toBe(42);

    consoleSpy.mockRestore();
  });

  it('should fallback to ref on array with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockHook = vi.fn(() => [1, 2, 3]);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.object() });

    const result = useTestHook();

    expect(consoleSpy).toHaveBeenCalled();
    expect(isRef(result)).toBe(true);
    expect(result.value).toEqual([1, 2, 3]);

    consoleSpy.mockRestore();
  });

  it('should fallback to ref on null with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockHook = vi.fn(() => null);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.object() });

    const result = useTestHook();

    expect(consoleSpy).toHaveBeenCalled();
    expect(isRef(result)).toBe(true);
    expect(result.value).toBe(null);

    consoleSpy.mockRestore();
  });

  it('should maintain deep reactivity', async () => {
    const source = ref({
      user: {
        profile: { name: 'Alice' },
      },
    });
    const mockHook = vi.fn((obj) => obj);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.object() });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result.user.profile.name;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    source.value = {
      user: {
        profile: { name: 'Bob' },
      },
    };
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(2);
  });

  it('should verify fallback structure is correct', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockHook = vi.fn(() => 'string');
    const useTestHook = toUnisonHook(mockHook, { tracking: t.object() });

    const result = useTestHook();

    expect(consoleSpy).toHaveBeenCalled();
    expect(isRef(result)).toBe(true);
    expect(typeof result.value).toBe('string');
    expect(result.value).toBe('string');

    consoleSpy.mockRestore();
  });
});
