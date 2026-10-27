import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

// Build-time settings come from .env (D-019). A build with them missing or malformed fails here,
// rather than shipping a site whose sign-in quietly doesn't work.
function checkEnv(env) {
  const url = env.VITE_SUPABASE_URL || '';
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) throw new Error('VITE_SUPABASE_URL in .env must look like https://<project>.supabase.co');
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY in .env must be a publishable key (sb_publishable_...), never a secret one');
  return new URL(url);
}

// public/_headers can't read .env, so its CSP names the Supabase project with placeholders that
// are filled in after the build: __SUPABASE_ORIGIN__ (https) and __SUPABASE_WS__ (wss).
function headersFromEnv(supabase) {
  return {
    name: 'eightfold-headers-from-env',
    apply: 'build',
    writeBundle(options) {
      const file = resolve(options.dir, '_headers');
      const text = readFileSync(file, 'utf8')
        .replaceAll('__SUPABASE_ORIGIN__', supabase.origin)
        .replaceAll('__SUPABASE_WS__', `wss://${supabase.host}`);
      if (text.includes('__SUPABASE_')) throw new Error('_headers still has an unfilled placeholder');
      writeFileSync(file, text);
    },
  };
}

// Fontsource lists a .woff fallback after each .woff2 (D-027). Every browser Eightfold supports
// reads woff2, so drop the fallback and don't ship ~10 MB of files nobody downloads.
// The stylesheet is finished by then (imports inlined), so it's edited in the bundle.
function woff2Only() {
  return {
    name: 'eightfold-woff2-only',
    apply: 'build',
    generateBundle(options, bundle) {
      const fallback = /,\s*url\(([^)]+\.woff)\)\s*format\(['"]woff['"]\)/g;
      for (const file of Object.values(bundle)) {
        if (file.type === 'asset' && file.fileName.endsWith('.css')) file.source = String(file.source).replace(fallback, '');
      }
      const css = Object.values(bundle).filter((f) => f.type === 'asset' && f.fileName.endsWith('.css')).map((f) => String(f.source)).join('\n');
      for (const name of Object.keys(bundle)) {
        if (name.endsWith('.woff') && !css.includes(name.split('/').pop())) delete bundle[name];
      }
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, import.meta.dirname, 'VITE_');
  const plugins = [woff2Only(), ...(command === 'build' ? [headersFromEnv(checkEnv(env))] : [])];
  return {
    plugins,
    server: { port: 5173, strictPort: true, host: 'localhost' },
    build: {
      // Fonts are always files: the CSP allows fonts only from this site ('self'), not data: URLs.
      assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
      rollupOptions: {
        input: {
          main: resolve(import.meta.dirname, 'index.html'),
          app: resolve(import.meta.dirname, 'app.html'),
          privacy: resolve(import.meta.dirname, 'privacy.html'),
          terms: resolve(import.meta.dirname, 'terms.html'),
          patchNotes: resolve(import.meta.dirname, 'patch-notes.html'),
          // Cloudflare serves dist/404.html for unknown addresses (wrangler.jsonc). Built like the
          // other pages so it gets the self-hosted fonts.
          notFound: resolve(import.meta.dirname, '404.html'),
        },
      },
    },
  };
});
