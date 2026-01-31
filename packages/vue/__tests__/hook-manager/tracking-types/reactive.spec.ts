import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, isRef, isReactive, nextTick, watchEffect } from '../../../src';

import { toUnisonHook as toUnisonHookImpl } from '../../../src/hook-manager';
import { HookManager } from '../../../src/hook-manager/hook-manager';
import { t } from '../../../src/hook-manager/tracking-types';

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
    expect(result.name).toBe('Alice');
  });

  it('should make array deeply reactive', () => {
    const mockHook = vi.fn(() => [1, 2, 3]);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.reactive() });

    const result = useTestHook();

    expect(isReactive(result)).toBe(true);
    expect(Array.from(result)).toEqual([1, 2, 3]);
  });

  it('should auto-detect object and make reactive', () => {
    const mockHook = vi.fn(() => ({ user: { name: 'Alice' } }));
    const useTestHook = toUnisonHook(mockHook, { tracking: t.reactive() });

    const result = useTestHook();

    expect(isReactive(result)).toBe(true);
    expect(isReactive(result.user)).toBe(true);
  });

  it('should auto-detect array and make reactive', () => {
    const mockHook = vi.fn(() => [{ id: 1 }, { id: 2 }]);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.reactive() });

    const result = useTestHook();

    expect(isReactive(result)).toBe(true);
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
  });

  it('should maintain nested reactivity in arrays', async () => {
    const mockHook = vi.fn(() => [{ items: [{ id: 1 }] }]);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.reactive() });

    const result = useTestHook();

    expect(isReactive(result)).toBe(true);
    expect(isReactive(result[0])).toBe(true);
    expect(isReactive(result[0].items)).toBe(true);
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
