export const runtimePublicPath = "/@react-refresh";

const sharedFooter = () => `
  const inWebWorker2 = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker2) {
  import.meta.hot.accept((nextExports) => {
    if (!nextExports) return;
    window.__UNISON_REFRESH__ = { root: null };
  });
}`

export function addRefreshWrapper(code: string): string {
  return code + sharedFooter();
}

export function addClassComponentRefreshWrapper(
  code: string,
): string {
  return code + sharedFooter();
}
