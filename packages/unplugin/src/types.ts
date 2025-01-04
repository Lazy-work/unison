import type { TransformOptions } from '@babel/core'

interface CompilerOptions {
  mode: 'full' | 'directive' | 'manual'
}

export type BabelOptions = Omit<
  TransformOptions,
  | 'ast'
  | 'filename'
  | 'root'
  | 'sourceFileName'
  | 'sourceMaps'
  | 'inputSourceMap'
>

export interface Options {
  include?: string | RegExp | Array<string | RegExp>
  exclude?: string | RegExp | Array<string | RegExp>
  /**
 * Control where the JSX factory is imported from.
 * https://esbuild.github.io/api/#jsx-import-source
 * @default 'react'
 */
  jsxImportSource?: string
  /**
   * Note: Skipping React import with classic runtime is not supported from v4
   * @default "automatic"
   */
  jsxRuntime?: 'classic' | 'automatic'
  /**
   * Babel configuration applied in both dev and prod.
   */
  babel?:
  | BabelOptions
  | ((id: string, options: { ssr?: boolean }) => BabelOptions)
  compiler?: CompilerOptions | false
  fastRefresh?: boolean
  signals?: string[]
  module?: string
}
