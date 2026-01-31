import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, isRef, nextTick } from '../../../src';
import { toUnisonHook as toUnisonHookImpl } from '../../../src/hook-manager';
import { HookManager } from '../../../src/hook-manager/hook-manager';
import { t } from '../../../src/hook-manager/tracking-types';

describe('t.function()', () => {
  let hookManager: HookManager;
  let toUnisonHook: typeof toUnisonHookImpl;

  beforeEach(() => {
    hookManager = new HookManager();
    toUnisonHook = (hook, options) => toUnisonHookImpl(hook, options, hookManager);
    vi.clearAllMocks();
  });

  it('should return a callable function', () => {
    const fn = () => 'test result';
    const mockHook = vi.fn(() => fn);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.function() });

    const result = useTestHook();

    expect(typeof result).toBe('function');
    expect(result()).toBe('test result');
  });

  it('should call the up-to-date function after re-execution', async () => {
    const source = ref(1);
    const mockHook = vi.fn((multiplier) => {
      return (x) => x * multiplier;
    });
    const useTestHook = toUnisonHook(mockHook, { tracking: t.function() });

    const result = useTestHook(source);

    expect(result(10)).toBe(10); // 10 * 1

    source.value = 5;
    hookManager.processHookAt(0);
    await nextTick();

    expect(result(10)).toBe(50); // 10 * 5 (updated function)
  });

  it('should handle function with properties', () => {
    const fn = () => 'test';
    fn.customProp = 'value';
    fn.count = 42;
    const mockHook = vi.fn(() => fn);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.function() });

    const result = useTestHook();

    expect(typeof result).toBe('function');
    expect(result()).toBe('test');
    expect(result.customProp).toBe('value');
    expect(result.count).toBe(42);
  });

  it('should fallback to ref on primitive with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockHook = vi.fn(() => 42);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.function() });

    const result = useTestHook();

    expect(consoleSpy).toHaveBeenCalled();
    expect(isRef(result)).toBe(true);
    expect(result.value).toBe(42);

    consoleSpy.mockRestore();
  });

  it('should fallback to ref on object with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockHook = vi.fn(() => ({ key: 'value' }));
    const useTestHook = toUnisonHook(mockHook, { tracking: t.function() });

    const result = useTestHook();

    expect(consoleSpy).toHaveBeenCalled();
    expect(isRef(result)).toBe(true);
    expect(result.value).toEqual({ key: 'value' });

    consoleSpy.mockRestore();
  });

  it('should fallback to ref on array with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockHook = vi.fn(() => [1, 2, 3]);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.function() });

    const result = useTestHook();

    expect(consoleSpy).toHaveBeenCalled();
    expect(isRef(result)).toBe(true);
    expect(result.value).toEqual([1, 2, 3]);

    consoleSpy.mockRestore();
  });

  it('should fallback to ref on null with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockHook = vi.fn(() => null);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.function() });

    const result = useTestHook();

    expect(consoleSpy).toHaveBeenCalled();
    expect(isRef(result)).toBe(true);
    expect(result.value).toBe(null);

    consoleSpy.mockRestore();
  });

  it('should verify fallback structure is correct', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockHook = vi.fn(() => 'string');
    const useTestHook = toUnisonHook(mockHook, { tracking: t.function() });

    const result = useTestHook();

    expect(consoleSpy).toHaveBeenCalled();
    expect(isRef(result)).toBe(true);
    expect(typeof result.value).toBe('string');

    consoleSpy.mockRestore();
  });

  it('should handle async functions', async () => {
    const asyncFn = async () => 'async result';
    const mockHook = vi.fn(() => asyncFn);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.function() });

    const result = useTestHook();

    expect(typeof result).toBe('function');
    const value = await result();
    expect(value).toBe('async result');
  });
});
