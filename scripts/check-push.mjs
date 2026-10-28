// Web Push without a library (D-028): checks the encryption against the worked example in
// RFC 8291 Appendix A, decrypts a fresh message the way a browser would, and verifies the VAPID
// token's signature. supabase/functions/_shared/webpush.js is what the sender uses.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { encrypt, vapidHeader, sendPush, b64u, unb64u } from '../supabase/functions/_shared/webpush.js';
import { clocks, planReminders, logCutoff, DAILY_CAP } from '../supabase/functions/_shared/plan.js';

const subtle = globalThis.crypto.subtle;

// ---------- RFC 8291, Appendix A ----------
const rfc = {
  plaintext: 'When I grow up, I want to be a watermelon',
  asPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  asPublic: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  uaPublic: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  body: 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
};
const body = await encrypt(rfc.plaintext, { p256dh: rfc.uaPublic, auth: rfc.auth }, {
  senderKeys: { publicKey: rfc.asPublic, privateKey: rfc.asPrivate },
  salt: unb64u(rfc.salt),
});
assert.equal(b64u(body), rfc.body, 'encryption matches RFC 8291 Appendix A byte for byte');

// ---------- A fresh message, opened the way a browser would ----------
const hkdf = async (salt, ikm, info, bytes) => new Uint8Array(await subtle.deriveBits(
  { name: 'HKDF', hash: 'SHA-256', salt, info }, await subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), bytes * 8));
const te = new TextEncoder();
const ua = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
const uaRaw = new Uint8Array(await subtle.exportKey('raw', ua.publicKey));
const authSecret = crypto.getRandomValues(new Uint8Array(16));
const message = { title: 'German · 07:00', body: 'Time to fold today’s German.', tag: '2026-10-28:german' };
const sealed = await encrypt(JSON.stringify(message), { p256dh: b64u(uaRaw), auth: b64u(authSecret) });

const salt = sealed.slice(0, 16);
assert.equal(new DataView(sealed.buffer).getUint32(16), 4096, 'record size 4096');
assert.equal(sealed[20], 65, 'key id is a 65-byte public key');
const asRaw = sealed.slice(21, 86);
const asKey = await subtle.importKey('raw', asRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
const shared = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: asKey }, ua.privateKey, 256));
const info = new Uint8Array([...te.encode('WebPush: info\0'), ...uaRaw, ...asRaw]);
const ikm = await hkdf(authSecret, shared, info, 32);
const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
const opened = new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: nonce }, await subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), sealed.slice(86)));
assert.equal(opened.at(-1), 2, 'ends with the last-record marker');
assert.deepEqual(JSON.parse(new TextDecoder().decode(opened.slice(0, -1))), message, 'the browser reads exactly what was sent');
const other = await encrypt(JSON.stringify(message), { p256dh: b64u(uaRaw), auth: b64u(authSecret) });
assert.notEqual(b64u(other), b64u(sealed), 'every message gets a new key and salt');

// ---------- VAPID ----------
const vk = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const vjwk = await subtle.exportKey('jwk', vk.privateKey);
const vapid = { publicKey: b64u(new Uint8Array(await subtle.exportKey('raw', vk.publicKey))), privateKey: vjwk.d, subject: 'mailto:someone@example.com' };
const endpoint = 'https://fcm.googleapis.com/fcm/send/abc:def';
const header = await vapidHeader(endpoint, vapid, Date.UTC(2026, 9, 28, 12));
const [, token, k] = header.match(/^vapid t=([^,]+), k=(.+)$/);
assert.equal(k, vapid.publicKey, 'the header names our public key');
const [h, c, s] = token.split('.');
assert.deepEqual(JSON.parse(new TextDecoder().decode(unb64u(h))), { typ: 'JWT', alg: 'ES256' });
const claims = JSON.parse(new TextDecoder().decode(unb64u(c)));
assert.equal(claims.aud, 'https://fcm.googleapis.com', 'audience is the push service origin, not the full address');
assert.equal(claims.exp, Date.UTC(2026, 9, 28, 12) / 1000 + 12 * 3600, 'valid for 12 hours');
assert.equal(claims.sub, 'mailto:someone@example.com');
assert.ok(await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, vk.publicKey, unb64u(s), te.encode(`${h}.${c}`)), 'the signature verifies with our public key');

