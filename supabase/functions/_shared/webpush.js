// Web Push, written on WebCrypto alone (D-028): no library, so nothing extra in the supply chain.
// Runs the same in Supabase Edge Functions (Deno) and in Node, where scripts/check-push.mjs checks
// it against the worked example in RFC 8291, Appendix A.
//
//   encrypt()     the message, encrypted for one browser (RFC 8291 with RFC 8188's aes128gcm).
//                 Only that browser can read it; the push service in between can't.
//   vapidHeader() proof that the message comes from us (RFC 8292): a short-lived ES256 token.
//   sendPush()    both together, posted to the browser's push service.

const enc = new TextEncoder();
const subtle = globalThis.crypto.subtle;

export function b64u(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
export function unb64u(text) {
  const s = atob(text.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (text.length % 4)) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}
const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};

// A P-256 key from its raw parts: the 65-byte public point (0x04 || x || y), and optionally the
// 32-byte private scalar.
function jwkOf(publicRaw, privateRaw) {
  if (publicRaw.length !== 65 || publicRaw[0] !== 4) throw new Error('not an uncompressed P-256 public key');
  const jwk = { kty: 'EC', crv: 'P-256', x: b64u(publicRaw.slice(1, 33)), y: b64u(publicRaw.slice(33, 65)), ext: true };
  if (privateRaw) jwk.d = b64u(privateRaw);
  return jwk;
}

async function hkdf(salt, ikm, info, bytes) {
  const key = await subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8));
}

// subscription: { p256dh, auth } as the browser gave them (base64url). The fixed key pair and salt
// are for the RFC's test only; normally both are fresh for every message.
export async function encrypt(payload, subscription, { senderKeys, salt } = {}) {
  const uaPublic = unb64u(subscription.p256dh);
  const authSecret = unb64u(subscription.auth);
  salt ||= crypto.getRandomValues(new Uint8Array(16));

  let asPrivate, asPublic;
  if (senderKeys) {
    asPublic = unb64u(senderKeys.publicKey);
    asPrivate = await subtle.importKey('jwk', jwkOf(asPublic, unb64u(senderKeys.privateKey)), { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  } else {
    const pair = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    asPrivate = pair.privateKey;
    asPublic = new Uint8Array(await subtle.exportKey('raw', pair.publicKey));
  }
  const uaKey = await subtle.importKey('jwk', jwkOf(uaPublic), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: uaKey }, asPrivate, 256));

  // RFC 8291 section 3.4: mix in the browser's auth secret and both public keys.
  const ikm = await hkdf(authSecret, shared, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);

  // One record: the message, then the 0x02 that marks the last record (RFC 8188).
  const plain = concat(typeof payload === 'string' ? enc.encode(payload) : payload, new Uint8Array([2]));
  const aes = await subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const sealed = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, plain));

  // Header: salt, record size (4096), key id length, and our public key as the key id.
  const header = concat(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([65]), asPublic);
  return concat(header, sealed);
}

// RFC 8292: a token signed with our VAPID key, valid for the push service's origin for 12 hours.
// vapid: { publicKey, privateKey, subject } with keys in base64url (raw point, raw scalar).
export async function vapidHeader(endpoint, vapid, now = Date.now()) {
  const publicRaw = unb64u(vapid.publicKey);
  const key = await subtle.importKey('jwk', jwkOf(publicRaw, unb64u(vapid.privateKey)), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: vapid.subject })));
  // WebCrypto's ECDSA signature is already the raw r || s that ES256 wants.
  const sig = new Uint8Array(await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${head}.${body}`)));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${vapid.publicKey}`;
}

// Sends one message. Returns the push service's status: 201 is delivered to the service; 404 and
// 410 mean the browser's address is gone for good and should be forgotten.
export async function sendPush(subscription, payload, vapid, { ttl = 1800, fetchImpl = fetch } = {}) {
  const body = await encrypt(JSON.stringify(payload), subscription);
  const res = await fetchImpl(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidHeader(subscription.endpoint, vapid),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(ttl),
      Urgency: 'normal',
    },
    body,
    redirect: 'error',
  });
  return res.status;
}
