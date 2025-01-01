import type { HookManager } from './index';

declare class HookCallableSignal<Parameters extends any[], ReturnType> {
  #private;
  constructor(manager: HookManager, hookIndex: number, valueIndex: number);
  call(...args: Parameters): ReturnType;
  track(): void;
  trigger(): void;
}

export default HookCallableSignal;
