import { App } from './apiCreateApp';
import { onUnmounted, $unison } from '@unisonjs/core';

export const AppProvider = $unison<{ app: App; children: React.ReactNode }>((props) => {
  onUnmounted(() => {
    props.app.unmount();
  });
  return () => props.children;
}, 'AppProvider');
