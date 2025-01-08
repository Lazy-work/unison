#!/bin/bash

find ./dist -type f \( -name "*.js" -o -name "*.cjs" \) -print0 | xargs -0 sed -i \
  -e "s/__DEV__/!!(process.env.NODE_ENV !== 'production')/g" \
  -e "s/__TEST__/false/g" \
  -e "s/__BROWSER__/false/g" \
  -e "s/__GLOBAL__/false/g" \
  -e "s/__ESM_BUNDLER__/true/g" \
  -e "s/__ESM_BROWSER__/false/g" \
  -e "s/__CJS__/false/g" \
  -e "s/__SSR__/false/g" \
  -e "s/__COMMIT__/undefined/g" \
  -e "s/__VERSION__/3.5/g" \
  -e "s/__COMPAT__/false/g" \
  -e "s/__FEATURE_OPTIONS_API__/false/g" \
  -e "s/__FEATURE_PROD_DEVTOOLS__/false/g" \
  -e "s/__FEATURE_SUSPENSE__/false/g" \
  -e "s/__FEATURE_PROD_HYDRATION_MISMATCH_DETAILS__/false/g"