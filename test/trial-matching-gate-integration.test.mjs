import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

test('new projects generate and run the trial matching contract by default', () => {
  const init = readFileSync(new URL('../scripts/init.mjs', import.meta.url), 'utf8')
  assert.match(init, /plan\.set\('scripts\/check-trial-matching\.mjs'/)
  assert.match(init, /node scripts\/check-trial-matching\.mjs \./)
  const output = execFileSync(process.execPath, [new URL('../templates/check-trial-matching.mjs', import.meta.url).pathname, '--self-test'], { encoding: 'utf8' })
  assert.match(output, /self-test 11\/11/)
})
