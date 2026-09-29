// Ozon Marketplace (api.ozon.ru): removes ad and promo widgets from composer page responses.
//
// A composer page is { layout: [ {component, stateId, name, placeholders[]}, … ],
// widgetStates: { "<stateId>": "<json string>" }, … }. A widget is dropped from the layout
// (top level or nested in another widget's placeholders) and its widgetStates entry with it.
// Everything else — products, cart, orders, paging tokens — is passed through untouched.
//
// Module argument overrides the list, joined with +:
//   argument=advBanner+advVideoBannerMobile+adBanner
const DEFAULT_COMPONENTS = [
  'advBanner',              // rtb.advBanner — sponsored banner
  'advVideoBannerMobile',   // rtb.advVideoBannerMobile — sponsored video
  'advRefreshWithDelay',    // rtb.* — reloads the page to serve fresh ads
  'adBanner',               // skeeter.* — bank/product banners
  'entryBannerWidget',      // regulardraw.* — prize draw entry banner
  'curtain',                // pop-up curtain banners
];
// Widgets whose name starts with one of these are dropped whatever the component is.
const DROP_NAME_PREFIXES = ['rtb.'];

const arg = typeof $argument !== 'undefined' ? String($argument) : '';
const fromArg = arg.split('+').map((t) => t.trim()).filter((t) => /^[A-Za-z][A-Za-z0-9_]*$/.test(t));
const COMPONENTS = fromArg.length ? fromArg : DEFAULT_COMPONENTS;

const removed = [];
const isAd = (w) =>
  w && typeof w === 'object' &&
  (COMPONENTS.indexOf(w.component) >= 0 ||
   (typeof w.name === 'string' && DROP_NAME_PREFIXES.some((p) => w.name.indexOf(p) === 0)));

function prune(widgets) {
  if (!Array.isArray(widgets)) return widgets;
  for (let i = widgets.length - 1; i >= 0; i--) {
    const w = widgets[i];
    if (isAd(w)) { removed.push(w.stateId || w.component); widgets.splice(i, 1); continue; }
    if (w && Array.isArray(w.placeholders)) {
      for (const p of w.placeholders) if (p && Array.isArray(p.widgets)) prune(p.widgets);
    }
  }
  return widgets;
}

const body = $response.body || '';
let data = null;
try { data = JSON.parse(body); } catch (e) {}

if (data && typeof data === 'object' && Array.isArray(data.layout)) {
  prune(data.layout);
  if (removed.length && data.widgetStates && typeof data.widgetStates === 'object') {
    for (const id of removed) if (id in data.widgetStates) delete data.widgetStates[id];
  }
}

$done(removed.length ? { body: JSON.stringify(data) } : {});
