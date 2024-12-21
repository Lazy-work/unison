import type { Options } from 'tsup'

export default <Options>{
  entry: [
    'src/*.ts',
  ],
  clean: true,
  format: ['esm'],
  dts: true,
  splitting: false,
  onSuccess: "sh replace_constants.sh"
}
