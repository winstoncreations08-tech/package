export function setDocumentTitle(title: string) {
  if (typeof document === 'undefined') return;
  document.title = title;
}

export function setFavicon(faviconUrl: string) {
  if (typeof document === 'undefined') return;
  const url = faviconUrl?.trim();
  if (!url) return;

  const links = document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]');
  links.forEach(link => link.remove());

  const newLink = document.createElement('link');
  newLink.rel = 'icon';
  newLink.type = 'image/png';
  newLink.href = url.includes('?') ? `${url}&_cb=${Date.now()}` : `${url}?_cb=${Date.now()}`;
  document.head.appendChild(newLink);
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

