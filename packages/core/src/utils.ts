import * as React from 'react';
import { getCurrentInstance } from './index.js';

export function isReactComponent() {
  const fiber = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner.current;
  return !!fiber;
}

export function mustBeUnisonComponent() {
  if (!!(process.env.NODE_ENV !== 'production') && isReactComponent() && !getCurrentInstance()) {
    throw new Error('Cannot use inside a none reactive component');
  }
}
