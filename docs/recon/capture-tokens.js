/**
 * Flow UI recon — design token capture.
 *
 * HOW TO USE
 *   1. Open the Flow screen you want to capture (projects home, editor, timeline…).
 *   2. Open DevTools → Console. Paste this whole file. Press Enter.
 *   3. The JSON is logged AND copied to your clipboard.
 *   4. Save it as docs/recon/results/tokens-<screen-name>.json
 *
 * PIXEL-EXACT NOTE: set the window to exactly 1440x900 at DPR 1 first
 * (DevTools device toolbar → Responsive → 1440 x 900, DPR 1) so that every
 * capture is comparable to the reference screenshots.
 *
 * Reads only what the browser already computed. Sends nothing anywhere.
 *
 * IMPORTANT (RECON-02): Flow uses styled-components, which injects rules only for
 * CURRENTLY MOUNTED components. Open the popovers/panels you care about BEFORE running,
 * or their styles simply won't exist in the CSSOM yet.
 */
(() => {
  /**
   * These dumps get committed to the repo. The DOM sweep below reads visible text,
   * aria-labels and control labels — on a signed-in account that includes your email,
   * display name and project titles. Add anything you don't want in git here.
   * Emails are stripped automatically regardless.
   */
  const REDACT = [
    // 'you@example.com',
    // 'Your Name',
  ];

  const out = { url: location.href, title: document.title, viewport: [innerWidth, innerHeight] };

  // ---- 1. CSS custom properties — ALL of them, with their selector ----------
  // RECON-02: Flow scopes custom properties PER COMPONENT (e.g. --sidebar-item-hover-bg on a
  // hashed :hover selector), not on :root. Filtering to root-ish selectors missed almost
  // everything. Collect every declaration and keep the selector it came from.
  const vars = [];
  const rootVars = {};
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; } // cross-origin sheet, skip
    const walk = (list) => {
      for (const r of list) {
        if (r.cssRules) { walk(r.cssRules); continue; }
        if (!r.style || !r.selectorText) continue;
        for (const prop of r.style) {
          if (!prop.startsWith('--')) continue;
          const value = r.style.getPropertyValue(prop).trim();
          vars.push({ name: prop, value, selector: r.selectorText.slice(0, 120) });
          if (/^\s*(:root|html|body|\*)/.test(r.selectorText)) rootVars[prop] = value;
        }
      }
    };
    walk(rules);
  }
  out.cssVars = { global: rootVars, all: vars, count: vars.length };

  // ---- 2. Computed-style frequency across visible elements ----------------
  const PROPS = [
    'color', 'background-color', 'background-image', 'border-radius', 'border-top-width',
    'border-top-color', 'font-family', 'font-size', 'font-weight', 'line-height',
    'letter-spacing', 'box-shadow', 'gap', 'padding', 'opacity', 'backdrop-filter',
    'transition', 'text-transform',
  ];
  const SKIP = new Set(['none', 'normal', 'auto', '0px', 'rgba(0, 0, 0, 0)', '1', '', 'transparent']);

  const visible = [...document.querySelectorAll('body *')].filter((el) => {
    if (/^(script|style|link|meta|br)$/i.test(el.tagName)) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });

  const tally = Object.fromEntries(PROPS.map((p) => [p, {}]));
  for (const el of visible) {
    const cs = getComputedStyle(el);
    for (const p of PROPS) {
      const v = cs.getPropertyValue(p).trim();
      if (SKIP.has(v)) continue;
      tally[p][v] = (tally[p][v] || 0) + 1;
    }
  }
  out.styleFrequency = Object.fromEntries(
    Object.entries(tally).map(([p, m]) => [
      p,
      Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([v, n]) => ({ v, n })),
    ]),
  );

  // ---- 3. Text roles: every distinct type combo, with a sample ------------
  const typeRoles = {};
  for (const el of visible) {
    const txt = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(' ')
      .trim();
    if (!txt) continue;
    const cs = getComputedStyle(el);
    const key = [cs.fontSize, cs.fontWeight, cs.lineHeight, cs.letterSpacing, cs.color].join(' | ');
    if (!typeRoles[key]) typeRoles[key] = { count: 0, samples: [] };
    typeRoles[key].count++;
    if (typeRoles[key].samples.length < 3) typeRoles[key].samples.push(txt.slice(0, 60));
  }
  out.typeRoles = Object.entries(typeRoles)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 40)
    .map(([style, info]) => ({ style, ...info }));

  // ---- 4. Layout skeleton -------------------------------------------------
  const skeleton = (el, depth = 0) => {
    if (depth > 5) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 16) return null;
    const cs = getComputedStyle(el);
    const node = {
      tag: el.tagName.toLowerCase(),
      box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      display: cs.display,
      flow: cs.display.includes('flex') ? `${cs.flexDirection}/${cs.justifyContent}/${cs.alignItems}` : undefined,
      grid: cs.display.includes('grid') ? cs.gridTemplateColumns : undefined,
      position: cs.position === 'static' ? undefined : cs.position,
      bg: SKIP.has(cs.backgroundColor) ? undefined : cs.backgroundColor,
      radius: SKIP.has(cs.borderRadius) ? undefined : cs.borderRadius,
      pad: SKIP.has(cs.padding) ? undefined : cs.padding,
      gap: SKIP.has(cs.gap) ? undefined : cs.gap,
      label: el.getAttribute('aria-label') || el.getAttribute('title') || undefined,
      role: el.getAttribute('role') || undefined,
      children: [...el.children].map((c) => skeleton(c, depth + 1)).filter(Boolean),
    };
    if (!node.children.length) delete node.children;
    return node;
  };
  out.skeleton = skeleton(document.body);

  // ---- 5. Controls inventory ---------------------------------------------
  out.controls = [...document.querySelectorAll('button,[role="button"],input,textarea,select,a[href]')]
    .filter((el) => el.getBoundingClientRect().width > 0)
    .slice(0, 200)
    .map((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        text: (el.innerText || el.value || el.placeholder || '').trim().slice(0, 40) || undefined,
        label: el.getAttribute('aria-label') || undefined,
        size: [Math.round(r.width), Math.round(r.height)],
        pad: cs.padding,
        radius: cs.borderRadius,
        bg: cs.backgroundColor,
        color: cs.color,
        font: `${cs.fontSize}/${cs.fontWeight}`,
        disabled: el.disabled || el.getAttribute('aria-disabled') === 'true' || undefined,
      };
    });

  // ---- 6. Fonts actually loaded ------------------------------------------
  try {
    out.fonts = [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.style} ${f.status}`);
  } catch { out.fonts = 'UNKNOWN'; }

  // ---- 7. Implementation fingerprint (RECON-09) ---------------------------
  const cls = [];
  for (const el of visible) {
    const c = el.getAttribute('class');
    if (c) cls.push(...c.split(/\s+/).filter(Boolean));
  }
  const uniq = [...new Set(cls)];
  const sample = uniq.slice(0, 400);
  out.fingerprint = {
    // Framework tells
    globals: ['React', '__REACT_DEVTOOLS_GLOBAL_HOOK__', 'ng', 'getAllAngularRootElements',
      'Vue', '__NUXT__', '__NEXT_DATA__', 'Alpine', 'Lit', 'litHtmlVersions', 'gapi', 'wiz$']
      .filter((k) => k in window),
    reactRoots: document.querySelectorAll('[data-reactroot],#root,#__next').length,
    ngAttrs: document.querySelectorAll('[ng-version],[_nghost],[_ngcontent]').length,
    customElements: [...new Set([...document.querySelectorAll('*')]
      .map((e) => e.tagName.toLowerCase()).filter((t) => t.includes('-')))].slice(0, 40),

    // CSS architecture tells
    classCount: uniq.length,
    classesPerElement: +(cls.length / Math.max(visible.length, 1)).toFixed(2),
    avgClassLength: +(uniq.reduce((a, c) => a + c.length, 0) / Math.max(uniq.length, 1)).toFixed(1),
    looksHashed: uniq.filter((c) => /^[a-zA-Z0-9_-]{4,10}$/.test(c) && /[0-9]/.test(c)).length,
    looksUtility: uniq.filter((c) => /^(m|p)[trblxy]?-|^(flex|grid|text|bg|border|rounded|gap|w|h)-/.test(c)).length,
    looksBEM: uniq.filter((c) => c.includes('__') || c.includes('--')).length,
    looksCssModules: uniq.filter((c) => /_[a-zA-Z0-9]{5,}$|^[a-zA-Z]+_[a-zA-Z0-9]{5,}/.test(c)).length,
    looksStyledComponents: uniq.filter((c) => /^s?c-[a-zA-Z0-9]{6,}$/.test(c)).length,
    inlineStyledElements: document.querySelectorAll('[style]').length,
    sampleClasses: sample,

    // Asset delivery
    stylesheets: [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.href).slice(0, 30),
    inlineStyleTags: document.querySelectorAll('style').length,
    scripts: [...document.querySelectorAll('script[src]')].map((s2) => s2.src).slice(0, 40),
    fontFaces: (() => {
      const faces = [];
      for (const sheet of document.styleSheets) {
        let rules; try { rules = sheet.cssRules; } catch { continue; }
        for (const r of rules) if (r.constructor.name === 'CSSFontFaceRule') faces.push(r.cssText.slice(0, 300));
      }
      return faces.slice(0, 20);
    })(),
    generator: document.querySelector('meta[name=generator]')?.content,
  };

  let json = JSON.stringify(out, null, 2);

  // Scrub before this ever reaches the repo.
  json = json.replace(/[\w.+-]+@[\w-]+\.[\w.]{2,}/g, '<redacted-email>');
  for (const term of REDACT) {
    if (!term) continue;
    json = json.split(term).join('<redacted>');
  }

  console.log(json);
  try { copy(json); } catch { /* copy() is console-only */ }
  return `Captured ${(json.length / 1024).toFixed(1)} KB from ${out.url} — copied to clipboard. `
    + 'Skim it for anything personal before committing.';
})();
