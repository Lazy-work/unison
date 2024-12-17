import { onUnmounted, $bridge } from '../index';
export const AppProvider = $bridge((props) => {
    onUnmounted(() => {
        props.app.unmount();
    });
    return () => props.children;
}, "AppProvider");
