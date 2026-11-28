function localTestDatabaseUrl(value) {
  const url = new URL(value);
  // pg accepts connection-query overrides such as ?host=. Checking the URL
  // hostname alone does not prove that its effective connection stays local.
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      !['127.0.0.1', 'localhost'].includes(url.hostname) || url.search || url.hash) {
    throw Error('Use an isolated loopback PostgreSQL URL without query overrides or fragments.');
  }
  return url;
}

module.exports = { localTestDatabaseUrl };
