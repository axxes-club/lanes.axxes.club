import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const tool = (name: string) => require.resolve(name, { paths: [process.cwd(), `${process.cwd()}/.superpowers/tooling`] })
export default {
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)), 'server-only': fileURLToPath(new URL('./tests/server-only.ts', import.meta.url)), 'vitest': tool('vitest/package.json').replace('package.json', 'dist/index.js'), '@testing-library/react': tool('@testing-library/react') } },
  test: { environment: 'node', include: ['tests/**/*.test.{ts,tsx}'] },
}
