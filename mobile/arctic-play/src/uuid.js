// Some Android WebViews expose getRandomValues but not randomUUID.
// Keep every profile, match and request ID cryptographically random.
export function secureUuid(source = globalThis.crypto) {
  if (typeof source?.randomUUID === 'function') return source.randomUUID();
  if (typeof globalThis.window?.Android?.newUuid === 'function') {
    const id = window.Android.newUuid();
    if (/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id)) return id;
  }
  if (typeof source?.getRandomValues !== 'function') throw new Error('Secure random numbers are unavailable. Reopen the app to try again.');
  const bytes = new Uint8Array(16);
  source.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
}
