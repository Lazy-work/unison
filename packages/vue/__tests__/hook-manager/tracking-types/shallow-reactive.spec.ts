import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, isRef, isReactive, nextTick, watchEffect, isShallow, toRaw } from '../../../src';

import { toUnisonHook as toUnisonHookImpl } from '../../../src/hook-manager';
import { HookManager } from '../../../src/hook-manager/hook-manager';
import { t } from '../../../src/hook-manager/tracking-types';


describe('t.shallowReactive()', () => {
  let hookManager: HookManager;
  let toUnisonHook: typeof toUnisonHookImpl;

  beforeEach(() => {
    hookManager = new HookManager();
    toUnisonHook = (hook, options) => toUnisonHookImpl(hook, options, hookManager);
    vi.clearAllMocks();
  });

  it('should make object shallow reactive', () => {
    const mockHook = vi.fn(() => ({ name: 'Alice', age: 30 }));
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowReactive() });

    const result = useTestHook();

    expect(isReactive(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(result.name).toBe('Alice');
  });

  it('should make array shallow reactive', () => {
    const mockHook = vi.fn(() => [1, 2, 3]);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowReactive() });

    const result = useTestHook();

    expect(isReactive(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(result).toEqual([1, 2, 3]); // Use helper instead
  });

  it('should NOT make nested objects reactive', () => {
    const mockHook = vi.fn(() => ({
      user: { name: 'Alice' },
    }));
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowReactive() });

    const result = useTestHook();

    expect(isReactive(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(isReactive(result.user)).toBe(false);
  });

  it('should NOT make nested arrays reactive', () => {
    const mockHook = vi.fn(() => [{ items: [{ id: 1 }] }]);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowReactive() });

    const result = useTestHook();

    expect(isReactive(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(isReactive(result[0])).toBe(false);
  });

  it('should trigger effect on top-level property change', async () => {
    const source = ref({ count: 1, name: 'Alice' });
    const mockHook = vi.fn((obj) => obj);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowReactive() });

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
    const source = ref({ user: { name: 'Alice' } });
    const mockHook = vi.fn((obj) => toRaw(obj));
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowReactive() });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result.user.name;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    const sameUser = source.value.user;
    sameUser.name = 'Bob';
    source.value.user = sameUser;
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(1); // Should NOT retrigger (same user reference)
  });

  it('should trigger effect when replacing nested object reference', async () => {
    const source = ref({ user: { name: 'Alice' } });
    const mockHook = vi.fn((obj) => obj);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowReactive() });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result.user; // Track the user reference
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    source.value = { user: { name: 'Bob' } };
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(2); // Should trigger
  });

  it('should NOT trigger effect on array item mutation with same reference', async () => {
    const item1 = { id: 1 };
    const item2 = { id: 2 };
    const source = ref([item1, item2]);
    const mockHook = vi.fn((arr) => arr);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowReactive() });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result[0].id;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    // Mutate item but keep same reference
    item1.id = 10;
    source.value = [item1, item2];
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(1); // Should NOT retrigger (same item reference)
  });

  it('should trigger effect on array length change', async () => {
    const source = ref([1, 2, 3]);
    const mockHook = vi.fn((arr) => arr);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowReactive() });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result.length;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    // Change array length via source
    source.value = [1, 2, 3, 4];
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(2);
  });

  it('should fallback to shallowRef on primitive with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockHook = vi.fn(() => 42);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowReactive() });

    const result = useTestHook();

    expect(consoleSpy).toHaveBeenCalled();
    expect(isRef(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(result.value).toBe(42);

    consoleSpy.mockRestore();
  });

  it('should fallback to shallowRef on string with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockHook = vi.fn(() => 'hello');
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowReactive() });

    const result = useTestHook();

    expect(consoleSpy).toHaveBeenCalled();
    expect(isRef(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(result.value).toBe('hello');

    consoleSpy.mockRestore();
  });

  it('should fallback to shallowRef on function with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fn = () => 'test';
    const mockHook = vi.fn(() => fn);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowReactive() });

    const result = useTestHook();

    expect(consoleSpy).toHaveBeenCalled();
    expect(isRef(result)).toBe(true);
    expect(isShallow(result)).toBe(true);

    consoleSpy.mockRestore();
  });

  it('should fallback to shallowRef on null with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockHook = vi.fn(() => null);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowReactive() });

    const result = useTestHook();

    expect(consoleSpy).toHaveBeenCalled();
    expect(isRef(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(result.value).toBe(null);

    consoleSpy.mockRestore();
  });

  it('should fallback to shallowRef on undefined with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockHook = vi.fn(() => undefined);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowReactive() });

    const result = useTestHook();

    expect(consoleSpy).toHaveBeenCalled();
    expect(isRef(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(result.value).toBe(undefined);

    consoleSpy.mockRestore();
  });

  it('should handle object with mixed value types', () => {
    const mockHook = vi.fn(() => ({
      primitive: 42,
      nested: { value: 'Alice' },
      array: [1, 2, 3],
      func: () => 'test',
    }));
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowReactive() });

    const result = useTestHook();

    expect(isReactive(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(result.primitive).toBe(42);
    expect(isReactive(result.nested)).toBe(false);
    expect(isReactive(result.array)).toBe(false);
  });
});
