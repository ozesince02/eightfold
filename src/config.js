// App-wide settings in one place (D-019). Values that differ per deployment come from .env, which
// Vite reads at build time (only VITE_* names); the rest are product constants used across pages.
// Node scripts import modules that import this file, where import.meta.env doesn't exist.
const env = import.meta.env ?? {};

// ---------- Deployment (from .env) ----------
export const SUPABASE_URL = env.VITE_SUPABASE_URL || '';
export const SUPABASE_PUBLISHABLE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
export const ACCOUNTS_ENABLED = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
// Reminders with the app closed (D-028): the public half of the VAPID key. Until it's set (npm run
// vapid), the tracker doesn't offer them.
export const VAPID_PUBLIC_KEY = /^B[A-Za-z0-9_-]{86}$/.test(env.VITE_VAPID_PUBLIC_KEY || '') ? env.VITE_VAPID_PUBLIC_KEY : '';
export const PUSH_ENABLED = ACCOUNTS_ENABLED && Boolean(VAPID_PUBLIC_KEY);
// Where the tracker lives: /app on the live site (Cloudflare drops .html), /app.html on the dev
// server. Sign-in always comes back here; both are on Supabase's redirect list.
export const APP_PATH = env.DEV ? '/app.html' : '/app';
// The Privacy and Terms pages (D-026), the same way.
export const PRIVACY_PATH = env.DEV ? '/privacy.html' : '/privacy';
export const TERMS_PATH = env.DEV ? '/terms.html' : '/terms';
// What's new, version by version (D-032).
export const PATCH_NOTES_PATH = env.DEV ? '/patch-notes.html' : '/patch-notes';

// ---------- Product ----------
export const APP_NAME = 'One More Fold';
// A thousand cranes grant a wish (senbazuru). Every tick folds one.
export const CRANE_GOAL = 1000;
export const CRANE_GOAL_TEXT = CRANE_GOAL.toLocaleString('en-GB'); // "1,000"
// The weekly "save a backup" nudge, while data lives in one browser only.
export const BACKUP_EVERY_DAYS = 7;

// ---------- Author (footer, credits) ----------
export const AUTHOR = {
  nickname: 'oze',
  name: 'Pulkit Choudhary',
  email: 'hashtechpulkit@gmail.com',
  github: 'https://github.com/ozesince02',
};

// ---------- Storage ----------
// Storage keys keep the product's first name (D-038): renaming them would lose everyone's saved folds.
export const STORE_KEY = 'eightfold:v1';
export const LEGACY_STORE_KEY = 'orizuru:v1'; // the working name before Eightfold, which became One More Fold (D-038)
// The reader's paper: light, warm or dark (D-033). Per device; public/theme.js reads it too.
export const THEME_KEY = `${STORE_KEY}:theme`;
