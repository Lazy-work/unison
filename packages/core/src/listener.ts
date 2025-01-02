export interface Listener {
  trigger?: (value?: any, oldValue?: any) => void;
  clean?: () => void;
  cleanups?: (() => void)[];
}

export let currentListener: Listener | null = null;

export function createListener() {
  return {} as Listener;
}

export function getCurrentListener() {
  return currentListener;
}


export function setCurrentListener(listener: Listener) {
  const prev = currentListener;
  currentListener = listener;
  return () => {
    currentListener = prev;
  };
}
