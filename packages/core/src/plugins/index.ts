import type { ComponentInternalInstance } from '../index';

type ClassType<I> = abstract new (...args: any) => I

export type UnisonPluginClass = ClassType<UnisonPlugin>;

export interface UnisonPlugin {
    onInstanceCreated(instance: ComponentInternalInstance): void
    onInstanceDisposed(instance: ComponentInternalInstance): void
}
