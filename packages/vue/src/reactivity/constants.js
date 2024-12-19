// using literal strings instead of numbers so that it's easier to inspect
// debugger events

export const TrackOpTypes = /** @type {const} */ ({
  GET: 'get',
  HAS: 'has',
  ITERATE: 'iterate',
});

export const TriggerOpTypes = /** @type {const} */ ({
  SET: 'set',
  ADD: 'add',
  DELETE: 'delete',
  CLEAR: 'clear',
});

export const ReactiveFlags = /** @type {const} */ ({
  SKIP: '__v_skip',
  IS_REACTIVE: '__v_isReactive',
  IS_READONLY: '__v_isReadonly',
  IS_SHALLOW: '__v_isShallow',
  RAW: '__v_raw',
  IS_REF: '__v_isRef',
});
