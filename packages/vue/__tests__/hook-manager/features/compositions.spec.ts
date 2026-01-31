import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, isRef, isReactive, nextTick, watchEffect } from '../../../src';
import { toUnisonHook as toUnisonHookImpl, t } from '../../../src/hook-manager';
import { isShallow } from '../../../src';
import { HookManager } from '../../../src/hook-manager/hook-manager';


describe('Type Compositions', () => {
  let hookManager: HookManager;
  let toUnisonHook: typeof toUnisonHookImpl;

  beforeEach(() => {
    hookManager = new HookManager();
    toUnisonHook = (hook, options) => toUnisonHookImpl(hook, options, hookManager);
    vi.clearAllMocks();
  });

  describe('Single-level valid compositions', () => {
    it('should compose t.ref(t.reactive())', () => {
      const mockHook = vi.fn(() => ({ name: 'Alice', age: 30 }));
      const useTestHook = toUnisonHook(mockHook, {
        tracking: t.ref(t.reactive()),
      });

      const result = useTestHook();

      expect(isRef(result)).toBe(true);
      expect(isReactive(result.value)).toBe(true);
      expect(isShallow(result.value)).toBe(false);
      expect(result.value.name).toBe('Alice');
    });

    it('should compose t.shallowRef(t.reactive())', () => {
      const mockHook = vi.fn(() => ({ name: 'Alice', age: 30 }));
      const useTestHook = toUnisonHook(mockHook, {
        tracking: t.shallowRef(t.reactive()),
      });

      const result = useTestHook();

      expect(isRef(result)).toBe(true);
      expect(isShallow(result)).toBe(true);
      expect(isReactive(result.value)).toBe(true);
      expect(isShallow(result.value)).toBe(false);
    });

    it('should compose t.ref(t.shallowReactive())', () => {
      const mockHook = vi.fn(() => ({
        user: { name: 'Alice' },
      }));
      const useTestHook = toUnisonHook(mockHook, {
        tracking: t.ref(t.shallowReactive()),
      });

      const result = useTestHook();

      expect(isRef(result)).toBe(true);
      expect(isReactive(result.value)).toBe(true);
      expect(isShallow(result.value)).toBe(true);
      expect(isReactive(result.value.user)).toBe(false);
    });

    it('should compose t.ref(t.object())', () => {
      const mockHook = vi.fn(() => ({ name: 'Alice' }));
      const useTestHook = toUnisonHook(mockHook, {
        tracking: t.ref(t.object()),
      });

      const result = useTestHook();

      expect(isRef(result)).toBe(true);
      expect(isReactive(result.value)).toBe(true);
      expect(isShallow(result.value)).toBe(false);
    });

    it('should compose t.ref(t.objectShallow())', () => {
      const mockHook = vi.fn(() => ({
        user: { name: 'Alice' },
      }));
      const useTestHook = toUnisonHook(mockHook, {
        tracking: t.ref(t.shallowObject()),
      });

      const result = useTestHook();

      expect(isRef(result)).toBe(true);
      expect(isReactive(result.value)).toBe(true);
      expect(isShallow(result.value)).toBe(true);
      expect(isReactive(result.value.user)).toBe(false);
    });

    it('should compose t.shallowRef(t.object())', () => {
      const mockHook = vi.fn(() => ({
        nested: { value: 42 },
      }));
      const useTestHook = toUnisonHook(mockHook, {
        tracking: t.shallowRef(t.object()),
      });

      const result = useTestHook();

      expect(isRef(result)).toBe(true);
      expect(isShallow(result)).toBe(true);
      expect(isReactive(result.value)).toBe(true);
      expect(isShallow(result.value)).toBe(false);
    });

    it('should compose t.shallowRef(t.objectShallow())', () => {
      const mockHook = vi.fn(() => ({
        nested: { value: 42 },
      }));
      const useTestHook = toUnisonHook(mockHook, {
        tracking: t.shallowRef(t.shallowObject()),
      });

      const result = useTestHook();

      expect(isRef(result)).toBe(true);
      expect(isShallow(result)).toBe(true);
      expect(isReactive(result.value)).toBe(true);
      expect(isShallow(result.value)).toBe(true);
    });

    it('should maintain reactivity through composition', async () => {
      const source = ref({ count: 1 });
      const mockHook = vi.fn((obj) => obj);
      const useTestHook = toUnisonHook(mockHook, {
        tracking: t.ref(t.reactive()),
      });

      const result = useTestHook(source);

      let effectRuns = 0;
      watchEffect(() => {
        result.value.count;
        effectRuns++;
      });

      expect(effectRuns).toBe(1);

      source.value = { count: 2 };
      hookManager.processHookAt(0);
      await nextTick();

      expect(effectRuns).toBe(2);
    });
  });

  describe('Multi-level compositions', () => {

    it('should compose with multiple nested fields', () => {
      const mockHook = vi.fn(() => ({
        shallow: { value: 1 },
        deep: { nested: { value: 2 } },
        primitive: 42,
      }));
      const useTestHook = toUnisonHook(mockHook, {
        tracking: t.toRefs({
          shallow: t.shallowReactive(),
          deep: t.reactive(),
          primitive: t.ref(),
        }),
      });

      const result = useTestHook();

      expect(isRef(result.shallow)).toBe(true);
      expect(isReactive(result.shallow.value)).toBe(true);
      expect(isShallow(result.shallow.value)).toBe(true);

      expect(isRef(result.deep)).toBe(true);
      expect(isReactive(result.deep.value)).toBe(true);
      expect(isShallow(result.deep.value)).toBe(false);

      expect(isRef(result.primitive)).toBe(true);
      expect(result.primitive.value).toBe(42);
    });

    it('should compose t.shallowRef(t.array({ items: t.shallowReactive() }))', () => {
      const mockHook = vi.fn(() => [{ items: [{ id: 1 }] }, { items: [{ id: 2 }] }]);
      const useTestHook = toUnisonHook(mockHook, {
        tracking: t.shallowRef(
          t.array({
            // Array items have specific config
            0: t.shallowReactive(),
            1: t.shallowReactive(),
          }),
        ),
      });

      const result = useTestHook();

      expect(isRef(result)).toBe(true);
      expect(isShallow(result)).toBe(true);
      expect(isReactive(result.value)).toBe(true);
    });

    it('should handle deep nested config structures', () => {
      const mockHook = vi.fn(() => ({
        data: {
          user: {
            profile: {
              settings: { theme: 'dark' },
            },
          },
        },
      }));
      const useTestHook = toUnisonHook(mockHook, {
        tracking: {
          data: {
            user: {
              profile: {
                settings: t.shallowReactive(),
              },
            },
          },
        },
      });

      const result = useTestHook();

      expect(isRef(result.data)).toBe(true);
      expect(isReactive(result.data.value)).toBe(true);
      expect(isReactive(result.data.value.user)).toBe(true);
      expect(isReactive(result.data.value.user.profile)).toBe(true);
      expect(isReactive(result.data.value.user.profile.settings)).toBe(true);
      expect(isShallow(result.data.value.user.profile.settings)).toBe(true);
    });
  });

  describe('Invalid compositions', () => {
    it('should warn and ignore inner when composing t.reactive(t.ref())', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockHook = vi.fn(() => ({ name: 'Alice' }));
      const useTestHook = toUnisonHook(mockHook, {
        tracking: t.reactive(t.ref()),
      });

      const result = useTestHook();

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('invalid'));
      // Should just use t.reactive() and ignore the inner t.ref()
      expect(isReactive(result)).toBe(true);
      expect(isRef(result)).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should warn and ignore inner when composing t.shallowReactive(t.shallowRef())', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockHook = vi.fn(() => ({ name: 'Alice' }));
      const useTestHook = toUnisonHook(mockHook, {
        tracking: t.shallowReactive(t.shallowRef()),
      });

      const result = useTestHook();

      expect(consoleSpy).toHaveBeenCalled();
      // Should just use t.shallowReactive() and ignore inner
      expect(isReactive(result)).toBe(true);
      expect(isShallow(result)).toBe(true);
      expect(isRef(result)).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should warn on nested invalid composition t.reactive(t.ref(t.object()))', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockHook = vi.fn(() => ({ name: 'Alice' }));
      const useTestHook = toUnisonHook(mockHook, {
        tracking: t.reactive(t.ref(t.object())),
      });

      const result = useTestHook();

      expect(consoleSpy).toHaveBeenCalled();
      // Should warn about the invalid inner composition
      expect(isReactive(result)).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should warn on t.object(t.reactive())', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockHook = vi.fn(() => ({ name: 'Alice' }));
      const useTestHook = toUnisonHook(mockHook, {
        tracking: t.object(t.reactive()),
      });

      const result = useTestHook();

      expect(consoleSpy).toHaveBeenCalled();
      // Should warn but still work (t.object is like t.reactive anyway)
      expect(isReactive(result)).toBe(true);

      consoleSpy.mockRestore();
    });
  });
});
