import { createRollupPlugin } from 'unplugin'
import { unpluginFactory } from '.'
import { Options } from './types';

export const unisonVue = createRollupPlugin((options: Options | undefined = {}, meta) =>
  unpluginFactory(
    {
      ...options,
      module: options?.module ?? "@unisonjs/vue",
      signals: options?.signals ?? [
        "ref",
        "shallowRef",
        "reactive",
        "shallowReactive",
        "readonly",
      ],
    },
    meta
  )
);
export default createRollupPlugin(unpluginFactory)
