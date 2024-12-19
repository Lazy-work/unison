
/**
 *
 * @param {string} msg
 * @param {...any[]} args
 */
export function warn(msg, ...args) {
  console.warn(`[Vue warn] ${msg}`, ...args)
}
