import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [svelte()],
  publicDir: 'source',
  base: '',
  define: {
    // Injeta a versão do package.json como constante de build.
    // Acessível via APP_VERSION em constants.js. Fonte única de verdade.
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/lib/__tests__/**/*.test.js'],
  },
});
