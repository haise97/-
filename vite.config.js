import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: projectRoot,
  base: './',
  cacheDir: `${projectRoot}/node_modules/.vite-local`,
  server: {
    host: '0.0.0.0',
    fs: {
      strict: true,
      allow: [projectRoot],
    },
  },
  test: {
    environment: 'node',
    exclude: ['node_modules/**', 'dist/**', '99_codex_work_artifacts/**'],
  },
})
