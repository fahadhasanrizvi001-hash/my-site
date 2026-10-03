import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile, copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

// The workspace provides TypeScript globally; use it to transpile the TSX source
// into a deployable ESM bundle without requiring a local node_modules directory.
const require = createRequire(import.meta.url);
const localTypeScript = 'node_modules/typescript/lib/typescript.js';
const globalTypeScript = '/root/.nvm/versions/node/v24.15.0/lib/node_modules/typescript/lib/typescript.js';
const ts = require(existsSync(localTypeScript) ? '../node_modules/typescript/lib/typescript.js' : globalTypeScript);
const source = await readFile('src/main.tsx', 'utf8');
const result = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
  fileName: 'main.tsx',
  reportDiagnostics: true,
});
const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
if (errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, { getCanonicalFileName: x => x, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n' }));
await rm('dist', { recursive: true, force: true });
await mkdir('dist/assets', { recursive: true });
const esm = 'https://esm.sh/';
const js = result.outputText
  .replace("import './style.css';", '')
  .replaceAll("from 'react'", `from '${esm}react@19'`)
  .replaceAll("from 'react-dom/client'", `from '${esm}react-dom@19/client'`)
  .replaceAll("from 'react-router-dom'", `from '${esm}react-router-dom@7'`)
  .replaceAll("from 'lucide-react'", `from '${esm}lucide-react@0.468.0'`)
  .replaceAll("from \"react/jsx-runtime\"", `from '${esm}react@19/jsx-runtime'`);
await writeFile('dist/assets/main.js', js);
await copyFile('src/style.css', 'dist/assets/style.css');
await writeFile('dist/index.html', `<!doctype html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><meta name="theme-color" content="#35543B"/><title>Rizvi Store</title><link rel="stylesheet" href="/assets/style.css"/></head><body><div id="root"></div><script type="module" src="/assets/main.js"></script></body></html>`);
console.log('Built dist/ with a browser-ready ESM storefront.');
