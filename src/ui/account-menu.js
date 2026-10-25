// The account, as a piece of paper in the header (D-022). Signed out it's a crumpled ball: not yours
// yet. Signed in it's folded flat into a square with your initial. Tap it and it opens into a chit
// with the sign-in choices, or who you are, how syncing is going and a way to sign out.
// Used by the landing page and the tracker; the page passes in what it knows.
import { esc } from '../lib/sanitize.js';
import { signInWithGoogle, sendSignInLink, signOut } from '../lib/auth.js';
import { APP_PATH } from '../config.js';
import { store } from '../lib/store.js';

// A crumpled ball: an uneven outline cut into facets of three paper tones, with crease lines.
const BALL = `<svg class="acct-ball" viewBox="0 0 48 48" aria-hidden="true">
  <path class="p1" d="M24 3 L35 6 L43 15 L44 27 L39 38 L28 45 L16 43 L7 36 L4 24 L8 12 L16 5 Z"/>
  <path class="p2" d="M24 3 L35 6 L29 18 L19 15 L16 5 Z"/>
  <path class="p3" d="M43 15 L44 27 L33 27 L29 18 L35 6 Z"/>
  <path class="p2" d="M44 27 L39 38 L28 45 L25 32 L33 27 Z"/>
  <path class="p3" d="M7 36 L4 24 L13 24 L18 33 L16 43 Z"/>
  <path class="p2" d="M4 24 L8 12 L16 5 L19 15 L13 24 Z"/>
  <path class="crease" d="M19 15 L29 18 L33 27 L25 32 L18 33 L13 24 Z M29 18 L25 32 M19 15 L18 33"/>
</svg>`;

// Folded flat: a square on its corner with the first letter of the email.
const folded = (initial) => `<svg class="acct-folded" viewBox="0 0 48 48" aria-hidden="true">
  <path class="p1" d="M24 2 L46 24 L24 46 L2 24 Z"/>
  <path class="p2" d="M24 2 L46 24 L24 24 Z"/>
  <text x="24" y="31" text-anchor="middle">${esc(initial)}</text>
</svg>`;

const SYNC_WORDS = {
  synced: 'Saved to your account',
  syncing: 'Saving…',
  offline: 'Offline: will sync when you\'re back',
  error: 'Can\'t reach your account; trying again',
  choose: 'Choose how to combine your folds',
};

