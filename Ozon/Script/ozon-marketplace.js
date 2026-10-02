// Ozon Marketplace (api.ozon.ru): removes ad and promo widgets from composer page responses.
//
// A composer page is { layout: [ {component, stateId, name, placeholders[]}, … ],
// widgetStates: { "<stateId>": "<json string>" }, … }. A widget is dropped from the layout
// (top level or nested in another widget's placeholders) and its widgetStates entry with it.
// Everything else — products, cart, orders, paging tokens — is passed through untouched.
//
// Ad tiles inside result grids (banners labelled "Реклама", sponsored products) are
// removed from the widget state as well.
//
// Settings are declared by the module; see the header below.
const DEFAULT_COMPONENTS = [
  'advBanner',              // rtb.advBanner — sponsored banner
  'advVideoBannerMobile',   // rtb.advVideoBannerMobile — sponsored video
  'advRefreshWithDelay',    // rtb.* — reloads the page to serve fresh ads
  'adBanner',               // skeeter.* — bank/product banners
  'entryBannerWidget',      // regulardraw.* — prize draw entry banner
];
// Widgets whose name starts with one of these are dropped whatever the component is.
const DROP_NAME_PREFIXES = ['rtb.'];

// Ads inside result grids: banner tiles labelled "Реклама" and sponsored product tiles
// (their add-to-cart action carries an `advert` token). widgetStates values are JSON strings.
const AD_BADGE = /^реклама$/i;

// Settings come from the module's #!arguments as a JSON object, e.g.
//   argument={"ad_widgets":true,"curtains":true,"grid_ad_banners":true,"sponsored_products":true,"extra":""}
// A legacy "+"-joined list of component names still works.
const arg = typeof $argument !== 'undefined' ? String($argument) : '';
let S = null;
try { S = JSON.parse(arg); } catch (e) {}
const legacy = S ? [] : arg.split('+').map((t) => t.trim()).filter((t) => /^[A-Za-z][A-Za-z0-9_]*$/.test(t));
const on = (k) => (S ? S[k] !== false && S[k] !== 'false' && S[k] !== 0 : true);

const COMPONENTS = legacy.length ? legacy : [];
if (!legacy.length) {
  if (on('ad_widgets')) COMPONENTS.push.apply(COMPONENTS, DEFAULT_COMPONENTS);
  if (on('curtains')) COMPONENTS.push('curtain');
  const extra = S && typeof S.extra === 'string' ? S.extra : '';
  extra.split(/[+,\s]+/).filter((t) => /^[A-Za-z][A-Za-z0-9_]*$/.test(t)).forEach((t) => COMPONENTS.push(t));
}
const KEEP_TILES = !(on('grid_ad_banners') || on('sponsored_products'));
const KEEP_SPONSORED = !on('sponsored_products');
const KEEP_GRID_BANNERS = !on('grid_ad_banners');

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

const hasAdvert = (node, depth) => {
  if (depth > 8 || !node || typeof node !== 'object') return false;
  if (!Array.isArray(node) && node.extendMap && typeof node.extendMap === 'object' && node.extendMap.advert) return true;
  for (const k of Object.keys(node)) if (hasAdvert(node[k], depth + 1)) return true;
  return false;
};

const isAdTile = (t) => {
  if (!t || typeof t !== 'object') return false;
  if (!KEEP_GRID_BANNERS && t.type === 'banner' && t.banner) {
    const b = t.banner.badges;
    if (Array.isArray(b) && b.some((x) => x && typeof x.text === 'string' && AD_BADGE.test(x.text.trim()))) return true;
  }
  if (!KEEP_SPONSORED && t.type === 'product' && hasAdvert(t.product, 0)) return true;
  return false;
};

let tilesDropped = 0;
function pruneTiles(states) {
  for (const key of Object.keys(states)) {
    const raw = states[key];
    if (typeof raw !== 'string' || raw.indexOf('"tiles"') < 0) continue;
    let s;
    try { s = JSON.parse(raw); } catch (e) { continue; }
    if (!s || !Array.isArray(s.tiles)) continue;
    const kept = s.tiles.filter((t) => !isAdTile(t));
    if (kept.length === s.tiles.length) continue;
    tilesDropped += s.tiles.length - kept.length;
    s.tiles = kept;
    states[key] = JSON.stringify(s);
  }
}

const body = $response.body || '';
let data = null;
try { data = JSON.parse(body); } catch (e) {}

if (data && typeof data === 'object' && Array.isArray(data.layout)) {
  prune(data.layout);
  if (data.widgetStates && typeof data.widgetStates === 'object') {
    for (const id of removed) if (id in data.widgetStates) delete data.widgetStates[id];
    if (!KEEP_TILES) pruneTiles(data.widgetStates);
  }
}

$done(removed.length || tilesDropped ? { body: JSON.stringify(data) } : {});
