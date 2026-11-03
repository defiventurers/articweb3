// A local owner session has no cloud account ID or entitlement cache.
export function restoreCachedEntitlements(session, cache, now = Date.now()) {
  if (typeof session?.accountId !== 'string' || !session.accountId.trim()) return {};
  if (!cache || cache.accountId !== session.accountId) return {};
  if (!Number.isFinite(cache.at) || cache.at <= 0 || cache.at > now || now - cache.at >= 30 * 86400000) return {};
  return cache.value && typeof cache.value === 'object' && !Array.isArray(cache.value) ? cache.value : {};
}
