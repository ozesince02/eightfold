// Sign-in (D-019): Google or an emailed link, through Supabase Auth. Signing in is optional; the
// tracker works the same without it. The Supabase client is loaded only when the tracker opens,
// and after the page has drawn, so the landing page and a slow network never wait for it.
//
// The project URL and publishable key come from .env through config.js. Both are public by design:
// what a signed-in person can read or write is decided by row-level security (D-018).
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, ACCOUNTS_ENABLED, APP_PATH } from '../config.js';
import { leaveDevice } from './push.js';

const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/;
export const isEmail = (s) => typeof s === 'string' && s.length <= 254 && EMAIL.test(s);

let clientPromise = null;
function client() {
  clientPromise ||= import('@supabase/supabase-js').then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    // PKCE: the sign-in link or Google's redirect brings back a one-time code that only this
    // browser can exchange, never a token in the address bar.
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }));
  return clientPromise;
}

// Where Google and the email link send people back to: the tracker, from whichever page they
// started on. Must be listed under Supabase → Authentication → URL Configuration → Redirect URLs.
const backHere = () => `${location.origin}${APP_PATH}`;

// The account as the screens see it: { status: 'loading' | 'signed-out' | 'signed-in', email? }.
const toAccount = (session) => (session?.user
  ? { status: 'signed-in', email: session.user.email || '', id: session.user.id }
  : { status: 'signed-out' });

// Calls onChange with the account now and whenever it changes (sign-in, sign-out, another tab).
// onError gets a fixed, readable message when a sign-in coming back to the page failed.
export async function startAuth(onChange, onError) {
  if (!ACCOUNTS_ENABLED) { onChange({ status: 'unavailable' }); return; }
  const returning = new URLSearchParams(location.search);
  try {
    const sb = await client();
    sb.auth.onAuthStateChange((event, session) => onChange(toAccount(session)));
    const { data } = await sb.auth.getSession();
    onChange(toAccount(data.session));
  } catch {
    onChange({ status: 'unavailable' });
  }
  // A failed sign-in comes back as ?error=...; its description is never shown, it's from the URL.
  if (returning.has('error')) onError?.('That sign-in didn\'t go through. Try again.');
  // Leave the address clean once the one-time code has been used (or refused).
  if (returning.has('code') || returning.has('error')) {
    history.replaceState(null, '', `${location.pathname}${location.hash}`);
  }
}

// The Supabase client, for the sync engine once someone is signed in.
export const getClient = () => client();

export async function signInWithGoogle() {
  const sb = await client();
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: backHere() } });
  if (error) throw new Error('Google sign-in couldn\'t start. Try again in a moment.');
}

// Resolves when the email is on its way; throws a readable message otherwise.
export async function sendSignInLink(email) {
  const address = String(email || '').trim();
  if (!isEmail(address)) throw new Error('That doesn\'t look like an email address.');
  const sb = await client();
  const { error } = await sb.auth.signInWithOtp({ email: address, options: { emailRedirectTo: backHere() } });
  if (!error) return;
  if (/signups? not allowed|not allowed for otp/i.test(error.message || '')) throw new Error('This email hasn\'t been invited yet.');
  if (error.status === 429) throw new Error('Too many links asked for. Wait a minute and try again.');
  throw new Error('The link couldn\'t be sent. Try again in a moment.');
}

// Signs out on this device only; other devices stay signed in. This device stops getting the
// account's closed-app reminders first (D-028), while the session can still remove its address.
export async function signOut() {
  const sb = await client();
  await leaveDevice(sb);
  await sb.auth.signOut({ scope: 'local' });
}

// Deletes the signed-in person's account and everything stored in it (D-025), then signs out on
// this device. The database function deletes only the caller.
export async function deleteAccount() {
  const sb = await client();
  await leaveDevice(sb);
  const { error } = await sb.rpc('delete_my_account');
  if (error) throw new Error("Your account couldn't be deleted just now. Nothing was removed; try again in a moment.");
  // The account is gone, and so are its sessions on the server. Forget this browser's copy too;
  // if Supabase can't (the server no longer knows the user), remove its saved session directly.
  let out;
  try { out = await sb.auth.signOut({ scope: 'local' }); } catch (e) { out = { error: e }; }
  if (out?.error) {
    try { localStorage.removeItem(`sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`); } catch { /* nothing saved */ }
  }
}
