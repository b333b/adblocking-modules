// Ozon Bank: removes the banner carousel and the card offer from the main screen.
// Handles every place they arrive:
//   1. /m/lk/main                          the rendered banner markup and the banner data in the page
//   2. apps/main/_mf/info/MFEMainMobile    the banner widgets in the main-screen data
//   3. apps/promo/api/banners/list         the banner query
//   4. apps/loyalty/_mf/info/MFBonuses     the promo collections of the "Выгода" screen
// Caching headers are stripped so the changes apply on every launch.
// Settings arrive from the module as `key:value` pairs joined with &, e.g.
//   argument=carousel:true&card_offer:true&operations_banner:true&new_product:true&order_card:true&loyalty_promos:true
// Commas are what Shadowrocket uses to separate the parameters of a script line, so the
// argument must never contain one. A JSON object and a legacy "+"-joined list of widget
// type names are still accepted.
const arg = typeof $argument !== 'undefined' && $argument !== null ? String($argument) : '';
let S = null;
try { const j = JSON.parse(arg); if (j && typeof j === 'object') S = j; } catch (e) {}
if (!S && arg.indexOf(':') >= 0) {
  S = {};
  arg.split(/[&;,\n]+/).forEach((pair) => {
    const i = pair.indexOf(':');
    if (i > 0) S[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
  });
}
const legacyTypes = S ? [] : arg.split('+').map((t) => t.trim()).filter((t) => /^[A-Z_]+$/.test(t));
// Anything not explicitly switched off stays on, so an unsubstituted {{{placeholder}}}
// or a truncated argument falls back to "remove everything" rather than to doing nothing.
const off = (v) => v === false || v === 'false' || v === 0 || v === '0' || v === 'no' || v === 'off' || v === '';
const on = (k) => (S ? !off(S[k]) : legacyTypes.length === 0);

const TYPES = [];
if (legacyTypes.length) TYPES.push.apply(TYPES, legacyTypes);
else {
  if (on('carousel')) TYPES.push('MARKETING_BANNER_SLIDER');
  if (on('operations_banner')) TYPES.push('MARKETING_LAST_OPERATIONS_BANNER');
  if (on('new_product')) TYPES.push('NEW_PRODUCT_BUTTON');
  if (on('order_card')) TYPES.push('MAIN_ACCOUNT_ACTIONS');
}

const HIDE_SELECTORS = [];
if (on('card_offer')) HIDE_SELECTORS.push(
  '[data-testid="mfe-card-state"]',     // the ca-traffic card-state slot, any variant
  '[data-testid="order-plastic-v1"]',   // "Карта с выгодой…" with "Заказать бесплатно"
  '[data-testid="plastic-in-cart"]');   // "Ozon Карта в корзине"
if (on('carousel')) HIDE_SELECTORS.push('[data-testid="banners-on-main"]');
if (on('new_product')) HIDE_SELECTORS.push('[data-testid="new-product-block"]');
if (on('loyalty_promos')) HIDE_SELECTORS.push('[data-testid="priority-banner"]');

const BANNER_KEYS = ['bannerId', 'placementSlug', 'image', 'imageDark', 'config', 'creativeId'];
const MODULE_IDS = ['MFCardState%40ca-traffic', 'MFCardState@ca-traffic'];
const LOYALTY_KEYS = [
  'getHighestPriorityBanners',  // GetBannersList — partner/promo banner cells
  'promotionCellBanners',       // GetCashbackProgram — promo cells
  'getPromotionFiltersV2',      // GetLoyaltyPromotionFilter — "Выгода от партнёров"
  'activeLotteries',            // GetFRKBonusStateV2 — "Розыгрыши и акции"
  'availableLotteries',
];

// 1. The page carries finished banner markup as "MFPromoBanners…@promo": { data: { body: "…" } },
//    usually percent-encoded, with inner quotes escaped. Empty that body, leave every other module alone.
function emptySsrBanners(text) {
  const forms = [
    { id: /MFPromoBanners[A-Za-z]*%40promo/, key: '%22body%22%3A%22', quote: '%22', esc: '%5C' },
    { id: /MFPromoBanners[A-Za-z]*@promo/, key: '"body":"', quote: '"', esc: '\\' },
  ];
  for (const f of forms) {
    let pos = 0, guard = 0;
    while (guard++ < 10) {
      const rel = text.slice(pos).search(f.id);
      if (rel < 0) break;
      const idAt = pos + rel;
      const start = text.indexOf(f.key, idAt);
      if (start < 0 || start - idAt > 400) { pos = idAt + 20; continue; }
      const from = start + f.key.length;
      let i = from, end = -1;
      while (i < text.length) {
        const q = text.indexOf(f.quote, i);
        if (q < 0) break;
        let back = 0;
        while (q - (back + 1) * f.esc.length >= 0 && text.substr(q - (back + 1) * f.esc.length, f.esc.length) === f.esc) back++;
        if (back % 2 === 0) { end = q; break; }
        i = q + f.quote.length;
      }
      if (end > from) text = text.slice(0, from) + text.slice(end);
      pos = from;
    }
  }
  return text;
}

// 1b. The same page also carries the banner data the app rebuilds the carousel from during
//     hydration. Empty those lists too, counting brackets and respecting escapes.
function emptyEncodedArrays(text, keys) {
  const forms = [
    { quote: '%22', esc: '%5C', open: '%5B', close: '%5D', k: (n) => `%22${n}%22%3A%5B` },
    { quote: '"', esc: '\\', open: '[', close: ']', k: (n) => `"${n}":[` },
  ];
  for (const f of forms) {
    for (const name of keys) {
      const key = f.k(name);
      let pos = 0, guard = 0;
      while (guard++ < 20) {
        const at = text.indexOf(key, pos);
        if (at < 0) break;
        const from = at + key.length;
        let i = from, depth = 1, inStr = false;
        while (i < text.length && depth > 0) {
          if (inStr && text.startsWith(f.esc, i)) {
            i += f.esc.length;
            if (text.startsWith(f.esc, i)) i += f.esc.length;
            else if (text.startsWith(f.quote, i)) i += f.quote.length;
            else i += 1;
            continue;
          }
          if (text.startsWith(f.quote, i)) { inStr = !inStr; i += f.quote.length; continue; }
          if (!inStr && text.startsWith(f.open, i)) { depth++; i += f.open.length; continue; }
          if (!inStr && text.startsWith(f.close, i)) { depth--; if (!depth) break; i += f.close.length; continue; }
          i += 1;
        }
        if (depth === 0 && i > from) text = text.slice(0, from) + text.slice(i);
        pos = from;
      }
    }
  }
  return text;
}

// 1c. The card offer ("Карта с выгодой…" with the "Заказать бесплатно" button) is a module of
//     its own. Its markup sits in the page twice, encoded and plain, and the module can redraw
//     it on the client, so empty both copies and hide it with CSS.

function emptyModuleBodies(text) {
  for (const id of MODULE_IDS) {
    const enc = id.indexOf('%40') > 0;
    const key = enc ? '%22body%22%3A%22' : '"body":"';
    const quote = enc ? '%22' : '"';
    const esc = enc ? '%5C' : '\\';
    let pos = 0, guard = 0;
    while (guard++ < 10) {
      const idAt = text.indexOf(id, pos);
      if (idAt < 0) break;
      const start = text.indexOf(key, idAt);
      if (start < 0 || start - idAt > 400) { pos = idAt + id.length; continue; }
      const from = start + key.length;
      let i = from, end = -1;
      while (i < text.length) {
        const q = text.indexOf(quote, i);
        if (q < 0) break;
        let b = 0;
        while (q - (b + 1) * esc.length >= 0 && text.substr(q - (b + 1) * esc.length, esc.length) === esc) b++;
        if (b % 2 === 0) { end = q; break; }
        i = q + quote.length;
      }
      if (end > from) text = text.slice(0, from) + text.slice(end);
      pos = from;
    }
  }
  return text;
}

function injectHidingCss(text) {
  if (!HIDE_SELECTORS.length) return text;
  const css = `<style id="ozon-hide">${HIDE_SELECTORS.join(', ')} { display: none !important; }</style>`;
  const at = text.search(/<\/head>/i);
  if (at >= 0) return text.slice(0, at) + css + text.slice(at);
  const b = text.search(/<body[^>]*>/i);
  if (b >= 0) { const e = text.indexOf('>', b) + 1; return text.slice(0, e) + css + text.slice(e); }
  return text;
}

// 1d. The "Выгода" screen (loyalty module): its data ships inside the MFBonuses payload under
//     ctx.frontendFacade. Empty only the promo collections, leaving cashback balance,
//     monthly categories and the rest of the screen alone.

function emptyArraysUnder(node, keys, inside) {
  if (Array.isArray(node)) {
    if (inside) { node.length = 0; return; }
    node.forEach((v) => emptyArraysUnder(v, keys, false));
    return;
  }
  if (!node || typeof node !== 'object') return;
  for (const k of Object.keys(node)) {
    const hit = inside || keys.indexOf(k) >= 0;
    if (hit && Array.isArray(node[k])) node[k] = [];
    else emptyArraysUnder(node[k], keys, hit);
  }
}

// 2. Main-screen data: the listed widget types arrive with no data, the state the app uses for empty widgets.
function hideWidgets(node) {
  if (Array.isArray(node)) { node.forEach(hideWidgets); return; }
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string' && TYPES.includes(node.type) && node.data !== null) node.data = null;
  for (const k of Object.keys(node)) hideWidgets(node[k]);
}

// 3. Banner query: keep the response shape, empty the innermost arrays of banners.
function emptyBannerLists(node) {
  if (Array.isArray(node)) { node.forEach(emptyBannerLists); return; }
  if (!node || typeof node !== 'object') return;
  for (const k of Object.keys(node)) {
    const v = node[k];
    emptyBannerLists(v);
    if (Array.isArray(v) && v.length && v.every((x) => x && typeof x === 'object' && BANNER_KEYS.some((b) => b in x))) node[k] = [];
  }
}

const url = $request.url;
const body = $response.body || '';
let data = null;
try { data = JSON.parse(body); } catch (e) {}

let out = body;
if (data && typeof data === 'object') {
  if (/banners\/list/.test(url)) { if (on('carousel')) emptyBannerLists(data); }
  else if (/apps\/loyalty\/_mf\/info\//.test(url)) { if (on('loyalty_promos')) emptyArraysUnder(data, LOYALTY_KEYS, false); }
  else if (TYPES.length) hideWidgets(data);
  out = JSON.stringify(data);
} else if (/\/m\/lk\//.test(url) && body) {
  let page = body;
  if (on('carousel')) page = emptyEncodedArrays(emptySsrBanners(page), ['banners', 'creatives']);
  if (on('card_offer')) page = emptyModuleBodies(page);
  out = injectHidingCss(page);
}

const head = Object.assign({}, $response.headers || {});
for (const k of Object.keys(head)) {
  if (/^(cache-control|etag|expires|last-modified|age|pragma|content-length)$/i.test(k)) delete head[k];
}
head['Cache-Control'] = 'no-store, no-cache, must-revalidate';
head['Pragma'] = 'no-cache';

$done({ body: out, headers: head });
