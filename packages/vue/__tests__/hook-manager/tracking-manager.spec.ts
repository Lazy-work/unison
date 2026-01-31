import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, watchSyncEffect, nextTick, watchEffect, computed, shallowRef } from '../../src';
import { t, toUnisonHook as toUnisonHookImpl } from '../../src/hook-manager';
import { HookManager } from '../../src/hook-manager/hook-manager';

describe('HookManager - Tracking Requirements', () => {
  let hookManager: HookManager;
  let toUnisonHook: typeof toUnisonHookImpl;

  beforeEach(() => {
    hookManager = new HookManager();
    toUnisonHook = (hook, options) => toUnisonHookImpl(hook, options, hookManager);
    vi.clearAllMocks();
  });

  describe('Object Reference Tracking', () => {
    it('should not track object reference changes', async () => {
      // Create a data source that can be changed
      const dataSource = ref({ name: 'John', age: 30 });

      // Mock hook that reads from the data source
      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook);

      let effectRuns = 0;
      const result = useTestHook(dataSource);

      watchEffect(() => {
        result.name; // Access property to trigger tracking
        effectRuns++;
      });

      // Change to different object with same content
      dataSource.value = { name: 'John', age: 30 }; // Different reference, same data
      hookManager.processHookAt(0); // This will re-run the hook with new data

      expect(effectRuns).toBe(1); // Should not retrigger for reference change
    });

    it('should track object property changes at various depths', async () => {
      const dataSource = ref({
        user: {
          profile: {
            name: 'John',
            settings: {
              theme: 'dark',
            },
          },
        },
      });

      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook);

      let effectRuns = 0;
      const result = useTestHook(dataSource);

      watchEffect(() => {
        result.user.value.profile.settings.theme; // Deep access
        effectRuns++;
      });

      // Change deep property value
      dataSource.value = {
        user: {
          profile: {
            name: 'John',
            settings: {
              theme: 'light', // Changed value
            },
          },
        },
      };

      hookManager.processHookAt(0);
      await nextTick();

      expect(effectRuns).toBe(2); // Should retrigger for value change
    });
  });

  describe('Path Tracking Specificity', () => {
    it('should not track non-accessed paths', async () => {
      const dataSource = ref({
        trackedField: 'initial',
        untrackedField: 'initial',
      });

      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook);

      let effectRuns = 0;
      const result = useTestHook(dataSource);

      watchEffect(() => {
        result.trackedField.value; // Only access this field
        effectRuns++;
      });

      // Change only the untracked field
      dataSource.value = {
        trackedField: 'initial', // Same
        untrackedField: 'changed', // Different, but not tracked
      };

      hookManager.processHookAt(0);
      await nextTick();
      expect(effectRuns).toBe(1); // Should not retrigger

      // Now change the tracked field
      dataSource.value = {
        trackedField: 'changed', // Different and tracked
        untrackedField: 'changed',
      };

      console.log('trackedField :', result.trackedField.value);
      console.log('untrackedField :', result.untrackedField.value);
      hookManager.processHookAt(0);
      await nextTick();

      expect(effectRuns).toBe(2); // Should retrigger
    });

    it('should only track requested paths within effects', async () => {
      const dataSource = ref({
        a: { value: 1 },
        b: { value: 2 },
        c: { value: 3 },
      });

      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook);
      const result = useTestHook(dataSource);

      let effect1Runs = 0;
      let effect2Runs = 0;

      // Effect 1 only tracks 'a'
      watchEffect(() => {
        result.a.value.value;
        effect1Runs++;
      });

      // Effect 2 only tracks 'b'
      watchEffect(() => {
        result.b.value.value;
        effect2Runs++;
      });

      // Change 'a' only
      dataSource.value = {
        a: { value: 10 }, // Changed
        b: { value: 2 }, // Same
        c: { value: 3 }, // Same
      };

      hookManager.processHookAt(0);
      await nextTick();

      expect(effect1Runs).toBe(2); // Should retrigger
      expect(effect2Runs).toBe(1); // Should not retrigger
    });
  });

  describe('Reactive Parameters', () => {
    it('should re-run hook when reactive parameters change', async () => {
      const query = ref('initial-query');
      let hookCallCount = 0;

      // Mock hook that depends on reactive parameter
      const mockHook = vi.fn((queryParam) => {
        hookCallCount++;
        return { data: `result-for-${queryParam}`, query: queryParam };
      });

      const useTestHook = toUnisonHook(mockHook);
      let result;
      watchEffect(() => {
        result = useTestHook(query);
      });
      expect(hookCallCount).toBe(1);
      expect(result.data.value).toBe('result-for-initial-query');

      // Change reactive parameter
      query.value = 'updated-query';
      hookManager.processHookAt(0); // This should re-run the hook
      await nextTick();

      expect(hookCallCount).toBe(2);
      expect(result.data.value).toBe('result-for-updated-query');
    });

    it('should support multiple reactive parameters', async () => {
      const param1 = ref('a');
      const param2 = ref(1);
      let hookCallCount = 0;

      const mockHook = vi.fn((p1, p2) => {
        hookCallCount++;
        return { combined: `${p1}-${p2}` };
      });

      const useTestHook = toUnisonHook(mockHook);
      const result = useTestHook(param1, param2);

      expect(hookCallCount).toBe(1);
      expect(result.combined.value).toBe('a-1');

      // Change first parameter
      param1.value = 'b';
      hookManager.processHookAt(0);
      await nextTick();

      expect(hookCallCount).toBe(2);
      expect(result.combined.value).toBe('b-1');

      // Change second parameter
      param2.value = 2;
      hookManager.processHookAt(0);
      await nextTick();

      expect(hookCallCount).toBe(3);
      expect(result.combined.value).toBe('b-2');
    });
  });

  describe('Function Result Handling', () => {
    it('should return a function that points to up-to-date result when hook returns function', async () => {
      const counter = ref(0);

      // Hook returns a function that captures current counter value
      const mockHook = vi.fn((currentCount) => {
        return () => `count-is-${currentCount}`;
      });

      const useTestHook = toUnisonHook(mockHook);
      const result = useTestHook(counter);

      expect(typeof result).toBe('function');
      expect(result()).toBe('count-is-0');

      // Update counter
      counter.value = 5;
      hookManager.processHookAt(0);
      await nextTick();

      // Should use the updated function
      expect(result()).toBe('count-is-5');
    });

    it('should not create refs for function results', () => {
      const mockHook = vi.fn(() => () => 'test');
      const useTestHook = toUnisonHook(mockHook);

      const result = useTestHook();

      expect(typeof result).toBe('function');
      expect(result.value).toBeUndefined(); // Should not be a ref
    });
  });

  describe('Array Result Handling', () => {
    it('should create a ref with array as value, not refs for each field', () => {
      const items = ref(['a', 'b', 'c']);
      const mockHook = vi.fn((itemsParam) => itemsParam);

      const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });
      const result = useTestHook(items);

      // Should be able to access array directly
      console.log(result.value.map((value) => value + '1'));
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.value).toEqual(['a', 'b', 'c']);

      // Should not have individual refs for indices
      expect(result[0]).toBeUndefined();
      expect(result[1]).toBeUndefined();
      expect(result[2]).toBeUndefined();
    });

    it('should allow deep tracking on arrays while ignoring reference changes', async () => {
      const data = ref([
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ]);

      const mockHook = vi.fn((dataParam) => dataParam);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });

      let effectRuns = 0;
      const result = useTestHook(data);

      watchEffect(() => {
        result.value[0].name; // Deep access into array
        effectRuns++;
      });

      // Change array content (same structure, different values)
      data.value = [
        { id: 1, name: 'Johnny' }, // Changed value
        { id: 2, name: 'Jane' },
      ];

      hookManager.processHookAt(0);
      await nextTick();

      expect(effectRuns).toBe(2); // Should track deep changes
    });
  });

  describe('Primitive Result Handling', () => {
    it('should create a ref for primitive results', async () => {
      const mockHook = vi.fn(() => 'test string');
      const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });

      const result = useTestHook();

      expect(result.value).toBe('test string');
    });

    it('should create a ref for null results', () => {
      const mockHook = vi.fn(() => null);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });

      const result = useTestHook();

      expect(result.value).toBe(null);
    });

    it('should update ref value when primitive result changes', async () => {
      const input = ref(42);
      const mockHook = vi.fn((inputParam) => inputParam * 2);

      const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });
      const result = useTestHook(input);

      expect(result.value).toBe(84);

      input.value = 50;
      hookManager.processHookAt(0);
      await nextTick();

      expect(result.value).toBe(100);
    });
  });

  describe('Synchronous Effect Updates', () => {
    it('should provide up-to-date results in sync effects after hook execution', () => {
      const count = ref(0);
      const mockHook = vi.fn((countParam) => ({ count: countParam }));

      const useTestHook = toUnisonHook(mockHook);
      const result = useTestHook(count);

      let capturedValue;

      watchSyncEffect(() => {
        capturedValue = result.count.value;
      });

      expect(capturedValue).toBe(0);

      // Update input
      count.value = 5;
      hookManager.processHookAt(0);

      // Sync effect should see the updated value immediately
      expect(capturedValue).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined/null hook results', async () => {
      const mockHook = vi.fn(() => undefined);
      const useTestHook = toUnisonHook(mockHook);

      const result = useTestHook();
      expect(result.value).toBeUndefined();
    });

    it('should handle hooks that throw errors', () => {
      const shouldThrow = ref(false);
      const mockHook = vi.fn((throwFlag) => {
        if (throwFlag) throw new Error('Hook error');
        return { success: true };
      });

      const useTestHook = toUnisonHook(mockHook);
      const result = useTestHook(shouldThrow);

      expect(result.success.value).toBe(true);

      // This should be handled gracefully by your error boundaries
      shouldThrow.value = true;
      expect(() => hookManager.processHookAt(0)).toThrow('Hook error');
    });
  });
});

