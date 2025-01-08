# [Unison.js](https://unisonjs.netlify.app/)

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Lazy-work/reactive-vue/blob/main/LICENSE)

Unison.js is a framework that facilitates seamless deep signal integration within React while maintaining compatibility with other popular frameworks like Vue and Solid.

[Full documentation](https://unisonjs.netlify.app/).

## Why this library ?

Please read the explanation at : [Why ?](https://unisonjs.netlify.app/guide/)

## Example (Vue API)

```jsx
import { ref } from "@unisonjs/vue";

function Counter() {
  const count = ref(0);

  setInterval(() => count.value++, 1000);

  return (
    <div>
      <p>Count: {count.value}</p>
    </div>
  );
}
```

This is an example of a counter that increments every second.

## Contributing

Currently, pull request are not accepted but you can fill a issue to report a bug or request a feature.

## License

[MIT](https://opensource.org/licenses/MIT)

Copyright (c) 2024, William (Abdullah) NGBAMA

## Credits

The Unison.js project is powered by:
[React](https://react.dev/), created by [Facebook](https://github.com/facebook3)
[Vue](https://vuejs.org/), created by [Evan You](https://github.com/yyx990803)
