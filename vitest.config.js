import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // This setting tells Vitest to process the `xlsx` package from source
    // instead of trying to use a pre-bundled version. This is often
    // necessary for packages with mixed CJS/ESM exports.
    deps: {
      inline: ['xlsx'],
    },
    // Ensure the test environment is explicitly set to Node.js
    environment: 'node',
  },
});