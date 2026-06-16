import { existsSync, readFileSync } from 'node:fs'

const contentPath = 'dist/content.js'

if (!existsSync(contentPath)) {
  console.error('Missing dist/content.js. Run: npm run build')
  process.exit(1)
}

const content = readFileSync(contentPath, 'utf8').trimStart()

if (content.startsWith('import ') || content.startsWith('import{')) {
  console.error(
    'dist/content.js still uses ES module imports. Content scripts will fail with:',
    '"Cannot use import statement outside a module"',
  )
  process.exit(1)
}

if (!content.startsWith('var ') && !content.startsWith('(function')) {
  console.warn('dist/content.js has an unexpected format:', content.slice(0, 60))
}

console.log('dist/content.js looks valid for Chrome content scripts')
