export function setDocumentTitle(title: string) {
  if (typeof document === 'undefined') return;
  document.title = title;
}

export function setFavicon(faviconUrl: string) {
  if (typeof document === 'undefined') return;
  const url = faviconUrl?.trim();
  if (!url) return;

  // Remove ALL existing favicon links
  document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]').forEach(l => l.remove());

  const isSvgData = url.startsWith('data:image/svg');
  const type = isSvgData ? 'image/svg+xml' : 'image/png';
  // For non-data URLs, bust the cache
  const href = url.startsWith('data:') ? url : (url.includes('?') ? `${url}&_cb=${Date.now()}` : `${url}?_cb=${Date.now()}`);

  // Set both 'icon' and 'shortcut icon' for maximum compatibility
  for (const rel of ['icon', 'shortcut icon']) {
    const link = document.createElement('link');
    link.rel = rel;
    link.type = type;
    link.href = href;
    document.head.appendChild(link);
  }
}

export function openAboutBlankCloaked(targetUrl: string, title: string, faviconUrl: string) {
  const w = window.open('about:blank', '_blank', 'noopener,noreferrer');
  if (!w) return;

  try {
    w.document.title = title;
    const link = w.document.createElement('link');
    link.rel = 'icon';
    link.href = faviconUrl;
    w.document.head.appendChild(link);

    const iframe = w.document.createElement('iframe');
    iframe.src = targetUrl;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.referrerPolicy = 'no-referrer';
    w.document.body.style.margin = '0';
    w.document.body.appendChild(iframe);
  } catch {
    // If the browser blocks writing to about:blank for some reason, fall back.
    w.location.href = targetUrl;
  }
}

