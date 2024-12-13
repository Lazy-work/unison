import {
  type Component,
  type ComponentInternalInstance,
  type ConcreteComponent,
  type Data,
  validateComponentName,
} from '@vue-internals/runtime-core/component'
import type {
  ComponentOptions,
  MergedComponentOptions,
  RuntimeCompilerOptions,
} from '@vue-internals/runtime-core/componentOptions'
import type {
  ComponentCustomProperties,
  ComponentPublicInstance,
} from '@vue-internals/runtime-core/componentPublicInstance'
import { type Directive, validateDirectiveName } from '@vue-internals/runtime-core/directives'
import type { ElementNamespace } from '@vue-internals/runtime-core/renderer'
import type { InjectionKey } from '@vue-internals/runtime-core/apiInject'
import { warn } from '@vue-internals/runtime-core/warning'
import { type VNode } from '@vue-internals/runtime-core/vnode'
import { NO, isFunction } from '@vue/shared'
import { version } from '.'
import type { NormalizedPropsOptions } from '@vue-internals/runtime-core/componentProps'
import type { ObjectEmitsOptions } from '@vue-internals/runtime-core/componentEmits'
import { ErrorCodes, callWithAsyncErrorHandling } from '@vue-internals/runtime-core/errorHandling'
import type { DefineComponent } from '@vue-internals/runtime-core/apiDefineComponent'

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

export function createAppContext(): AppContext {
  return {
    app: null as any,
    config: {
      isNativeTag: NO,
      performance: false,
      globalProperties: {},
      optionMergeStrategies: {},
      errorHandler: undefined,
      warnHandler: undefined,
      compilerOptions: {},
    },
    mixins: [],
    components: {},
    directives: {},
    provides: Object.create(null),
    optionsCache: new WeakMap(),
    propsCache: new WeakMap(),
    emitsCache: new WeakMap(),
  }
}

export type CreateAppFunction<HostElement> = (
  rootComponent: Component,
  rootProps?: Data | null,
) => App<HostElement>

let uid = 0

export let currentAppContext: AppContext | null = null;

export function createApp() {
  const context = createAppContext()
  const installedPlugins = new WeakSet()
  const pluginCleanupFns: Array<() => any> = []

  currentAppContext = context;
  const app: App = (context.app = {
    _uid: uid++,
    _component: null,
    _props: null,
    _container: null,
    _context: context,
    _instance: null,

    version,

    get config() {
      return context.config
    },

    set config(v) {
      if (__DEV__) {
        warn(
          `app.config cannot be replaced. Modify individual options instead.`,
        )
      }
    },

    use(plugin: Plugin, ...options: any[]) {
      if (installedPlugins.has(plugin)) {
        __DEV__ && warn(`Plugin has already been applied to target app.`)
      } else if (plugin && isFunction(plugin.install)) {
        installedPlugins.add(plugin)
        plugin.install(app, ...options)
      } else if (isFunction(plugin)) {
        installedPlugins.add(plugin)
        plugin(app, ...options)
      } else if (__DEV__) {
        warn(
          `A plugin must either be a function or an object with an "install" ` +
          `function.`,
        )
      }
      return app
    },

    mixin(mixin: ComponentOptions) {
      if (__FEATURE_OPTIONS_API__) {
        if (!context.mixins.includes(mixin)) {
          context.mixins.push(mixin)
        } else if (__DEV__) {
          warn(
            'Mixin has already been applied to target app' +
            (mixin.name ? `: ${mixin.name}` : ''),
          )
        }
      } else if (__DEV__) {
        warn('Mixins are only available in builds supporting Options API')
      }
      return app
    },

    component(name: string, component?: Component): any {
      if (__DEV__) {
        validateComponentName(name, context.config)
      }
      if (!component) {
        return context.components[name]
      }
      if (__DEV__ && context.components[name]) {
        warn(`Component "${name}" has already been registered in target app.`)
      }
      context.components[name] = component
      return app
    },

    directive(name: string, directive?: Directive) {
      if (__DEV__) {
        validateDirectiveName(name)
      }

      if (!directive) {
        return context.directives[name] as any
      }
      if (__DEV__ && context.directives[name]) {
        warn(`Directive "${name}" has already been registered in target app.`)
      }
      context.directives[name] = directive
      return app
    },

    mount(): any {
      if (__DEV__) {
        warn(
          `App has already been mounted.\n` +
          `If you want to remount the same app, move your app creation logic ` +
          `into a factory function and create fresh app instances for each ` +
          `mount - e.g. \`const createMyApp = () => createApp(App)\``,
        )
      }
    },

    onUnmount(cleanupFn: () => void) {
      if (__DEV__ && typeof cleanupFn !== 'function') {
        warn(
          `Expected function as first argument to app.onUnmount(), ` +
          `but got ${typeof cleanupFn}`,
        )
      }
      pluginCleanupFns.push(cleanupFn)
    },

    unmount() {
      callWithAsyncErrorHandling(
        pluginCleanupFns,
        app._instance,
        ErrorCodes.APP_UNMOUNT_CLEANUP,
      )
    },

    provide(key, value) {
      if (__DEV__ && (key as string | symbol) in context.provides) {
        warn(
          `App already provides property with key "${String(key)}". ` +
          `It will be overwritten with the new value.`,
        )
      }

      context.provides[key as string | symbol] = value

      return app
    },

    runWithContext(fn) {
      const lastApp = currentApp
      currentApp = app
      try {
        return fn()
      } finally {
        currentApp = lastApp
      }
    },
  })

  return app
}

/**
 * @internal Used to identify the current app when using `inject()` within
 * `app.runWithContext()`.
 */
export let currentApp: App<unknown> | null = null
