export async function fetchOperatorJson(url, key, fetchImpl = globalThis.fetch) {
  const credential = String(key || '').trim();
  if (!credential) throw new Error('Enter the operator key to read protected operations.');
  const response = await fetchImpl(url, {
    cache: 'no-store', credentials: 'omit', redirect: 'error',
    headers: { Accept: 'application/json', Authorization: `Bearer ${credential}` }
  });
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error('The operations service returned an invalid response.'); }
  if (!response.ok || !payload || typeof payload !== 'object' || Array.isArray(payload) || payload.ok === false) {
    throw new Error(`The protected operations request failed (HTTP ${response.status}).`);
  }
  return payload;
}
