/** @import { Component, Data } from '#vue-internals/runtime-core/component' */
/** @import { App, AppContext, Plugin } from './types' */
/** @import { ComponentOptions } from '#vue-internals/runtime-core/componentOptions' */
/** @import { Directive } from '#vue-internals/runtime-core/directives' */
/** @import { Directive } from '#vue-internals/runtime-core/directives' */
import {
  validateComponentName,
} from '#vue-internals/runtime-core/component'
import { validateDirectiveName } from '#vue-internals/runtime-core/directives'
import { warn } from '#vue-internals/runtime-core/warning'
import { NO, isFunction } from '#vue/shared'
import { version } from '.'
import { ErrorCodes, callWithAsyncErrorHandling } from '#vue-internals/runtime-core/errorHandling'

/**
 * 
 * @returns {AppContext}
 */
export function createAppContext() {
  return {
    app: null,
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

let uid = 0

/** @type {AppContext | null} */
export let currentAppContext = null;

export function createApp() {
  const context = createAppContext()
  const installedPlugins = new WeakSet()

  /** @type {Array<() => any>} */
  const pluginCleanupFns = []

  currentAppContext = context;

  /** @type {App} */
  const app = (context.app = {
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
      if (!!(process.env.NODE_ENV !== 'production')) {
        warn(
          `app.config cannot be replaced. Modify individual options instead.`,
        )
      }
    },

    /**
     * 
     * @param {Plugin} plugin 
     * @param {any[]} options 
     * @returns 
     */
    use(plugin, ...options) {
      if (installedPlugins.has(plugin)) {
        !!(process.env.NODE_ENV !== 'production') && warn(`Plugin has already been applied to target app.`)
      } else if (plugin && isFunction(plugin.install)) {
        installedPlugins.add(plugin)
        plugin.install(app, ...options)
      } else if (isFunction(plugin)) {
        installedPlugins.add(plugin)
        plugin(app, ...options)
      } else if (!!(process.env.NODE_ENV !== 'production')) {
        warn(
          `A plugin must either be a function or an object with an "install" ` +
          `function.`,
        )
      }
      return app
    },

    /**
     * @param {ComponentOptions} mixin
     * 
     */
    mixin(mixin) {
      if (!!(process.env.NODE_ENV !== 'production')) {
        warn('Mixins are only available in builds supporting Options API')
      }
      return app
    },

    /**
     * 
     * @param {string} name 
     * @param {Component} [component] 
     * @returns any
     */
    component(name, component) {
      if (!!(process.env.NODE_ENV !== 'production')) {
        validateComponentName(name, context.config)
      }
      if (!component) {
        return context.components[name]
      }
      if (!!(process.env.NODE_ENV !== 'production') && context.components[name]) {
        warn(`Component "${name}" has already been registered in target app.`)
      }
      context.components[name] = component
      return app
    },


    /**
     * 
     * @param {string} name 
     * @param {Directive} [component] 
     * @returns 
     */
    directive(name, directive) {
      if (!!(process.env.NODE_ENV !== 'production')) {
        validateDirectiveName(name)
      }

      if (!directive) {
        return context.directives[name]
      }
      if (!!(process.env.NODE_ENV !== 'production') && context.directives[name]) {
        warn(`Directive "${name}" has already been registered in target app.`)
      }
      context.directives[name] = directive
      return app
    },

    mount() {
      if (!!(process.env.NODE_ENV !== 'production')) {
        warn(
          `App has already been mounted.\n` +
          `If you want to remount the same app, move your app creation logic ` +
          `into a factory function and create fresh app instances for each ` +
          `mount - e.g. \`const createMyApp = () => createApp(App)\``,
        )
      }
    },

    /**
     * 
     * @param {() => void} cleanupFn 
     */
    onUnmount(cleanupFn) {
      if (!!(process.env.NODE_ENV !== 'production') && typeof cleanupFn !== 'function') {
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
      if (!!(process.env.NODE_ENV !== 'production') && key in context.provides) {
        warn(
          `App already provides property with key "${String(key)}". ` +
          `It will be overwritten with the new value.`,
        )
      }

      context.provides[key] = value

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
 * @type {App<unknown> | null}
 */
export let currentApp = null
