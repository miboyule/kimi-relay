export function modelRoute(id, protocol) {
  if (typeof id !== 'string' || !id.trim() || !['chat', 'responses'].includes(protocol)) throw Error('invalid_model');
  return 'relay/' + (protocol === 'chat' ? 'kimi-' : 'resp-') + encodeURIComponent(id.trim());
}

// An explicit DNS opt-in is checked on every path, including panel retries.
export function createGuardedOnboarding({ enabled, check, prepare, reveal = async () => {} }) {
  return {
    async ensure(options) {
      const state = await check();
      if (state.intranet?.passed) {
        await reveal();
        return { state: 'ready' };
      }
      if (!enabled) return { state: 'waiting-permission', reason: 'relay_dns_permission_required' };
      return prepare(options);
    },
  };
}

export function trustedPanelURL(value, port) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && url.hostname === '127.0.0.1' && Number(url.port) === port
      && !url.username && !url.password;
  } catch { return false; }
}
