'use strict';

const { HEALTH_SCHEMA, HEALTH_SERVICE } = require('./healthStatus');

const MAX_BODY_BYTES = 8192;

function validateHealthPayload(payload, { check = 'readiness', requireDatabase = check === 'readiness', now = Date.now() } = {}) {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object' ||
      payload.schema !== HEALTH_SCHEMA || payload.service !== HEALTH_SERVICE ||
      payload.check !== check || typeof payload.ok !== 'boolean') return false;
  const at = typeof payload.generatedAt === 'string' ? Date.parse(payload.generatedAt) : NaN;
  if (!Number.isFinite(at) || now - at > 60000 || at - now > 30000) return false;
  if (check === 'liveness') return payload.ok === true && payload.status === 'alive';
  if (check !== 'readiness') return false;
  const db = payload.dependencies?.database;
  const startup = payload.dependencies?.startup;
  if (!db || typeof db.required !== 'boolean' || !['ready', 'unavailable', 'not_configured'].includes(db.status)) return false;
  if (!startup || !['starting', 'ready', 'failed'].includes(startup.status)) return false;
  if (requireDatabase && !db.required) return false;
  // A configured DB must be required. Only a deliberately database-free local
  // instance can report optional/not_configured readiness.
  if (!db.required && db.status !== 'not_configured') return false;
  const ready = (!db.required || db.status === 'ready') && startup.status === 'ready';
  return payload.ok === ready && payload.status === (ready ? 'ready' : 'not_ready');
}

async function readBoundedBody(response) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('INVALID_BODY');
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) throw new Error('BODY_TOO_LARGE');
      chunks.push(Buffer.from(value));
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function probeHealth(url, {
  check = 'readiness', requireDatabase = check === 'readiness',
  timeoutMs = 5000, fetchImpl = fetch, now = Date.now
} = {}) {
  const failure = (code, status = null) => ({ ok: false, check, code, status });
  let target;
  try {
    target = new URL(url);
    if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.hash || target.search) return failure('INVALID_URL');
  } catch { return failure('INVALID_URL'); }
  if (!['liveness', 'readiness'].includes(check)) return failure('INVALID_CHECK');
  let response;
  try {
    response = await fetchImpl(target.href, {
      redirect: 'manual', cache: 'no-store',
      headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs)
    });
    if (response.redirected || response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      return failure('UNEXPECTED_REDIRECT', response.status);
    }
    if (response.status !== 200 && response.status !== 503) {
      await response.body?.cancel();
      return failure('HTTP_STATUS', response.status);
    }
    if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) {
      await response.body?.cancel();
      return failure('INVALID_CONTENT_TYPE', response.status);
    }
    let payload;
    try { payload = JSON.parse(await readBoundedBody(response)); }
    catch (error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') throw error;
      return failure(error.message === 'BODY_TOO_LARGE' ? 'BODY_TOO_LARGE' : 'INVALID_JSON', response.status);
    }
    if (!validateHealthPayload(payload, { check, requireDatabase, now: now() })) return failure('INVALID_SCHEMA', response.status);
    if (response.status !== (payload.ok ? 200 : 503)) return failure('STATUS_MISMATCH', response.status);
    if (!payload.ok) return failure('DEPENDENCY_UNAVAILABLE', response.status);
    return { ok: true, check, code: 'OK', status: response.status };
  } catch (error) {
    return failure(error.name === 'AbortError' || error.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERROR', response?.status ?? null);
  }
}

module.exports = { validateHealthPayload, probeHealth };
