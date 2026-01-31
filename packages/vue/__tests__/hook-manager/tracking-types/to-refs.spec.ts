import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, isRef, isReactive, nextTick, watchEffect, shallowRef } from '../../../src';
import { toUnisonHook as toUnisonHookImpl } from '../../../src/hook-manager';
import { HookManager } from '../../../src/hook-manager/hook-manager';
import { t } from '../../../src/hook-manager/tracking-types';


describe('t.toRefs()', () => {
  let hookManager: HookManager;
  let toUnisonHook: typeof toUnisonHookImpl;

  beforeEach(() => {
    hookManager = new HookManager();
    toUnisonHook = (hook, options) => toUnisonHookImpl(hook, options, hookManager);
    vi.clearAllMocks();
  });

  it('should spread object properties into refs', () => {
    const mockHook = vi.fn(() => ({
      name: 'Alice',
      age: 30,
    }));
    const useTestHook = toUnisonHook(mockHook, { tracking: t.toRefs() });

    const result = useTestHook();

    expect(isRef(result.name)).toBe(true);
    expect(isRef(result.age)).toBe(true);
    expect(result.name.value).toBe('Alice');
    expect(result.age.value).toBe(30);
  });

  it('should handle mixed field types', () => {
    const mockHook = vi.fn(() => ({
      primitive: 42,
      object: { nested: 'value' },
      array: [1, 2, 3],
      func: () => 'test',
    }));
    const useTestHook = toUnisonHook(mockHook, { tracking: t.toRefs() });

    const result = useTestHook();

    expect(isRef(result.primitive)).toBe(true);
    expect(result.primitive.value).toBe(42);

    expect(isRef(result.object)).toBe(true);
    expect(isReactive(result.object.value)).toBe(true);

    expect(isRef(result.array)).toBe(true);
    expect(isReactive(result.array.value)).toBe(true);

    expect(typeof result.func).toBe('function');
    expect(result.func()).toBe('test');
  });

  it('should unwrap functions (not behind .value)', () => {
    const mockHook = vi.fn(() => ({
      data: { value: 42 },
      refetch: () => 'refetched',
      reset: () => 'reset',
    }));
    const useTestHook = toUnisonHook(mockHook, { tracking: t.toRefs() });

    const result = useTestHook();

    expect(isRef(result.data)).toBe(true);
    expect(typeof result.refetch).toBe('function');
    expect(typeof result.reset).toBe('function');
    expect(result.refetch()).toBe('refetched');
    expect(result.reset()).toBe('reset');
  });

  it('should update primitive refs on hook re-execution', async () => {
    const source = ref({ count: 1, name: 'Alice' });
    const mockHook = vi.fn((obj) => obj);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.toRefs() });

    const result = useTestHook(source);

    expect(result.count.value).toBe(1);
    expect(result.name.value).toBe('Alice');

    source.value = { count: 5, name: 'Bob' };
    hookManager.processHookAt(0);
    await nextTick();

    expect(result.count.value).toBe(5);
    expect(result.name.value).toBe('Bob');
  });

  it('should maintain reactivity in nested object refs', async () => {
    const source = shallowRef({
      user: { name: 'Alice' },
    })
    const mockHook = vi.fn((val) => val);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.toRefs() });

    const result = useTestHook(source);

    expect(isRef(result.user)).toBe(true);
    expect(isReactive(result.user.value)).toBe(true);

    let effectRuns = 0;
    watchEffect(() => {
      result.user.value.name;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    source.value = {
      user: { name: 'Bob' },
    }
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(2);
  });

  it('should fallback to ref on primitive with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockHook = vi.fn(() => 42);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.toRefs() });

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
    const useTestHook = toUnisonHook(mockHook, { tracking: t.toRefs() });

    const result = useTestHook();

    expect(consoleSpy).toHaveBeenCalled();
    expect(isRef(result)).toBe(true);

    consoleSpy.mockRestore();
  });

  it('should handle array by spreading indices into refs', () => {
    const mockHook = vi.fn(() => ['a', 'b', 'c']);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.toRefs() });

    const result = useTestHook();

    expect(isRef(result[0])).toBe(true);
    expect(isRef(result[1])).toBe(true);
    expect(isRef(result[2])).toBe(true);
    expect(result[0].value).toBe('a');
    expect(result[1].value).toBe('b');
    expect(result[2].value).toBe('c');
  });

  it('should handle new fields appearing', async () => {
    const source = ref({ name: 'Alice' });
    const mockHook = vi.fn((obj) => obj);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.toRefs() });

    const result = useTestHook(source);

    expect(isRef(result.name)).toBe(true);
    expect(result.age).toBeUndefined();

    source.value = { name: 'Alice', age: 30 };
    hookManager.processHookAt(0);
    await nextTick();

    expect(isRef(result.age)).toBe(true);
    expect(result.age.value).toBe(30);
  });
});
