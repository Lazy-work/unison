/** @import { Listener } from './types.js' */

/**
 * @type {(Listener | null)}
 */
export let currentListener = null;

/**
 *
 * @export
 * @returns {Listener}
 */
export function createListener() {
  return {};
}

/**
 *
 * @export
 * @returns {(Listener | null)}
 */
export function getCurrentListener() {
  return currentListener;
}

/**
 *
 * @export
 * @param {Listener} listener
 * @returns {() => void}
 */
export function setCurrentListener(listener) {
  const prev = currentListener;
  currentListener = listener;
  return () => {
    currentListener = prev;
  };
}
