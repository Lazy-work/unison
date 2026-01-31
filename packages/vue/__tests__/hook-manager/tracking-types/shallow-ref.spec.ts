import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, isRef, isReactive, nextTick, watchEffect, isShallow } from '../../../src';

import { toUnisonHook as toUnisonHookImpl } from '../../../src/hook-manager';
import { HookManager } from '../../../src/hook-manager/hook-manager';
import { t } from '../../../src/hook-manager/tracking-types';

describe('t.shallowRef()', () => {
  let hookManager: HookManager;
  let toUnisonHook: typeof toUnisonHookImpl;

  beforeEach(() => {
    hookManager = new HookManager();
    toUnisonHook = (hook, options) => toUnisonHookImpl(hook, options, hookManager);
    vi.clearAllMocks();
  });

  it('should wrap primitive in shallowRef', () => {
    const mockHook = vi.fn(() => 42);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowRef() });

    const result = useTestHook();

    expect(isRef(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(result.value).toBe(42);
  });

  it('should wrap string primitive in shallowRef', () => {
    const mockHook = vi.fn(() => 'hello');
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowRef() });

    const result = useTestHook();

    expect(isRef(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(result.value).toBe('hello');
  });

  it('should wrap object in shallowRef without deep reactivity', () => {
    const mockHook = vi.fn(() => ({ name: 'Alice', age: 30 }));
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowRef() });

    const result = useTestHook();

    expect(isRef(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(result.value.name).toBe('Alice');
    expect(isReactive(result.value)).toBe(false);
  });

  it('should wrap array in shallowRef without deep reactivity', () => {
    const mockHook = vi.fn(() => [1, 2, 3]);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowRef() });

    const result = useTestHook();

    expect(isRef(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(result.value).toEqual([1, 2, 3]);
    expect(isReactive(result.value)).toBe(false);
  });

  it('should trigger effect on reference change', async () => {
    const source = ref({ count: 1 });
    const mockHook = vi.fn((obj) => obj);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowRef() });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result.value;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    source.value = { count: 2 };
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(2);
  });

  it('should NOT trigger effect on deep property change', async () => {
    const mockHook = vi.fn(() => ({ user: { name: 'Alice' } }));
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowRef() });

    const result = useTestHook();

    let effectRuns = 0;
    watchEffect(() => {
      result.value.user.name;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    result.value.user.name = 'Bob';
    await nextTick();

    expect(effectRuns).toBe(1);
  });

  it('should NOT trigger effect on array item change', async () => {
    const mockHook = vi.fn(() => [{ id: 1 }, { id: 2 }]);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowRef() });

    const result = useTestHook();

    let effectRuns = 0;
    watchEffect(() => {
      result.value[0].id;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    result.value[0].id = 10;
    await nextTick();

    expect(effectRuns).toBe(1);
  });

  it('should update shallowRef on re-execution', async () => {
    const source = ref(10);
    const mockHook = vi.fn((val) => val * 2);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowRef() });

    const result = useTestHook(source);
    expect(result.value).toBe(20);

    source.value = 20;
    hookManager.processHookAt(0);
    await nextTick();

    expect(result.value).toBe(40);
  });

  it('should handle null in shallowRef', () => {
    const mockHook = vi.fn(() => null);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowRef() });

    const result = useTestHook();

    expect(isRef(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(result.value).toBe(null);
  });

  it('should handle undefined in shallowRef', () => {
    const mockHook = vi.fn(() => undefined);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowRef() });

    const result = useTestHook();

    expect(isRef(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(result.value).toBe(undefined);
  });

  it('should wrap function in shallowRef', () => {
    const fn = () => 'test';
    const mockHook = vi.fn(() => fn);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowRef() });

    const result = useTestHook();

    expect(isRef(result)).toBe(true);
    expect(isShallow(result)).toBe(true);
    expect(typeof result.value).toBe('function');
    expect(result.value()).toBe('test');
  });
});

