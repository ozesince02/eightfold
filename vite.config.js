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

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, import.meta.dirname, 'VITE_');
  const plugins = command === 'build' ? [headersFromEnv(checkEnv(env))] : [];
  return {
    plugins,
    server: { port: 5173, strictPort: true, host: 'localhost' },
    build: {
      rollupOptions: {
        input: {
          main: resolve(import.meta.dirname, 'index.html'),
          app: resolve(import.meta.dirname, 'app.html'),
        },
      },
    },
  };
});
