import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
const local = 'node_modules/vitest/vitest.mjs'
const isolated = '.superpowers/tooling/node_modules/vitest/vitest.mjs'
const tool = existsSync(local) ? local : isolated
if (!existsSync(tool)) {
  console.error('Install development dependencies, or run npm install --prefix .superpowers/tooling vitest@3 @testing-library/react @testing-library/dom jsdom@26 tsx --legacy-peer-deps')
  process.exit(1)
}
process.exit(spawnSync(process.execPath, [tool, 'run', ...process.argv.slice(2)], { stdio: 'inherit' }).status ?? 1)
