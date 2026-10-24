// App-wide settings in one place (D-019). Values that differ per deployment come from .env, which
// Vite reads at build time (only VITE_* names); the rest are product constants used across pages.
// Node scripts import modules that import this file, where import.meta.env doesn't exist.
const env = import.meta.env ?? {};

// ---------- Deployment (from .env) ----------
export const SUPABASE_URL = env.VITE_SUPABASE_URL || '';
export const SUPABASE_PUBLISHABLE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
export const ACCOUNTS_ENABLED = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

// ---------- Product ----------
export const APP_NAME = 'Eightfold';
// A thousand cranes grant a wish (senbazuru). Every tick folds one.
export const CRANE_GOAL = 1000;
export const CRANE_GOAL_TEXT = CRANE_GOAL.toLocaleString('en-GB'); // "1,000"
// The weekly "save a backup" nudge, while data lives in one browser only.
export const BACKUP_EVERY_DAYS = 7;

// ---------- Storage ----------
export const STORE_KEY = 'eightfold:v1';
export const LEGACY_STORE_KEY = 'orizuru:v1'; // the app's working name before it became Eightfold
