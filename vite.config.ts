import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root,
  base: './',
  plugins: [vue(), {
    name: 'sova-offline',
    apply: 'build',
    async writeBundle({ dir }, bundle) {
      if (!dir) return
      const outDir = resolve(root, dir)
      // Precache everything copied from public/ (favicons, manifest, app icons), skipping dotfiles and docs.
      const assets = (await readdir(resolve(root, 'public'))).filter(file => !file.startsWith('.') && !file.endsWith('.txt'))
      const files = [...new Set([...Object.keys(bundle), ...assets])].sort()
      const worker = await readFile(resolve(root, 'src/service-worker.js'), 'utf8')
      const hash = createHash('sha256').update(worker).update(JSON.stringify(files))
      for (const file of files) {
        hash.update(createHash('sha256').update(await readFile(resolve(outDir, file))).digest())
      }
      const build = { version: hash.digest('hex'), files }
      await writeFile(resolve(outDir, 'sw.js'), `const build = ${JSON.stringify(build)}\n${worker}`)
    },
  }],
  server: { host: true },
})
