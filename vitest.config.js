import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Ensure the test environment is explicitly set to Node.js
    environment: 'node',
  },
});