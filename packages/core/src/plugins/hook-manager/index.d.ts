import { type ComponentInternalInstance } from '../../index';
import { BridgePlugin } from '../index';
export declare abstract class BaseSignal<T> {
    abstract trigger(): void;
}
type BaseSignalConstructor<T> = new (...args: any[]) => BaseSignal<T>;
interface HookManagerOptions<T extends BaseSignalConstructor<any>> {
    signalClass: T;
    unsignal: (signal: any) => any;
}
export declare class HookManager implements BridgePlugin {
    #private;
    static options: HookManagerOptions<any>;
    constructor();
    get unsignal(): (signal: any) => any;
    get hookEffect(): any;
    onInstanceCreated(instance: ComponentInternalInstance): void;
    onInstanceDisposed(): void;
    getValueAt(index: number): any;
    addToStore(value: any): number;
    setStoreValueAt(index: number, value: any): void;
    get store(): any[];
    getStoreNextIndex(): number;
    processHook(hook: any): void;
    trackState<T>(hookIndex: number, value: T): BaseSignal<any> | ((...args: any[]) => any);
    trackStates<T extends object>(hookIndex: number, values: T): any[] | Record<string, any>;
    createTargets(paths: any): never[];
    addToHookStore(hookIndex: number, value: any): number;
    addHookStore(): number;
    registerHook(params: HookOptions): void;
    getHookValueAt(hookIndex: number, valueIndex: number): any;
}
export declare function toBridgeHook<T extends ReactHook>(hook: T, options?: BridgeHookOptions): (...params: any[]) => any;
export interface BridgeHookOptions {
    paths?: any | ((...args: any[]) => any);
    shallow?: boolean;
}
type ReactHook = (...args: any[]) => any;
export interface HookOptions {
    hook: ReactHook;
    index: number;
    params: any;
    options?: any;
    position?: number;
    shallow?: boolean;
    paths?: Function | any;
}
export {};
