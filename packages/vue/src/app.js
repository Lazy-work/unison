/** @import { App } from './types.js' */
import { onUnmounted, $bridge } from './index.js';

/**
 * @type {import("react").ForwardRefExoticComponent<{ app: App; children: React.ReactNode;}>}
 */
export const AppProvider = $bridge((props) => {
  onUnmounted(() => {
    props.app.unmount();
  });
  return () => props.children;
}, 'AppProvider');