describe('t.reactive()', () => {
  let hookManager: HookManager;
  let toUnisonHook: typeof toUnisonHookImpl;

  beforeEach(() => {
    hookManager = new HookManager();
    toUnisonHook = (hook, options) => toUnisonHookImpl(hook, options, hookManager);
    vi.clearAllMocks();
  });

  it('should make object deeply reactive', () => {
    const mockHook = vi.fn(() => ({ name: 'Alice', age: 30 }));
    const useTestHook = toUnisonHook(mockHook, { tracking: t.reactive() });

    const result = useTestHook();

    expect(isReactive(result)).toBe(true);
    expect(isShallow(result)).toBe(false);
    expect(result.name).toBe('Alice');
  });

  it('should make array deeply reactive', () => {
    const mockHook = vi.fn(() => [1, 2, 3]);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.reactive() });

    const result = useTestHook();

    expect(isReactive(result)).toBe(true);
    expect(isShallow(result)).toBe(false);
    expect(Array.from(result)).toEqual([1, 2, 3]);
  });

  it('should auto-detect object and make reactive', () => {
    const mockHook = vi.fn(() => ({ user: { name: 'Alice' } }));
    const useTestHook = toUnisonHook(mockHook, { tracking: t.reactive() });

    const result = useTestHook();

    expect(isReactive(result)).toBe(true);
    expect(isShallow(result)).toBe(false);
    expect(isReactive(result.user)).toBe(true);
  });

  it('should auto-detect array and make reactive', () => {
    const mockHook = vi.fn(() => [{ id: 1 }, { id: 2 }]);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.reactive() });

    const result = useTestHook();

    expect(isReactive(result)).toBe(true);
    expect(isShallow(result)).toBe(false);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should maintain nested reactivity in objects', async () => {
    const mockHook = vi.fn(() => ({
      user: {
        profile: { name: 'Alice' },
      },
    }));
    const useTestHook = toUnisonHook(mockHook, { tracking: t.reactive() });

    const result = useTestHook();

    expect(isReactive(result)).toBe(true);
    expect(isReactive(result.user)).toBe(true);
    expect(isReactive(result.user.profile)).toBe(true);
    expect(isShallow(result)).toBe(false);
    expect(isShallow(result.user)).toBe(false);
  });

  it('should maintain nested reactivity in arrays', async () => {
    const mockHook = vi.fn(() => [{ items: [{ id: 1 }] }]);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.reactive() });

    const result = useTestHook();

    expect(isReactive(result)).toBe(true);
    expect(isReactive(result[0])).toBe(true);
    expect(isReactive(result[0].items)).toBe(true);
    expect(isShallow(result)).toBe(false);
  });

  it('should trigger effect on nested property change', async () => {
    const mockHook = vi.fn(() => ({
      user: { name: 'Alice' },
    }));
    const useTestHook = toUnisonHook(mockHook, { tracking: t.reactive() });

    const result = useTestHook();

    let effectRuns = 0;
    watchEffect(() => {
      result.user.name;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    result.user.name = 'Bob';
    await nextTick();

    expect(effectRuns).toBe(2);
  });

  it('should trigger effect on array item change', async () => {
    const mockHook = vi.fn(() => [{ id: 1 }, { id: 2 }]);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.reactive() });

    const result = useTestHook();

    let effectRuns = 0;
    watchEffect(() => {
      result[0].id;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    result[0].id = 10;
    await nextTick();

    expect(effectRuns).toBe(2);
  });

  it('should fallback to ref on primitive with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockHook = vi.fn(() => 42);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.reactive() });

    const result = useTestHook();

    expect(consoleSpy).toHaveBeenCalled();
    expect(isRef(result)).toBe(true);
    expect(result.value).toBe(42);

    consoleSpy.mockRestore();
  });

  it('should fallback to ref on function with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fn = () => 'test';
    const mockHook = vi.fn(() => fn);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.reactive() });

    const result = useTestHook();

    expect(consoleSpy).toHaveBeenCalled();
    expect(isRef(result)).toBe(true);

    consoleSpy.mockRestore();
  });

  it('should fallback to ref on null with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockHook = vi.fn(() => null);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.reactive() });

    const result = useTestHook();

    expect(consoleSpy).toHaveBeenCalled();
    expect(isRef(result)).toBe(true);
    expect(result.value).toBe(null);

    consoleSpy.mockRestore();
  });
});
