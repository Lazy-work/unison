import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, isRef, isReactive, nextTick, watchEffect, toRaw, shallowRef } from '../../../src';
import { toUnisonHook as toUnisonHookImpl } from '../../../src/hook-manager';
import { HookManager } from '../../../src/hook-manager/hook-manager';
import { t } from '../../../src/hook-manager/tracking-types';

describe('t.shallow()', () => {
  let hookManager: HookManager;
  let toUnisonHook: typeof toUnisonHookImpl;

  beforeEach(() => {
    hookManager = new HookManager();
    toUnisonHook = (hook, options) => toUnisonHookImpl(hook, options, hookManager);
    vi.clearAllMocks();
  });

  it('should track entire field as atomic unit', () => {
    const mockHook = vi.fn(() => ({
      data: {
        users: [{ id: 1, name: 'Alice' }],
        meta: { count: 1 },
      },
    }));
    const useTestHook = toUnisonHook(mockHook, {
      tracking: {
        data: t.shallow(), // Field-level config
      },
    });

    const result = useTestHook();

    // data field should be ref with non-reactive value
    expect(isRef(result.data)).toBe(true);
    expect(isReactive(result.data.value)).toBe(false);
    expect(result.data.value.users[0].name).toBe('Alice');
  });

  it('should trigger effect when ANY nested property is accessed and data changes', async () => {
    const source = ref({
      data: {
        users: [{ id: 1, name: 'Alice' }],
        meta: { count: 1 },
      },
    });
    const mockHook = vi.fn((val) => val);
    const useTestHook = toUnisonHook(mockHook, {
      tracking: {
        data: t.shallow(), // Field-level: treat data as atomic
      },
    });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      // Access deeply nested property
      result.data.value.users[0].name;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    // Change different part of data (meta, not users)
    source.value = {
      data: {
        users: [{ id: 1, name: 'Alice' }], // Same
        meta: { count: 2 }, // Changed
      },
    };
    hookManager.processHookAt(0);
    await nextTick();

    // Should still trigger (whole data field treated as unit)
    expect(effectRuns).toBe(2);
  });

  it('should trigger on any nested change when atomic unit is touched', async () => {
    const source = ref({
      payload: {
        level1: {
          level2: {
            level3: { value: 'deep' },
          },
        },
      },
    });
    const mockHook = vi.fn((val) => val);
    const useTestHook = toUnisonHook(mockHook, {
      tracking: {
        payload: t.shallow(), // payload is atomic
      },
    });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      // Access any part marks whole payload as tracked
      result.payload.value.level1.level2.level3.value;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    // Change anywhere in the structure
    source.value = {
      payload: {
        level1: {
          level2: {
            level3: { value: 'changed' },
          },
        },
      },
    };
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(2);
  });

  it('should NOT create nested reactive proxies', () => {
    const mockHook = vi.fn(() => ({
      data: { nested: { deep: 'value' } },
      other: { field: 'test' },
    }));
    const useTestHook = toUnisonHook(mockHook, {
      tracking: {
        data: t.shallow(), // data is atomic
        other: t.reactive(), // other is deep reactive
      },
    });

    const result = useTestHook();

    // data field - not reactive internally
    expect(isRef(result.data)).toBe(true);
    expect(isReactive(result.data.value)).toBe(false);
    expect(isReactive(result.data.value.nested)).toBe(false);

    // other field - deep reactive
    expect(isRef(result.other)).toBe(true);
    expect(isReactive(result.other.value)).toBe(true);
  });

  it('should work with TanStack Query pattern', async () => {
    const source = ref({
      data: {
        users: [
          { id: 1, name: 'Alice', email: 'alice@example.com' },
          { id: 2, name: 'Bob', email: 'bob@example.com' },
        ],
        meta: { total: 2, page: 1 },
      },
      isLoading: false,
      error: null,
    });
    const mockHook = vi.fn((val) => val);
    const useTestHook = toUnisonHook(mockHook, {
      tracking: {
        data: t.shallow(), // Network data as atomic unit
        isLoading: t.ref(),
        error: t.ref(),
      },
    });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      // Access specific user
      result.data.value?.users.find((u) => u.id === 1)?.name;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    // Simulate network refetch with new data
    source.value = {
      data: {
        users: [
          { id: 1, name: 'Alice', email: 'newemail@example.com' },
          { id: 2, name: 'Bobby', email: 'bobby@example.com' },
          { id: 3, name: 'Charlie', email: 'charlie@example.com' },
        ],
        meta: { total: 3, page: 1 },
      },
      isLoading: false,
      error: null,
    };
    hookManager.processHookAt(0);
    await nextTick();

    // Should trigger (entire data changed)
    expect(effectRuns).toBe(2);
  });

  it('should track array field as atomic unit', async () => {
    const source = ref({
      items: [
        { id: 1, completed: false },
        { id: 2, completed: true },
      ],
    });
    const mockHook = vi.fn((val) => val);
    const useTestHook = toUnisonHook(mockHook, {
      tracking: {
        items: t.shallow(), // items array as atomic
      },
    });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result.items.value.filter((item) => item.completed).length;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    // Change array
    source.value = {
      items: [
        { id: 1, completed: true },
        { id: 2, completed: true },
      ],
    };
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(2);
  });

  it('should handle null field as atomic value', async () => {
    const source = ref({
      data: null,
    });
    const mockHook = vi.fn((val) => val);
    const useTestHook = toUnisonHook(mockHook, {
      tracking: {
        data: t.shallow(),
      },
    });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result.data.value;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    source.value = {
      data: { users: [{ name: 'Alice' }] },
    };
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(2);
  });

  it('should work in nested field config', async () => {
    const source = shallowRef({
      response: {
        data: {
          users: [{ id: 1, name: 'Alice' }],
        },
      },
    });
    const mockHook = vi.fn((val) => val);
    const useTestHook = toUnisonHook(mockHook, {
      tracking: {
        response: {
          data: t.shallow(), // Nested atomic field
        },
      },
    });

    const result = useTestHook(source);

    let effectRuns = 0;
    watchEffect(() => {
      result.response.value.data.users[0].name;
      effectRuns++;
    });

    expect(effectRuns).toBe(1);

    // Change data
    source.value = {
      response: {
        data: {
          users: [{ id: 1, name: 'Alice' }],
        },
      },
    };
    hookManager.processHookAt(0);
    await nextTick();

    expect(effectRuns).toBe(2);
  });
});