// slot: an element in the header. page: 'landing' | 'app'. onChoose(kind): the tracker's sync choice.
export function createAccountMenu(slot, { page = 'app', onChoose, toast } = {}) {
  let notice = '';
  // Pages without toasts (the landing page) show messages on the chit itself.
  toast ||= (text) => { notice = text; if (open) drawChit(); };
  let account = { status: 'loading' };
  let sync = { state: 'off' };
  let open = false;
  let sending = false;
  let draft = '';

  slot.classList.add('acct');
  slot.innerHTML = `<button class="acct-btn" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="acct-chit"></button>
    <div class="acct-chit" id="acct-chit" role="dialog" aria-labelledby="acct-h" hidden></div>`;
  const btn = slot.querySelector('.acct-btn');
  const chit = slot.querySelector('.acct-chit');

  function drawButton() {
    const signedIn = account.status === 'signed-in';
    const initial = (account.email || '?').trim().charAt(0).toUpperCase() || '?';
    const dot = signedIn && sync.state !== 'off' ? `<span class="sync-dot" data-state="${esc(sync.state)}" aria-hidden="true"></span>` : '';
    const label = signedIn ? 'Signed in' : 'Sign in';
    btn.innerHTML = `${signedIn ? folded(initial) : BALL}${dot}<span class="acct-label">${label}</span>`;
    btn.dataset.state = signedIn ? 'in' : 'out';
    btn.setAttribute('aria-label', signedIn
      ? `Account: signed in as ${account.email || 'you'}${SYNC_WORDS[sync.state] ? `. ${SYNC_WORDS[sync.state]}` : ''}`
      : 'Account: not signed in. Sign in or keep using Eightfold on this device');
    btn.setAttribute('aria-expanded', String(open));
  }

  function drawChit() {
    const a = account;
    let body;
    if (a.status === 'signed-in') {
      const status = SYNC_WORDS[sync.state];
      body = `<h2 id="acct-h">Your account</h2>
        <p class="acct-who">Signed in as <b>${esc(a.email || 'you')}</b></p>
        ${status ? `<p class="acct-status"><span class="sync-dot" data-state="${esc(sync.state)}" aria-hidden="true"></span>${status}</p>` : ''}
        <p class="note">Your folds are saved on this device first, then to your account, and reach your other devices.</p>
        ${sync.state === 'choose' ? `<div class="acct-actions"><button class="btn btn--ink" type="button" data-acct-choose="merge">Keep both</button><button class="seg-link" type="button" data-acct-choose="account">Use only my account's</button></div>` : ''}
        <div class="acct-actions">
          ${page === 'landing' ? `<a class="btn btn--ink" href="${APP_PATH}">Open your tracker</a>` : ''}
          <button class="btn btn--quiet" type="button" data-acct-out>Sign out</button>
        </div>
        <button class="seg-link acct-forget" type="button" data-acct-forget>Sign out and remove my folds from this browser</button>
        <p class="note">For a shared computer. Your folds stay in your account.</p>`;
    } else if (a.status === 'signed-out') {
      body = `<h2 id="acct-h">Keep your folds everywhere</h2>
        <p class="note">Sign in to have the same tracker on your phone and laptop. Optional: without an account, everything stays on this device.</p>
        <div class="acct-actions"><button class="btn btn--ink" type="button" data-acct-google>Continue with Google</button></div>
        <form class="acct-form" data-acct-email>
          <label for="acct-email">Or get a sign-in link by email</label>
          <div class="acct-row">
            <input id="acct-email" name="email" type="email" autocomplete="email" inputmode="email" maxlength="254" required placeholder="you@example.com" value="${esc(draft)}">
            <button class="btn btn--quiet" type="submit" ${sending ? 'disabled' : ''}>${sending ? 'Sending…' : 'Send link'}</button>
          </div>
          <p class="note">Open the link in this browser.</p>
        </form>
        <button class="seg-link acct-later" type="button" data-acct-close>Not now, keep it on this device</button>`;
    } else if (a.status === 'unavailable') {
      body = `<h2 id="acct-h">Account</h2><p class="note">Sign-in can't be reached right now. Everything still works on this device.</p>`;
    } else {
      body = `<h2 id="acct-h">Account</h2><p class="note">Checking your account…</p>`;
    }
    chit.innerHTML = `<span class="tape" aria-hidden="true"></span><div class="acct-sheet">${body}<p class="acct-notice" role="status">${esc(notice)}</p></div>`;
  }

  function setOpen(next, { focus = true } = {}) {
    open = next;
    chit.hidden = !open;
    slot.classList.toggle('is-open', open);
    // The header shares a layer with the page below it; lift it while the chit hangs over the page.
    slot.closest('header')?.classList.toggle('acct-open', open);
    drawButton();
    if (open) {
      drawChit();
      // On phones the chit spans the screen; hang it just under the ball, wherever the header ends.
      chit.style.top = matchMedia('(max-width: 760px)').matches ? `${Math.round(btn.getBoundingClientRect().bottom + 8)}px` : '';
      if (focus) chit.querySelector('button, a, input')?.focus();
    } else if (focus) {
      btn.focus();
    }
  }

  btn.addEventListener('click', () => setOpen(!open));
  // Close on Escape, or a tap anywhere else.
  document.addEventListener('keydown', (e) => { if (open && e.key === 'Escape') setOpen(false); });
  document.addEventListener('pointerdown', (e) => { if (open && !slot.contains(e.target)) setOpen(false, { focus: false }); });

  chit.addEventListener('click', (e) => {
    if (e.target.closest('[data-acct-google]')) {
      signInWithGoogle().catch((err) => toast(err.message));
    } else if (e.target.closest('[data-acct-out]')) {
      signOut().then(() => { toast('Signed out on this device. Your folds are still here.'); setOpen(false); })
        .catch(() => toast('Couldn\'t sign out. Try again.'));
    } else if (e.target.closest('[data-acct-forget]')) {
      forget();
    } else if (e.target.closest('[data-acct-close]')) {
      setOpen(false);
    } else {
      const choose = e.target.closest('[data-acct-choose]');
      if (choose) onChoose?.(choose.dataset.acctChoose);
    }
  });

  // Sign out, then remove everything Eightfold keeps in this browser. Changes that haven't reached
  // the account yet would be lost, so that needs a yes first.
  async function forget() {
    const unsent = store.unsentChanges();
    if (unsent && !window.confirm(`${unsent === 1 ? "One change hasn't" : `${unsent} changes haven't`} reached your account yet and will be lost. Sign out and remove your folds from this browser anyway?`)) return;
    try {
      await signOut();
    } catch {
      toast("Couldn't sign out, so nothing was removed. Try again.");
      return;
    }
    const removed = store.forgetDevice();
    toast(removed
      ? 'Signed out. Your folds are removed from this browser and still in your account.'
      : "Signed out, but this browser wouldn't let Eightfold remove your folds. Clear this site's data in the browser settings.");
    setOpen(false);
  }

  chit.addEventListener('submit', (e) => {
    e.preventDefault();
    if (sending) return;
    draft = String(new FormData(e.target).get('email') || '');
    sending = true;
    drawChit();
    sendSignInLink(draft)
      .then(() => { toast('Check your email for the sign-in link, and open it in this browser.'); draft = ''; })
      .catch((err) => toast(err.message))
      .finally(() => { sending = false; if (open) drawChit(); });
  });

  drawButton();

  return {
    update(next = {}) {
      if (next.account) account = next.account;
      if (next.sync) sync = next.sync;
      drawButton();
      // Don't redraw an open form under someone's fingers; status changes redraw when signed in.
      if (open && (account.status !== 'signed-out' || next.account)) drawChit();
    },
    open: () => setOpen(true),
  };
}
