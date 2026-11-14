/**
 * Build the client half into the one artifact DSH loads.
 *
 * The host does not import your source. It serves `lib/client.js` and the
 * browser executes it; the file must therefore call
 * `window.__ModuleLoader__.load({ id, factory })` and use the `require` the
 * loader injects for shared modules. The banner/intro/footer below are the
 * same three pieces the first-party tsdown preset emits.
 */
import { build } from 'esbuild'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

const banner = [
  `window.__ModuleLoader__.load({ id: ${JSON.stringify(pkg.name)}, factory: (require) => {`,
  'var module = { exports: {} }; var exports = module.exports;',
].join('\n')

const footer = 'return module.exports; } });'

await build({
  entryPoints: ['src/client/index.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  outfile: 'lib/client.js',
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    '@deepseek-ai/cordis',
    '@deepseek-ai/dsh-client-ui-slots',
    '@deepseek-ai/dsh-client-ui-primitives',
  ],
  banner: { js: banner },
  footer: { js: footer },
  sourcemap: true,
  logLevel: 'info',
})

const artifact = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
if (!artifact.startsWith('window.__ModuleLoader__.load')) {
  throw new Error('lib/client.js is missing the __ModuleLoader__ wrapper')
}
process.stdout.write('lib/client.js ready\n')
