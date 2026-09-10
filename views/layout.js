// The only HTML chrome in the project. Every page is layout(...) around a body string.

export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// Inline SVG is allowed by the CSP (it is markup, not a fetched resource).
// Three log lines of uneven length: the mark reads as "a record", which is what the app shows.
const BRAND_MARK = `<svg viewBox="0 0 22 22" aria-hidden="true"><rect x="1" y="1" width="20" height="20" rx="5" fill="#0f6e6b"/><path d="M6 7.5h10M6 11h6M6 14.5h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
const FAVICON = `data:image/svg+xml,${encodeURIComponent(BRAND_MARK)}`;

// Top-level navigation. A page marks itself current by passing its href as `current`.
const NAV = [{ href: '/', label: 'Sessions' }];

function renderNav(current) {
  return NAV.map(({ href, label }) => {
    const on = href === current ? ' aria-current="page"' : '';
    return `<a href="${href}"${on}>${esc(label)}</a>`;
  }).join('\n');
}

// `source` and `home` describe what the dashboard is reading; both are optional so a page that
// has nothing to say about the source still renders a complete shell.
export function layout({ title, body, nav = '', head = '', current = '/', source = '', home = '' }) {
  const sourceBadge = source ? `<span class="source">${esc(source)}</span>` : '';
  const homeLine = home ? `<span>Reading <code>${esc(home)}</code></span>` : '';
  return `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:">
<title>${esc(title)}</title>
<link rel="icon" href="${FAVICON}">
<link rel="stylesheet" href="/style.css">
${head}
</head>
<body>
<header class="top">
  <div class="top-inner">
    <a class="brand" href="/">${BRAND_MARK}<span>agent-ops</span></a>
    ${sourceBadge}
    <nav>${renderNav(current)}${nav}</nav>
  </div>
</header>
<main>
${body}
</main>
<footer class="foot">
  <div class="foot-inner">
    ${homeLine}
    <span>Read-only. Nothing here writes to the agent's home directory.</span>
  </div>
</footer>
</body>
</html>
`;
}

export function empty(message) {
  return `<p class="empty">${esc(message)}</p>`;
}
