import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, isRef, isReactive, nextTick, watchEffect } from '../../../src';
import { toUnisonHook as toUnisonHookImpl, t } from '../../../src/hook-manager';
import { HookManager } from '../../../src/hook-manager/hook-manager';

describe('t.ref()', () => {
  let hookManager: HookManager;
  let toUnisonHook: typeof toUnisonHookImpl;

  beforeEach(() => {
    hookManager = new HookManager();
    toUnisonHook = (hook, options) => toUnisonHookImpl(hook, options, hookManager);
    vi.clearAllMocks();
  });

  it('should wrap primitive in ref', () => {
    const mockHook = vi.fn(() => 42);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });

    const result = useTestHook();

    expect(isRef(result)).toBe(true);
    expect(result.value).toBe(42);
  });

  it('should wrap string primitive in ref', () => {
    const mockHook = vi.fn(() => 'hello');
    const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });

    const result = useTestHook();

    expect(isRef(result)).toBe(true);
    expect(result.value).toBe('hello');
  });

  it('should wrap boolean primitive in ref', () => {
    const mockHook = vi.fn(() => true);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });

    const result = useTestHook();

    expect(isRef(result)).toBe(true);
    expect(result.value).toBe(true);
  });

  it('should wrap null in ref', () => {
    const mockHook = vi.fn(() => null);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });

    const result = useTestHook();

    expect(isRef(result)).toBe(true);
    expect(result.value).toBe(null);
  });

  it('should wrap undefined in ref', () => {
    const mockHook = vi.fn(() => undefined);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });

    const result = useTestHook();

    expect(isRef(result)).toBe(true);
    expect(result.value).toBe(undefined);
  });

  it('should wrap object in ref with reactive value', () => {
    const mockHook = vi.fn(() => ({ name: 'Alice', age: 30 }));
    const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });

    const result = useTestHook();

    expect(isRef(result)).toBe(true);
    expect(isReactive(result.value)).toBe(true);
    expect(result.value.name).toBe('Alice');
  });

  it('should wrap array in ref with reactive value', () => {
    const mockHook = vi.fn(() => [1, 2, 3]);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });

    const result = useTestHook();

    expect(isRef(result)).toBe(true);
    expect(isReactive(result.value)).toBe(true);
    expect(result.value).toEqual([1, 2, 3]);
  });

  it('should wrap function in ref', () => {
    const fn = () => 'test';
    const mockHook = vi.fn(() => fn);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });

    const result = useTestHook();

    expect(isRef(result)).toBe(true);
    expect(typeof result.value).toBe('function');
    expect(result.value()).toBe('test');
  });

  it('should update ref value when primitive changes on re-execution', async () => {
    const source = ref(10);
    const mockHook = vi.fn((val) => val * 2);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });

    const result = useTestHook(source);
    expect(result.value).toBe(20);

    source.value = 15;
    hookManager.processHookAt(0);
    await nextTick();

    expect(result.value).toBe(30);
  });

  it('should update ref when object changes on re-execution', async () => {
    const source = ref({ count: 1 });
    const mockHook = vi.fn((obj) => obj);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });

    const result = useTestHook(source);
    expect(result.value.count).toBe(1);

    source.value = { count: 5 };
    hookManager.processHookAt(0);
    await nextTick();

    expect(result.value.count).toBe(5);
  });

  it('should update ref when array changes on re-execution', async () => {
    const source = ref([1, 2]);
    const mockHook = vi.fn((arr) => arr);
    const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });

    const result = useTestHook(source);
    expect(result.value).toEqual([1, 2]);

    source.value = [3, 4, 5];
    hookManager.processHookAt(0);
    await nextTick();

    expect(result.value).toEqual([3, 4, 5]);
  });

  it('should maintain reactivity in nested object within ref', async () => {
    const mockHook = vi.fn(() => ({ user: { name: 'Alice' } }));
    const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });

    const result = useTestHook();

    let effectRuns = 0;
    watchEffect(() => {
      result.value.user.name;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    // This should trigger if deep reactivity is working
    result.value.user.name = 'Bob';
    await nextTick();

    expect(effectRuns).toBe(2);
  });
});
