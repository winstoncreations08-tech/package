const UV_PREFIX = '/uv/service/';
const UV_SW_PATH = '/uv/sw.js';
const BAREMUX_WORKER_PATH = '/baremux/worker.js';
const LIBCURL_TRANSPORT_PATH = '/libcurl/index.mjs';

let transportInitPromise: Promise<void> | null = null;
let proxyInitPromise: Promise<boolean> | null = null;

function uvKey(): Uint8Array {
  // Keep encoding compatible with the UV config shipped in /public/uv/uv.config.js.
  const seed = btoa(new Date().toISOString().slice(0, 10) + location.host)
    .split('')
    .reverse()
    .join('')
    .slice(6.7);
  return new TextEncoder().encode(seed);
}

export function encodeUvUrl(url: string): string {
  if (!url) return '';

  try {
    const key = uvKey();
    const input = new TextEncoder().encode(url);
    const out = new Uint8Array(input.length);

    for (let i = 0; i < input.length; i += 1) {
      out[i] = input[i] ^ key[i % 8];
    }

    return Array.from(out, (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return encodeURIComponent(url);
  }
}

export function toProxyUrl(url: string): string {
  return `${UV_PREFIX}${encodeUvUrl(url)}`;
}

export function openProxyWindow(url: string): void {
  const proxied = toProxyUrl(url);
  const popup = window.open('about:blank', '_blank');

  if (!popup) {
    window.location.href = proxied;
    return;
  }

  try {
    popup.opener = null;
  } catch {
    // Ignore cross-browser opener restrictions.
  }

  const navigate = () => {
    if (!popup.closed) popup.location.replace(proxied);
  };

  const fallbackTimer = window.setTimeout(navigate, 2500);
  void initProxyWorker().finally(() => {
    window.clearTimeout(fallbackTimer);
    navigate();
  });
}

export async function initProxyWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;
  if (proxyInitPromise) return proxyInitPromise;

  proxyInitPromise = (async () => {
    try {
      await ensureTransport();
      const existing = await navigator.serviceWorker.getRegistration(UV_PREFIX);
      if (existing?.active) return true;

      const registration = existing ?? (await navigator.serviceWorker.register(UV_SW_PATH, { scope: UV_PREFIX }));
      await waitForServiceWorkerActivation(registration);
      return Boolean(registration.active);
    } catch (error) {
      console.warn('UV proxy bootstrap failed:', error);
      proxyInitPromise = null;
      return false;
    }
  })();

  return proxyInitPromise;
}

async function ensureTransport(): Promise<void> {
  if (transportInitPromise) return transportInitPromise;

  transportInitPromise = (async () => {
    try {
      const { BareMuxConnection } = await import('@mercuryworkshop/bare-mux');
      const connection = new BareMuxConnection(BAREMUX_WORKER_PATH);
      await connection.setTransport(LIBCURL_TRANSPORT_PATH, [{ wisp: wispEndpoint() }]);
    } catch (error) {
      transportInitPromise = null;
      throw error;
    }
  })();

  return transportInitPromise;
}

function wispEndpoint(): string {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${window.location.host}/wisp/`;
}

function waitForServiceWorkerActivation(registration: ServiceWorkerRegistration): Promise<void> {
  if (registration.active) return Promise.resolve();

  return new Promise((resolve) => {
    const worker = registration.installing || registration.waiting;
    if (!worker) {
      resolve();
      return;
    }

    const timeout = window.setTimeout(resolve, 6000);
    const onStateChange = () => {
      if (worker.state === 'activated') {
        worker.removeEventListener('statechange', onStateChange);
        window.clearTimeout(timeout);
        resolve();
      }
    };

    worker.addEventListener('statechange', onStateChange);
  });
}
