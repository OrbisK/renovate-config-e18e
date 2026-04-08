import { defineConfig } from 'bumpp'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'

export default defineConfig({
    commit: 'release: %s',
    tag: '%s',
    push: true,
    all: true,
    execute(config) {
        const newVersion = config.state.newVersion
        const pattern = /(OrbisK\/renovate-config-e18e[^#]*#)[^\s"]+/g
        const files = [
            ...readdirSync('.').filter(f => f.endsWith('.json') && f !== 'package.json'),
            'README.md',
        ]
        for (const file of files) {
            const content = readFileSync(file, 'utf-8')
            const updated = content.replace(pattern, `$1${newVersion}`)
            if (updated !== content) {
                writeFileSync(file, updated)
            }
        }
    },
})
