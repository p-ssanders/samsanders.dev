const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

function worker() {
  const handlers = {};
  const stored = new Map();
  const fallback = '/images/portrait-v2-280.webp';
  let online = true;
  const cache = {
    addAll: async paths => paths.forEach(path => stored.set(path, new Response(path))),
    put: async (request, response) => stored.set(new URL(request.url).pathname, response)
  };
  vm.runInNewContext(readFileSync('service-worker.js', 'utf8'), {
    self: { addEventListener: (name, handler) => { handlers[name] = handler; }, skipWaiting() {} },
    location: { origin: 'https://samsanders.dev' },
    URL, Response,
    caches: {
      open: async () => cache,
      match: async request => stored.get(typeof request === 'string' ? request : new URL(request.url).pathname)?.clone()
    },
    fetch: async request => {
      if (!online) throw new TypeError('Offline');
      return new Response(`network: ${new URL(request.url).pathname}`);
    }
  });
  return {
    stored, fallback,
    offline: () => { online = false; },
    install: () => new Promise((resolve, reject) => {
      handlers.install({ waitUntil: promise => promise.then(resolve, reject) });
    }),
    request: path => new Promise(resolve => handlers.fetch({
      request: new Request(`https://samsanders.dev${path}`), respondWith: resolve
    }))
  };
}

test('installation only precaches the smallest portrait', async () => {
  const sw = worker();
  await sw.install();
  assert.deepEqual([...sw.stored.keys()].filter(path => path.startsWith('/images/')), [sw.fallback]);
});

test('uncached responsive portraits have an offline fallback after first install', async () => {
  const sw = worker();
  await sw.install();
  sw.offline();
  for (const width of [390, 560, 780]) {
    const response = await sw.request(`/images/portrait-v2-${width}.webp`);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), sw.fallback);
  }
  assert.equal((await sw.request('/images/missing.webp')).status, 503);
});

test('a selected portrait is cached at its full resolution for offline reuse', async () => {
  const sw = worker();
  await sw.install();
  const path = '/images/portrait-v2-780.webp';
  assert.equal(await (await sw.request(path)).text(), `network: ${path}`);
  sw.offline();
  assert.equal(await (await sw.request(path)).text(), `network: ${path}`);
});
