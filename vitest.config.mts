import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const tool = (name: string) => require.resolve(name, { paths: [process.cwd(), `${process.cwd()}/.superpowers/tooling`, `${process.cwd()}/.superpowers/sql`] })
export default {
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)), 'server-only': fileURLToPath(new URL('./tests/server-only.ts', import.meta.url)), 'vitest': tool('vitest/package.json').replace('package.json', 'dist/index.js'), '@testing-library/react': tool('@testing-library/react'), '@electric-sql/pglite': tool('@electric-sql/pglite').replace(/\.cjs$/, '.js') } },
  test: { testTimeout: 30000, hookTimeout: 30000, maxWorkers: 2, environment: 'node', include: ['tests/**/*.test.{ts,tsx}'], exclude: ['tests/platform-access/**'] },
}
