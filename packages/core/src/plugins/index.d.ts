import type { ComponentInternalInstance } from '../index';

type ClassType<I> = abstract new (...args: any) => I

export type BridgePluginClass = ClassType<BridgePlugin>;

export interface BridgePlugin {
    onInstanceCreated(instance: ComponentInternalInstance): void
    onInstanceDisposed(instance: ComponentInternalInstance): void
}