describe('HookManager - Iteration-Based Operations', () => {
  let hookManager: HookManager;
  let toUnisonHook: typeof toUnisonHookImpl;

  beforeEach(() => {
    hookManager = new HookManager();
    toUnisonHook = (hook, options) => toUnisonHookImpl(hook, options, hookManager);
    vi.clearAllMocks();
  });

  describe('for...of iteration with nested access', () => {
    it('should track both structure changes and nested property access', async () => {
      const dataSource = ref([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });
      const result = useTestHook(dataSource);

      const fn = vi.fn();
      const names = [];

      watchEffect(() => {
        names.length = 0;
        for (const item of result.value) {
          names.push(item.name); // Nested property access
        }
        fn();
      });

      expect(fn).toHaveBeenCalledTimes(1);
      expect(names).toEqual(['Alice', 'Bob']);

      // Change nested property - should trigger
      dataSource.value = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bobby' }, // name changed
      ];
      hookManager.processHookAt(0);
      await nextTick();

      expect(fn).toHaveBeenCalledTimes(2);
      expect(names).toEqual(['Alice', 'Bobby']);

      // Add item - should trigger (structure change)
      dataSource.value = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bobby' },
        { id: 3, name: 'Charlie' },
      ];
      hookManager.processHookAt(0);
      await nextTick();

      expect(fn).toHaveBeenCalledTimes(3);
      expect(names).toEqual(['Alice', 'Bobby', 'Charlie']);

      // Remove item - should trigger (structure change)
      dataSource.value = [{ id: 1, name: 'Alice' }];
      hookManager.processHookAt(0);
      await nextTick();

      expect(fn).toHaveBeenCalledTimes(4);
      expect(names).toEqual(['Alice']);
    });

    it('should not trigger when non-accessed properties change', async () => {
      const dataSource = ref([
        { id: 1, name: 'Alice', age: 25 },
        { id: 2, name: 'Bob', age: 30 },
      ]);
      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });
      const result = useTestHook(dataSource);

      const fn = vi.fn();

      watchEffect(() => {
        for (const item of result.value) {
          item.name; // Only access name, not age
        }
        fn();
      });

      // Change age (not tracked) - should NOT trigger
      dataSource.value = [
        { id: 1, name: 'Alice', age: 26 }, // age changed
        { id: 2, name: 'Bob', age: 31 }, // age changed
      ];
      hookManager.processHookAt(0);
      await nextTick();

      expect(fn).toHaveBeenCalledTimes(1); // Should NOT retrigger

      // Change name (tracked) - should trigger
      dataSource.value = [
        { id: 1, name: 'Alicia', age: 26 }, // name changed
        { id: 2, name: 'Bob', age: 31 },
      ];
      hookManager.processHookAt(0);
      await nextTick();
      hookManager.processHookAt(0);
      await nextTick();

      expect(fn).toHaveBeenCalledTimes(2); // Should retrigger once
    });

    it('should track iteration without nested access', async () => {
      const dataSource = ref([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });
      const result = useTestHook(dataSource);

      const fn = vi.fn();

      watchEffect(() => {
        for (const item of result.value) {
          // Just iterate, don't access properties
        }
        fn();
      });

      expect(fn).toHaveBeenCalledTimes(1);

      // Change property - should NOT trigger (not accessed)
      dataSource.value = [
        { id: 1, name: 'Alicia' },
        { id: 2, name: 'Bobby' },
      ];
      hookManager.processHookAt(0);
      await nextTick();

      expect(fn).toHaveBeenCalledTimes(1); // Should NOT retrigger

      // Add item - should trigger (structure change)
      dataSource.value = [
        { id: 1, name: 'Alicia' },
        { id: 2, name: 'Bobby' },
        { id: 3, name: 'Charlie' },
      ];
      hookManager.processHookAt(0);
      await nextTick();

      expect(fn).toHaveBeenCalledTimes(2); // Should retrigger
    });
  });

  describe('for...in iteration', () => {
    it('should track object key iteration with nested access', async () => {
      const dataSource = shallowRef({
        user1: { name: 'Alice', role: 'admin' },
        user2: { name: 'Bob', role: 'user' },
      });
      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });
      const result = useTestHook(dataSource);

      const fn = vi.fn();
      const names = [];

      watchEffect(() => {
        names.length = 0;
        for (const key in result.value) {
          names.push(result.value[key].name);
        }
        fn();
      });

      expect(fn).toHaveBeenCalledTimes(1);
      expect(names).toEqual(['Alice', 'Bob']);

      // Change nested property - should trigger
      dataSource.value = {
        user1: { name: 'Alicia', role: 'admin' },
        user2: { name: 'Bob', role: 'user' },
      };
      hookManager.processHookAt(0);
      await nextTick();

      expect(fn).toHaveBeenCalledTimes(2);
      expect(names).toEqual(['Alicia', 'Bob']);

      // Add new key - should trigger (structure change)
      dataSource.value = {
        user1: { name: 'Alicia', role: 'admin' },
        user2: { name: 'Bob', role: 'user' },
        user3: { name: 'Charlie', role: 'guest' },
      };
      hookManager.processHookAt(0);
      await nextTick();

      expect(fn).toHaveBeenCalledTimes(3);
      expect(names).toEqual(['Alicia', 'Bob', 'Charlie']);

      // Remove key - should trigger (structure change)
      dataSource.value = {
        user1: { name: 'Alicia', role: 'admin' },
      };
      hookManager.processHookAt(0);
      await nextTick();

      expect(fn).toHaveBeenCalledTimes(4);
      expect(names).toEqual(['Alicia']);
    });

    it('should not trigger when non-accessed nested properties change', async () => {
      const dataSource = ref({
        user1: { name: 'Alice', role: 'admin', age: 25 },
        user2: { name: 'Bob', role: 'user', age: 30 },
      });
      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook);
      const result = useTestHook(dataSource);

      const fn = vi.fn();

      watchEffect(() => {
        for (const key in result.value) {
          result.value[key].name; // Only access name
        }
        fn();
      });

      expect(fn).toHaveBeenCalledTimes(1);

      // Change age (not tracked) - should NOT trigger
      dataSource.value = {
        user1: { name: 'Alice', role: 'admin', age: 26 },
        user2: { name: 'Bob', role: 'user', age: 31 },
      };
      hookManager.processHookAt(0);
      await nextTick();

      expect(fn).toHaveBeenCalledTimes(1); // Should NOT retrigger
    });
  });

  describe('Array.prototype.forEach with nested access', () => {
    it('should track both iteration and nested properties', async () => {
      const dataSource = ref([
        { id: 1, name: 'Alice', score: 100 },
        { id: 2, name: 'Bob', score: 85 },
      ]);
      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });
      const result = useTestHook(dataSource);

      const fn = vi.fn();
      let total = 0;

      watchEffect(() => {
        total = 0;
        result.value.forEach((item) => {
          total += item.score;
        });
        fn();
      });

      expect(fn).toHaveBeenCalledTimes(1);
      expect(total).toBe(185);

      // Change score - should trigger
      dataSource.value = [
        { id: 1, name: 'Alice', score: 95 },
        { id: 2, name: 'Bob', score: 85 },
      ];
      hookManager.processHookAt(0);
      await nextTick();

      expect(fn).toHaveBeenCalledTimes(2);
      expect(total).toBe(180);

      // Add item - should trigger
      dataSource.value = [
        { id: 1, name: 'Alice', score: 95 },
        { id: 2, name: 'Bob', score: 85 },
        { id: 3, name: 'Charlie', score: 90 },
      ];
      hookManager.processHookAt(0);
      await nextTick();

      expect(fn).toHaveBeenCalledTimes(3);
      expect(total).toBe(270);
    });
  });

  describe('Array.prototype.map with nested access', () => {
    it('should track both iteration and nested properties', async () => {
      const dataSource = ref([
        { id: 1, name: 'Alice', active: true },
        { id: 2, name: 'Bob', active: false },
      ]);
      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });
      const result = useTestHook(dataSource);

      const mapped = computed(() => result.value.map((item) => item.active));

      expect(mapped.value).toEqual([true, false]);

      // Change active property - should trigger
      dataSource.value = [
        { id: 1, name: 'Alice', active: true },
        { id: 2, name: 'Bob', active: true },
      ];
      hookManager.processHookAt(0);
      await nextTick();

      expect(mapped.value).toEqual([true, true]);

      // Add item - should trigger
      dataSource.value = [
        { id: 1, name: 'Alice', active: true },
        { id: 2, name: 'Bob', active: true },
        { id: 3, name: 'Charlie', active: false },
      ];
      hookManager.processHookAt(0);
      await nextTick();

      expect(mapped.value).toEqual([true, true, false]);
    });

    it('should not trigger when non-accessed properties change', async () => {
      const dataSource = ref([
        { id: 1, name: 'Alice', active: true, age: 25 },
        { id: 2, name: 'Bob', active: false, age: 30 },
      ]);
      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });
      const result = useTestHook(dataSource);

      const fn = vi.fn();
      let mapped;

      watchEffect(() => {
        mapped = result.value.map((item) => item.active); // Only access 'active'
        fn();
      });

      expect(fn).toHaveBeenCalledTimes(1);
      expect(mapped).toEqual([true, false]);

      // Change age (not tracked) - should NOT trigger
      dataSource.value = [
        { id: 1, name: 'Alice', active: true, age: 26 },
        { id: 2, name: 'Bob', active: false, age: 31 },
      ];
      hookManager.processHookAt(0);
      await nextTick();

      expect(fn).toHaveBeenCalledTimes(1); // Should NOT retrigger
    });
  });

  describe('Array.prototype.filter with nested access', () => {
    it('should track both iteration and nested properties', async () => {
      const dataSource = shallowRef([
        { id: 1, name: 'Alice', age: 25 },
        { id: 2, name: 'Bob', age: 17 },
        { id: 3, name: 'Charlie', age: 30 },
      ]);
      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });
      const result = useTestHook(dataSource);

      const adults = computed(() => result.value.filter((item) => item.age >= 18));

      expect(adults.value.map((u) => u.name)).toEqual(['Alice', 'Charlie']);

      // Change age to make Bob an adult - should trigger
      dataSource.value = [
        { id: 1, name: 'Alice', age: 25 },
        { id: 2, name: 'Bob', age: 18 },
        { id: 3, name: 'Charlie', age: 30 },
      ];
      hookManager.processHookAt(0);
      await nextTick();

      expect(adults.value.map((u) => u.name)).toEqual(['Alice', 'Bob', 'Charlie']);

      // Remove item - should trigger
      dataSource.value = [
        { id: 1, name: 'Alice', age: 25 },
        { id: 2, name: 'Bob', age: 18 },
      ];
      hookManager.processHookAt(0);
      await nextTick();

      expect(adults.value.map((u) => u.name)).toEqual(['Alice', 'Bob']);
    });
  });

  describe('Array.prototype.find with nested access', () => {
    it('should track both iteration and nested properties', async () => {
      const dataSource = ref([
        { id: 1, name: 'Alice', status: 'active' },
        { id: 2, name: 'Bob', status: 'inactive' },
        { id: 3, name: 'Charlie', status: 'active' },
      ]);
      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });
      const result = useTestHook(dataSource);

      const activeUser = computed(() => result.value.find((item) => item.status === 'active'));

      expect(activeUser.value?.name).toBe('Alice');

      // Change Alice's status - should trigger
      dataSource.value = [
        { id: 1, name: 'Alice', status: 'inactive' },
        { id: 2, name: 'Bob', status: 'inactive' },
        { id: 3, name: 'Charlie', status: 'active' },
      ];
      hookManager.processHookAt(0);
      await nextTick();

      expect(activeUser.value?.name).toBe('Charlie');
    });
  });

  describe('Array.prototype.some/every with nested access', () => {
    it('should track both iteration and nested properties', async () => {
      const dataSource = ref([
        { id: 1, completed: true },
        { id: 2, completed: false },
        { id: 3, completed: true },
      ]);
      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });
      const result = useTestHook(dataSource);

      const hasIncomplete = computed(() => result.value.some((item) => !item.completed));
      const allComplete = computed(() => result.value.every((item) => item.completed));

      expect(hasIncomplete.value).toBe(true);
      expect(allComplete.value).toBe(false);

      // Complete all items - should trigger
      dataSource.value = [
        { id: 1, completed: true },
        { id: 2, completed: true },
        { id: 3, completed: true },
      ];
      hookManager.processHookAt(0);
      await nextTick();

      expect(hasIncomplete.value).toBe(false);
      expect(allComplete.value).toBe(true);
    });
  });

  describe('Array.prototype.reduce with nested access', () => {
    it('should track both iteration and nested properties', async () => {
      const dataSource = ref([
        { id: 1, price: 10, quantity: 2 },
        { id: 2, price: 5, quantity: 3 },
        { id: 3, price: 8, quantity: 1 },
      ]);
      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });
      const result = useTestHook(dataSource);

      const total = computed(() => result.value.reduce((sum, item) => sum + item.price * item.quantity, 0));

      expect(total.value).toBe(43); // (10*2) + (5*3) + (8*1)

      // Change quantity - should trigger
      dataSource.value = [
        { id: 1, price: 10, quantity: 3 }, // Changed
        { id: 2, price: 5, quantity: 3 },
        { id: 3, price: 8, quantity: 1 },
      ];
      hookManager.processHookAt(0);
      await nextTick();

      expect(total.value).toBe(53); // (10*3) + (5*3) + (8*1)
    });
  });

  describe('Object.keys/values/entries with nested access', () => {
    it('Object.keys should track structure changes', async () => {
      const dataSource = shallowRef({
        data: {
          user1: { name: 'Alice' },
          user2: { name: 'Bob' },
        },
      });
      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook);
      const result = useTestHook(dataSource);

      const fn = vi.fn();
      let keys;

      watchEffect(() => {
        keys = Object.keys(result.data.value);
        fn();
      });

      expect(fn).toHaveBeenCalledTimes(1);
      expect(keys).toEqual(['user1', 'user2']);

      // Add key - should trigger
      dataSource.value = {
        data: {
          user1: { name: 'Alice' },
          user2: { name: 'Bob' },
          user3: { name: 'Charlie' },
        },
      };
      hookManager.processHookAt(0);
      await nextTick();

      expect(fn).toHaveBeenCalledTimes(2);
      expect(keys).toEqual(['user1', 'user2', 'user3']);

      // Change nested value (keys unchanged) - should NOT trigger
      dataSource.value = {
        data: {
          user1: { name: 'Alicia' },
          user2: { name: 'Bobby' },
          user3: { name: 'Charles' },
        },
      };
      hookManager.processHookAt(0);
      await nextTick();

      expect(fn).toHaveBeenCalledTimes(2); // Should NOT retrigger
    });

    it('Object.values with nested access should track both', async () => {
      const dataSource = ref({
        data: {
          user1: { name: 'Alice', age: 25 },
          user2: { name: 'Bob', age: 30 },
        },
      });
      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook);
      const result = useTestHook(dataSource);

      const names = computed(() => Object.values(result.data.value).map((user) => user.name));

      expect(names.value).toEqual(['Alice', 'Bob']);

      // Change nested property - should trigger
      dataSource.value = {
        data: {
          user1: { name: 'Alicia', age: 25 },
          user2: { name: 'Bob', age: 30 },
        },
      };
      hookManager.processHookAt(0);
      await nextTick();

      expect(names.value).toEqual(['Alicia', 'Bob']);

      // Add entry - should trigger
      dataSource.value = {
        data: {
          user1: { name: 'Alicia', age: 25 },
          user2: { name: 'Bob', age: 30 },
          user3: { name: 'Charlie', age: 35 },
        },
      };
      hookManager.processHookAt(0);
      await nextTick();

      expect(names.value).toEqual(['Alicia', 'Bob', 'Charlie']);
    });

    it('Object.entries with nested access should track both', async () => {
      const dataSource = ref({
        data: {
          alice: { score: 100 },
          bob: { score: 85 },
        },
      });
      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook);
      const result = useTestHook(dataSource);

      const leaderboard = computed(() =>
        Object.entries(result.data.value).map(([name, data]) => ({
          name,
          score: data.score,
        })),
      );

      expect(leaderboard.value).toEqual([
        { name: 'alice', score: 100 },
        { name: 'bob', score: 85 },
      ]);

      // Change score - should trigger
      dataSource.value = {
        data: {
          alice: { score: 95 },
          bob: { score: 90 },
        },
      };
      hookManager.processHookAt(0);
      await nextTick();

      expect(leaderboard.value).toEqual([
        { name: 'alice', score: 95 },
        { name: 'bob', score: 90 },
      ]);
    });
  });

  describe('Spread operator', () => {
    it('array spread should track structure and nested access', async () => {
      const dataSource = ref([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });
      const result = useTestHook(dataSource);

      const fn = vi.fn();
      let spread;

      watchEffect(() => {
        spread = [...result.value];
        fn();
      });

      expect(fn).toHaveBeenCalledTimes(1);
      expect(spread.length).toBe(2);

      // Add item - should trigger
      dataSource.value = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ];
      hookManager.processHookAt(0);
      await nextTick();

      expect(fn).toHaveBeenCalledTimes(2);
      expect(spread.length).toBe(3);
    });

    it('object spread should track structure changes', async () => {
      const dataSource = ref({
        data: {
          user1: { name: 'Alice' },
          user2: { name: 'Bob' },
        },
      });
      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook);
      const result = useTestHook(dataSource);

      const fn = vi.fn();
      let spread;

      watchEffect(() => {
        spread = { ...result.data.value };
        fn();
      });

      expect(fn).toHaveBeenCalledTimes(1);
      expect(Object.keys(spread)).toEqual(['user1', 'user2']);

      // Add key - should trigger
      dataSource.value = {
        data: {
          user1: { name: 'Alice' },
          user2: { name: 'Bob' },
          user3: { name: 'Charlie' },
        },
      };
      hookManager.processHookAt(0);
      await nextTick();

      expect(fn).toHaveBeenCalledTimes(2);
      expect(Object.keys(spread)).toEqual(['user1', 'user2', 'user3']);
    });
  });

  describe('Deeply nested iterations', () => {
    it('should track nested iterations with property access', async () => {
      const dataSource = ref([
        {
          category: 'Fruits',
          items: [
            { name: 'Apple', price: 1 },
            { name: 'Banana', price: 2 },
          ],
        },
        {
          category: 'Vegetables',
          items: [{ name: 'Carrot', price: 1.5 }],
        },
      ]);
      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });
      const result = useTestHook(dataSource);

      const allItems = computed(() => {
        const items = [];
        for (const category of result.value) {
          for (const item of category.items) {
            items.push(item.name);
          }
        }
        return items;
      });

      expect(allItems.value).toEqual(['Apple', 'Banana', 'Carrot']);

      // Change nested item name - should trigger
      dataSource.value = [
        {
          category: 'Fruits',
          items: [
            { name: 'Green Apple', price: 1 }, // Changed
            { name: 'Banana', price: 2 },
          ],
        },
        {
          category: 'Vegetables',
          items: [{ name: 'Carrot', price: 1.5 }],
        },
      ];
      hookManager.processHookAt(0);
      await nextTick();

      expect(allItems.value).toEqual(['Green Apple', 'Banana', 'Carrot']);

      // Add nested item - should trigger
      dataSource.value = [
        {
          category: 'Fruits',
          items: [
            { name: 'Green Apple', price: 1 },
            { name: 'Banana', price: 2 },
            { name: 'Orange', price: 1.5 }, // Added
          ],
        },
        {
          category: 'Vegetables',
          items: [{ name: 'Carrot', price: 1.5 }],
        },
      ];
      hookManager.processHookAt(0);
      await nextTick();

      expect(allItems.value).toEqual(['Green Apple', 'Banana', 'Orange', 'Carrot']);
    });
  });

  describe('Mixed iteration and direct access', () => {
    it('should track both iteration and direct index access independently', async () => {
      const dataSource = ref([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ]);
      const mockHook = vi.fn((source) => source);
      const useTestHook = toUnisonHook(mockHook, { tracking: t.ref() });
      const result = useTestHook(dataSource);

      const fn1 = vi.fn();
      const fn2 = vi.fn();

      // Effect 1: Iterate over all
      watchEffect(() => {
        result.value.forEach((item) => item.name);
        fn1();
      });

      // Effect 2: Direct access to first item
      watchEffect(() => {
        result.value[0].name;
        fn2();
      });

      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);

      // Change first item - should trigger both
      dataSource.value = [
        { id: 1, name: 'Alicia' }, // Changed
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ];
      hookManager.processHookAt(0);
      await nextTick();

      expect(fn1).toHaveBeenCalledTimes(2);
      expect(fn2).toHaveBeenCalledTimes(2);

      // Change third item - should trigger only iteration effect
      dataSource.value = [
        { id: 1, name: 'Alicia' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charles' }, // Changed
      ];
      hookManager.processHookAt(0);
      await nextTick();

      expect(fn1).toHaveBeenCalledTimes(3);
      expect(fn2).toHaveBeenCalledTimes(2); // Should NOT retrigger

      // Add item - should trigger only iteration effect
      dataSource.value = [
        { id: 1, name: 'Alicia' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charles' },
        { id: 4, name: 'David' }, // Added
      ];
      hookManager.processHookAt(0);
      await nextTick();

      expect(fn1).toHaveBeenCalledTimes(4);
      expect(fn2).toHaveBeenCalledTimes(2); // Should NOT retrigger
    });
  });
});
