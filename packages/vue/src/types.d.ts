import {
    type ComponentInternalInstance,
    type ConcreteComponent,
    type Data
} from '#vue-internals/runtime-core/component'
import type {
    MergedComponentOptions,
    RuntimeCompilerOptions,
} from '#vue-internals/runtime-core/componentOptions'
import type {
    ComponentCustomProperties,
    ComponentPublicInstance,
} from '#vue-internals/runtime-core/componentPublicInstance'
import type { ElementNamespace } from '#vue-internals/runtime-core/renderer'
import type { InjectionKey } from '#vue-internals/runtime-core/apiInject'
import { type VNode } from '#vue-internals/runtime-core/vnode'
import type { NormalizedPropsOptions } from '#vue-internals/runtime-core/componentProps'
import type { ObjectEmitsOptions } from '#vue-internals/runtime-core/componentEmits'
import type { DefineComponent } from '#vue-internals/runtime-core/apiDefineComponent'

export interface App<HostElement = any> {
    version: string
    config: AppConfig

    use<Options extends unknown[]>(
        plugin: Plugin<Options>,
        ...options: Options
    ): this
    use<Options>(plugin: Plugin<Options>, options: Options): this

    mixin(mixin: ComponentOptions): this
    component(name: string): Component | undefined
    component<T extends Component | DefineComponent>(
        name: string,
        component: T,
    ): this
    directive<T = any, V = any>(name: string): Directive<T, V> | undefined
    directive<T = any, V = any>(name: string, directive: Directive<T, V>): this
    mount(
        rootContainer: HostElement | string,
        /**
         * @internal
         */
        isHydrate?: boolean,
        /**
         * @internal
         */
        namespace?: boolean | ElementNamespace,
        /**
         * @internal
         */
        vnode?: VNode,
    ): ComponentPublicInstance
    unmount(): void
    onUnmount(cb: () => void): void
    provide<T, K = InjectionKey<T> | string | number>(
        key: K,
        value: K extends InjectionKey<infer V> ? V : T,
    ): this

    /**
     * Runs a function with the app as active instance. This allows using of `inject()` within the function to get access
     * to variables provided via `app.provide()`.
     *
     * @param fn - function to run with the app as active instance
     */
    runWithContext<T>(fn: () => T): T

    // internal, but we need to expose these for the server-renderer and devtools
    _uid: number
    _component: ConcreteComponent | null
    _props: Data | null
    _container: HostElement | null
    _context: AppContext
    _instance: ComponentInternalInstance | null

    /**
     * @internal custom element vnode
     */
    _ceVNode?: VNode

    /**
     * v2 compat only
     */
    filter?(name: string): Function | undefined
    filter?(name: string, filter: Function): this

    /**
     * @internal v3 compat only
     */
    _createRoot?(options: ComponentOptions): ComponentPublicInstance
}

export type OptionMergeFunction = (to: unknown, from: unknown) => any

export interface AppConfig {
    // @private
    readonly isNativeTag: (tag: string) => boolean

    performance: boolean
    optionMergeStrategies: Record<string, OptionMergeFunction>
    globalProperties: ComponentCustomProperties & Record<string, any>
    errorHandler?: (
        err: unknown,
        instance: ComponentPublicInstance | null,
        info: string,
    ) => void
    warnHandler?: (
        msg: string,
        instance: ComponentPublicInstance | null,
        trace: string,
    ) => void

    /**
     * Options to pass to `@vue/compiler-dom`.
     * Only supported in runtime compiler build.
     */
    compilerOptions: RuntimeCompilerOptions

    /**
     * @deprecated use config.compilerOptions.isCustomElement
     */
    isCustomElement?: (tag: string) => boolean

    /**
     * TODO document for 3.5
     * Enable warnings for computed getters that recursively trigger itself.
     */
    warnRecursiveComputed?: boolean

    /**
     * Whether to throw unhandled errors in production.
     * Default is `false` to avoid crashing on any error (and only logs it)
     * But in some cases, e.g. SSR, throwing might be more desirable.
     */
    throwUnhandledErrorInProduction?: boolean

    /**
     * Prefix for all useId() calls within this app
     */
    idPrefix?: string
}

export interface AppContext {
    app: App // for devtools
    config: AppConfig
    mixins: ComponentOptions[]
    components: Record<string, Component>
    directives: Record<string, Directive>
    provides: Record<string | symbol, any>

    /**
     * Cache for merged/normalized component options
     * Each app instance has its own cache because app-level global mixins and
     * optionMergeStrategies can affect merge behavior.
     * @internal
     */
    optionsCache: WeakMap<ComponentOptions, MergedComponentOptions>
    /**
     * Cache for normalized props options
     * @internal
     */
    propsCache: WeakMap<ConcreteComponent, NormalizedPropsOptions>
    /**
     * Cache for normalized emits options
     * @internal
     */
    emitsCache: WeakMap<ConcreteComponent, ObjectEmitsOptions | null>
    /**
     * HMR only
     * @internal
     */
    reload?: () => void
    /**
     * v2 compat only
     * @internal
     */
    filters?: Record<string, Function>
}

type PluginInstallFunction<Options = any[]> = Options extends unknown[]
    ? (app: App, ...options: Options) => any
    : (app: App, options: Options) => any

export type ObjectPlugin<Options = any[]> = {
    install: PluginInstallFunction<Options>
}
export type FunctionPlugin<Options = any[]> = PluginInstallFunction<Options> &
    Partial<ObjectPlugin<Options>>

export type Plugin<Options = any[]> =
    | FunctionPlugin<Options>
    | ObjectPlugin<Options>

export type CreateAppFunction<HostElement> = (
    rootComponent: Component,
    rootProps?: Data | null,
) => App<HostElement>
