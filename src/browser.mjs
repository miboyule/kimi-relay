// The manager and worker use separate loopback ports. Browsers label a link
// between them "same-site". Permit only public top-level HTML navigation;
// authenticated APIs retain upstream's strict origin/fetch-site checks.
export function allowLocalPageNavigation(req) {
  if (req.method === 'GET' && ['/', '/index.html', '/setup.html'].includes(req.url)
    && !req.headers.origin && req.headers['sec-fetch-mode'] === 'navigate'
    && req.headers['sec-fetch-dest'] === 'document' && req.headers['sec-fetch-site'] === 'same-site') {
    req.headers['sec-fetch-site'] = 'none';
  }
}
