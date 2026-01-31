import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, isRef, isReactive, nextTick, watchEffect } from '../../../src';
import { toUnisonHook as toUnisonHookImpl, t } from '../../../src/hook-manager';
import { isShallow } from '../../../src';
import { HookManager } from '../../../src/hook-manager/hook-manager';

describe('Type Compatibility and Fallbacks', () => {
  let hookManager: HookManager;
  let toUnisonHook: typeof toUnisonHookImpl;

  beforeEach(() => {
    hookManager = new HookManager();
    toUnisonHook = (hook, options) => toUnisonHookImpl(hook, options, hookManager);
    vi.clearAllMocks();
  });

  describe('High Priority Fallbacks', () => {
    it('should fallback t.toRefs() on primitive to ref() with warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockHook = vi.fn(() => 42);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.toRefs() });

      const result = useTestHook();

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Type incompatibility'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('toRefs'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('primitive'));
      expect(isRef(result)).toBe(true);
      expect(result.value).toBe(42);

      consoleSpy.mockRestore();
    });

    it('should fallback t.reactive() on primitive to ref() with warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockHook = vi.fn(() => 'string');
      const useTestHook = toUnisonHook(mockHook, { tracking: t.reactive() });

      const result = useTestHook();

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('reactive'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('primitive'));
      expect(isRef(result)).toBe(true);
      expect(result.value).toBe('string');

      consoleSpy.mockRestore();
    });

    it('should fallback t.shallowReactive() on primitive to shallowRef() with warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockHook = vi.fn(() => true);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowReactive() });

      const result = useTestHook();

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('shallowReactive'));
      expect(isRef(result)).toBe(true);
      expect(isShallow(result)).toBe(true);
      expect(result.value).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should fallback t.object() on primitive to ref() with warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockHook = vi.fn(() => 123);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.object() });

      const result = useTestHook();

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('object'));
      expect(isRef(result)).toBe(true);
      expect(result.value).toBe(123);

      consoleSpy.mockRestore();
    });

    it('should fallback t.array() on object to ref() with warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockHook = vi.fn(() => ({ key: 'value' }));
      const useTestHook = toUnisonHook(mockHook, { tracking: t.array() });

      const result = useTestHook();

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('array'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('object'));
      expect(isRef(result)).toBe(true);
      expect(result.value).toEqual({ key: 'value' });

      consoleSpy.mockRestore();
    });

    it('should fallback t.objectShallow() on primitive to shallowRef() with warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockHook = vi.fn(() => null);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.objectShallow() });

      const result = useTestHook();

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('objectShallow'));
      expect(isRef(result)).toBe(true);
      expect(isShallow(result)).toBe(true);
      expect(result.value).toBe(null);

      consoleSpy.mockRestore();
    });

    it('should fallback t.arrayShallow() on object to shallowRef() with warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockHook = vi.fn(() => ({ not: 'array' }));
      const useTestHook = toUnisonHook(mockHook, { tracking: t.arrayShallow() });

      const result = useTestHook();

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('arrayShallow'));
      expect(isRef(result)).toBe(true);
      expect(isShallow(result)).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should fallback t.function() on non-function to ref() with warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockHook = vi.fn(() => ({ key: 'value' }));
      const useTestHook = toUnisonHook(mockHook, { tracking: t.function() });

      const result = useTestHook();

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('function'));
      expect(isRef(result)).toBe(true);
      expect(result.value).toEqual({ key: 'value' });

      consoleSpy.mockRestore();
    });

    it('should verify fallback suggestion mentions t.ref()', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockHook = vi.fn(() => 42);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.object() });

      useTestHook();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('t.ref()'));

      consoleSpy.mockRestore();
    });

    it('should verify fallback suggestion mentions t.shallow()', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockHook = vi.fn(() => 42);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.objectShallow() });

      useTestHook();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('t.shallowRef()'));

      consoleSpy.mockRestore();
    });
  });

  describe('Medium Priority Fallbacks', () => {
    it('should handle type changes during execution', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const source = ref({ name: 'Alice' });
      const mockHook = vi.fn((val) => val);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.object() });

      const result = useTestHook(source);

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(isReactive(result)).toBe(true);

      // Change to primitive
      source.value = 42;
      hookManager.processHookAt(0);
      await nextTick();

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Type changed'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('object'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('primitive'));

      consoleSpy.mockRestore();
    });

    it('should adapt behavior to new type after change', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const source = ref([1, 2, 3]);
      const mockHook = vi.fn((val) => val);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.array() });

      const result = useTestHook(source);

      expect(isReactive(result)).toBe(true);
      expect(Array.isArray(result)).toBe(true);

      // Change to object
      source.value = { key: 'value' };
      hookManager.processHookAt(0);
      await nextTick();

      expect(consoleSpy).toHaveBeenCalled();
      // Should fallback to ref with reactive object
      expect(isRef(result)).toBe(true);
      expect(isReactive(result.value)).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should fallback t.toRefs() on function to ref() with warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const fn = () => 'test';
      const mockHook = vi.fn(() => fn);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.toRefs() });

      const result = useTestHook();

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('toRefs'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('function'));
      expect(isRef(result)).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should warn on multiple type changes', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const source = ref({ name: 'Alice' });
      const mockHook = vi.fn((val) => val);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.reactive() });

      useTestHook(source);

      // First change: object -> primitive
      source.value = 42;
      hookManager.processHookAt(0);
      await nextTick();

      const firstCallCount = consoleSpy.mock.calls.length;
      expect(firstCallCount).toBeGreaterThan(0);

      // Second change: primitive -> array
      source.value = [1, 2, 3];
      hookManager.processHookAt(0);
      await nextTick();

      expect(consoleSpy.mock.calls.length).toBeGreaterThan(firstCallCount);

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Case Fallbacks', () => {
    it('should NOT warn on t.object() with function (compatible)', () => {
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

    it('should NOT warn on t.objectShallow() with function (compatible)', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const fn = () => 'test';
      fn.prop1 = 'a';
      fn.prop2 = 'b';
      const mockHook = vi.fn(() => fn);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.objectShallow() });

      const result = useTestHook();

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(isReactive(result)).toBe(true);
      expect(isShallow(result)).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should handle null with t.ref() without warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockHook = vi.fn(() => null);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });

      const result = useTestHook();

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(isRef(result)).toBe(true);
      expect(result.value).toBe(null);

      consoleSpy.mockRestore();
    });

    it('should handle undefined with t.ref() without warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockHook = vi.fn(() => undefined);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });

      const result = useTestHook();

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(isRef(result)).toBe(true);
      expect(result.value).toBe(undefined);

      consoleSpy.mockRestore();
    });

    it('should handle null with t.shallowRef() without warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockHook = vi.fn(() => null);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.shallowRef() });

      const result = useTestHook();

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(isRef(result)).toBe(true);
      expect(isShallow(result)).toBe(true);
      expect(result.value).toBe(null);

      consoleSpy.mockRestore();
    });

    it('should fallback t.reactive() on null to ref() with warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockHook = vi.fn(() => null);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.reactive() });

      const result = useTestHook();

      expect(consoleSpy).toHaveBeenCalled();
      expect(isRef(result)).toBe(true);
      expect(result.value).toBe(null);

      consoleSpy.mockRestore();
    });

    it('should fallback t.reactive() on undefined to ref() with warning', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockHook = vi.fn(() => undefined);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.reactive() });

      const result = useTestHook();

      expect(consoleSpy).toHaveBeenCalled();
      expect(isRef(result)).toBe(true);
      expect(result.value).toBe(undefined);

      consoleSpy.mockRestore();
    });

    it('should handle empty object with any tracking type', () => {
      const mockHook = vi.fn(() => ({}));
      const useTestHook = toUnisonHook(mockHook, { tracking: t.reactive() });

      const result = useTestHook();

      expect(isReactive(result)).toBe(true);
      expect(Object.keys(result)).toEqual([]);
    });

    it('should handle empty array with any tracking type', () => {
      const mockHook = vi.fn(() => []);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.array() });

      const result = useTestHook();

      expect(isReactive(result)).toBe(true);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
});