describe('t.shallow() vs t.shallowReactive() comparison', () => {
  let hookManager: HookManager;
  let toUnisonHook: typeof toUnisonHookImpl;

  beforeEach(() => {
    hookManager = new HookManager();
    toUnisonHook = (hook, options) => toUnisonHookImpl(hook, options, hookManager);
    vi.clearAllMocks();
  });

  it('should show different behavior for nested changes', async () => {
    const source = shallowRef({
      shallowReactiveField: { user: { name: 'Alice', age: 30 } },
      shallowField: { user: { name: 'Alice', age: 30 } },
    });

    const mockHook = vi.fn((val) => val);
    const useTestHook = toUnisonHook(mockHook, {
      tracking: {
        shallowReactiveField: t.shallowReactive(),
        shallowField: t.shallow(),
      },
    });
    const result = useTestHook(source);

    let shallowReactiveRuns = 0;
    let shallowRuns = 0;

    watchEffect(() => {
      result.shallowReactiveField.value.user.name;
      shallowReactiveRuns++;
    });

    watchEffect(() => {
      result.shallowField.value.user.name;
      shallowRuns++;
    });

    expect(shallowReactiveRuns).toBe(1);
    expect(shallowRuns).toBe(1);

    // Change nested property (keep user reference same)
    source.value = {
      shallowReactiveField: {
        user: { name: 'Bob', age: 30 }, // Different reference
      },
      shallowField: {
        user: { name: 'Bob', age: 30 }, // Different reference
      },
    };
    hookManager.processHookAt(0);
    await nextTick();

    // t.shallowReactive: Triggers (user reference changed)
    expect(shallowReactiveRuns).toBe(2);

    // t.shallow: Also triggers (whole field treated as unit)
    expect(shallowRuns).toBe(2);

    // Now test with same reference but property change
    const sameShallowReactive = toRaw(source.value.shallowReactiveField);
    const sameUserShallowField = toRaw(source.value.shallowField.user);

    source.value = {
      shallowReactiveField: sameShallowReactive,
      shallowField: { user: sameUserShallowField },
    };
    hookManager.processHookAt(0);
    await nextTick();

    // t.shallowReactive: Does NOT trigger (user reference unchanged)
    expect(shallowReactiveRuns).toBe(2);

    // t.shallow: DOES trigger (entire field changed, even if content same)
    expect(shallowRuns).toBe(3);
  });
});
