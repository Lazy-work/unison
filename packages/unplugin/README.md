# unplugin-unisonjs

[![NPM version](https://img.shields.io/npm/v/unplugin-unisonjs?color=a1b858&label=)](https://www.npmjs.com/package/unplugin-unisonjs)

unisonjs template for [unplugin](https://github.com/unjs/unplugin).

## Template Usage

To use this template, clone it down using:

```bash
npx degit unplugin/unplugin-unisonjsjs my-unplugin
```

And do a global replacement of `unplugin-unisonjs` with your plugin name.

Then you can start developing your unplugin 🔥

To test your plugin, run: `pnpm run dev`
To release a new version, run: `pnpm run release`

## Install

```bash
npm i unplugin-unisonjs
```

<details>
<summary>Vite</summary><br>

```ts
// vite.config.ts
import unisonjs from 'unplugin-unisonjs/vite'

export default defineConfig({
  plugins: [
    unisonjs({ /* options */ }),
  ],
})
```

Example: [`playground/`](./playground/)

<br></details>

<details>
<summary>Rollup</summary><br>

```ts
// rollup.config.js
import unisonjs from 'unplugin-unisonjs/rollup'

export default {
  plugins: [
    unisonjs({ /* options */ }),
  ],
}
```

<br></details>

<details>
<summary>Webpack</summary><br>

```ts
// webpack.config.js
module.exports = {
  /* ... */
  plugins: [
    require('unplugin-unisonjs/webpack')({ /* options */ })
  ]
}
```

<br></details>

<details>
<summary>Nuxt</summary><br>

> This module works for both Nuxt 2 and [Nuxt Vite](https://github.com/nuxt/vite)

<br></details>

<details>
<summary>Vue CLI</summary><br>

```ts
// vue.config.js
module.exports = {
  configureWebpack: {
    plugins: [
      require('unplugin-unisonjs/webpack')({ /* options */ }),
    ],
  },
}
```

<br></details>

<details>
<summary>esbuild</summary><br>

```ts
// esbuild.config.js
import { build } from 'esbuild'
import unisonjs from 'unplugin-unisonjs/esbuild'

build({
  plugins: [unisonjs()],
})
```

<br></details>
