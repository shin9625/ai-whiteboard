import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const __filename = fileURLToPath(import.meta.url);
const CLIENT_DIR = path.dirname(__filename);
const distDir = path.join(CLIENT_DIR, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

async function build() {
  console.log('📦 1/3: Building Tailwind CSS via PostCSS API...');
  const inputCss = fs.readFileSync(path.join(CLIENT_DIR, 'src/index.css'), 'utf-8');
  
  const tailwindConfigPath = path.join(CLIENT_DIR, 'tailwind.config.js');
  const result = await postcss([
    tailwindcss(tailwindConfigPath),
    autoprefixer,
  ]).process(inputCss, {
    from: path.join(CLIENT_DIR, 'src/index.css'),
    to: path.join(distDir, 'bundle.css'),
  });

  fs.writeFileSync(path.join(distDir, 'bundle.css'), result.css, 'utf-8');
  console.log(`✅ CSS generated: ${(result.css.length / 1024).toFixed(1)} KB`);

  console.log('⚡️ 2/3: Bundling React + TypeScript via esbuild...');
  esbuild.buildSync({
    entryPoints: [path.join(CLIENT_DIR, 'src/main.tsx')],
    bundle: true,
    outfile: path.join(distDir, 'bundle.js'),
    minify: true,
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    loader: {
      '.tsx': 'tsx',
      '.ts': 'ts',
    },
  });

  console.log('📄 3/3: Generating dist/index.html...');
  const htmlContent = `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WHITEBOARD - AI Native Task Board</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/bundle.css">
  </head>
  <body class="bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 text-slate-800 dark:text-slate-100 min-h-screen font-sans selection:bg-blue-500 selection:text-white overflow-x-hidden">
    <div id="root"></div>
    <script src="/bundle.js"></script>
  </body>
</html>`;

  fs.writeFileSync(path.join(distDir, 'index.html'), htmlContent, 'utf-8');

  console.log('✨ Build completed successfully! Output in client/dist/');
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