// ---------- Sending ----------
let seen;
const status = await sendPush({ endpoint, p256dh: b64u(uaRaw), auth: b64u(authSecret) }, message, vapid, {
  fetchImpl: async (url, init) => { seen = { url, init }; return { status: 201 }; },
});
assert.equal(status, 201);
assert.equal(seen.url, endpoint, 'posts to the browser\'s own address');
assert.equal(seen.init.headers['Content-Encoding'], 'aes128gcm');
assert.equal(seen.init.headers.TTL, '1800', 'a reminder older than 30 minutes is not worth delivering');
assert.equal(seen.init.redirect, 'error', 'never follows a redirect somewhere else');
assert.ok(seen.init.headers.Authorization.startsWith('vapid t='));

// ---------- The sender's copies of the app's modules ----------
const lib = join(import.meta.dirname, '../supabase/functions/_shared/lib');
const copies = readdirSync(lib, { recursive: true }).filter((f) => f.endsWith('.js'));
assert.ok(copies.length >= 4, 'the sender has its copies');
for (const f of copies) {
  assert.equal(readFileSync(join(lib, f), 'utf8'), readFileSync(join(import.meta.dirname, '../src/lib', f), 'utf8'), `supabase/functions/_shared/lib/${f} matches src/lib (run npm run shared)`);
}

// ---------- Planning a run ----------
const A = 'user-a', B = 'user-b';
const hm = (user_id, slug, time, extra = {}) => ({ user_id, slug, month: '2026-10-01', name: slug === 'german' ? 'German' : 'Gym', goal: 20, time, start_day: 1, cadence: 'daily', weekdays: null, times_per_week: null, position: 0, ...extra });
const run = Date.UTC(2026, 9, 28, 1, 30); // 01:30 UTC: 07:00 in Kolkata, 18:30 the day before in LA
const people = clocks([
  { user_id: A, off: [], time_zone: 'Asia/Kolkata' },
  { user_id: B, off: [], time_zone: 'America/Los_Angeles' },
], new Date(run));
assert.deepEqual(people.map((p) => p.day), ['2026-10-28', '2026-10-27'], 'each person on their own date');
const habitMonths = [hm(A, 'german', '07:30:00'), hm(A, 'gym', '09:00:00'), hm(B, 'german', '19:00:00')];
const plan = planReminders({ people, habitMonths, ticks: [], sent: [] });
assert.deepEqual(plan.map((x) => `${x.user_id}:${x.slug}:${x.day}`), ['user-a:german:2026-10-28', 'user-b:german:2026-10-27'], 'A at 07:30 Kolkata and B at 19:00 LA, both in their next half hour');
assert.deepEqual(plan[0].payload, { title: 'German · 07:30', body: 'Next up: German at 07:30.', tag: '2026-10-28:german', habitId: 'german', date: '2026-10-28' });
assert.equal(planReminders({ people, habitMonths, ticks: [{ user_id: A, slug: 'german', day: '2026-10-28' }], sent: [] }).length, 1, 'ticked already: no reminder');
assert.equal(planReminders({ people, habitMonths, ticks: [], sent: [{ user_id: A, slug: 'german', day: '2026-10-28' }] }).length, 1, 'sent already: not again');
assert.equal(planReminders({ people: clocks([{ user_id: A, off: ['german'], time_zone: 'Asia/Kolkata' }], new Date(run)), habitMonths, ticks: [], sent: [] }).length, 0, 'switched off: no reminder');
assert.equal(planReminders({ people, habitMonths: habitMonths.map((r) => ({ ...r, user_id: 'someone-else' })), ticks: [], sent: [] }).length, 0, "someone else's habits are never yours");
const full = Array.from({ length: DAILY_CAP }, (_, i) => ({ user_id: A, slug: `h${i}`, day: '2026-10-28' }));
assert.equal(planReminders({ people: people.slice(0, 1), habitMonths, ticks: [], sent: full }).length, 0, `at most ${DAILY_CAP} a day`);
assert.equal(clocks([{ user_id: A, off: [], time_zone: 'Mars/Olympus' }], new Date(run))[0].clock.getHours(), 1, 'an unknown time zone falls back to UTC');
assert.equal(logCutoff(new Date(run)), '2026-10-14', 'the log keeps two weeks');

console.log('push: all checks pass');
