const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// 确保输出目录存在
const outDir = path.dirname('dist/src/extension.js');
fs.mkdirSync(outDir, { recursive: true });

esbuild.build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/src/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
}).catch(() => process.exit(1));
