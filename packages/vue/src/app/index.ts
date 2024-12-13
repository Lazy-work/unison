import { App } from '../apiCreateApp';
import { onUnmounted, $bridge } from '../index';

export const AppProvider = $bridge<{ app: App; children: React.ReactNode }>((props) => {
  onUnmounted(() => {
    props.app.unmount();
  });

  return () => props.children;
}, "AppProvider");
