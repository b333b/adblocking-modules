/*
 * Avito ad cleanup — Shadowrocket http-response script
 * Endpoints are mapped from a ProxyPin capture of Avito iOS 230.1 (app id online.anero.app).
 * Every handler fails safe: on any parse error or unknown shape the original body is passed through.
 */

const url = $request.url;

// ---- tunables -------------------------------------------------------------

// Home feed (/api/N/main/items): items are single-key objects, e.g. {"banner": {...}}.
const FEED_DROP_KEYS = new Set([
  "embeddedAdvBanner",       // pre-rendered ad creative inside the feed response
  "banner",                  // placeholder -> triggers /adv/network/banner + Yandex SDK requests
  "searchPromoHeaderWidget", // hero promo header above the feed
]);

// Search results (/api/N/items?...): entries are {"type": ..., "value": ...}.
const SERP_DROP_TYPES = new Set([
  "banner",            // ad placeholder (avito + yandex list)
  "promoWidget",       // in-house promo card
  "actionPromoBanner", // closable promo banner
]);
// beduinV2ContentWidget is also used for legit content, so it is only dropped
// when its analytics widget_name looks like a banner/promo (e.g. sellervationSerpBanner).
const SERP_WIDGET_NAME_RE = /banner|promo/i;

// Item card (/api/N/card/items/<id>): top-level data blocks removed from `mobile`.
const CARD_DROP_KEYS = ["salesBanner", "beduinTeasers"];
// Item card server-driven layout (mobile.beduin): nodes hidden by identifier / componentType prefix.
const CARD_HIDE_IDS = new Set([
  "commercial",                    // ad slot (item_btf_ios)
  "commercialProfilePromoGallery",
  "salesAdvertPromoBanner",
  "salesBanner",
  "rewardsBanner",
  "fmpBanner",
]);
const CARD_HIDE_COMPONENT_PREFIXES = ["alfa_bank_banner"];

// ---- helpers --------------------------------------------------------------

function isBannerKey(k) {
  return FEED_DROP_KEYS.has(k) || /banner/i.test(k);
}

function widgetName(entry) {
  const ev = entry && entry.analytics && entry.analytics.events;
  if (!ev) return "";
  for (const id in ev) {
    const p = ev[id] && ev[id].params;
    if (p && p.widget_name) return String(p.widget_name);
  }
  return "";
}

function hideBeduinNodes(node) {
  let n = 0;
  if (Array.isArray(node)) {
    for (const x of node) n += hideBeduinNodes(x);
    return n;
  }
  if (!node || typeof node !== "object") return 0;
  const id = node.identifier;
  const ct = typeof node.componentType === "string" ? node.componentType : "";
  if ((id && CARD_HIDE_IDS.has(id)) || CARD_HIDE_COMPONENT_PREFIXES.some((p) => ct.startsWith(p))) {
    node.visible = false;
    node.layout_visible = false;
    n++;
  }
  for (const k of ["children", "child", "content"]) {
    if (node[k] && typeof node[k] === "object") n += hideBeduinNodes(node[k]);
  }
  return n;
}

// ---- handlers (each returns true if it changed the object) ----------------

function mainFeed(o) {
  if (!Array.isArray(o.items)) return false;
  const before = o.items.length;
  o.items = o.items.filter((it) => {
    if (!it || typeof it !== "object") return true;
    const keys = Object.keys(it);
    return !(keys.length === 1 && isBannerKey(keys[0]));
  });
  return o.items.length !== before;
}

function serp(o) {
  const r = o.result;
  if (!r || !Array.isArray(r.items)) return false;
  const before = r.items.length;
  r.items = r.items.filter((it) => {
    if (!it || typeof it.type !== "string") return true;
    if (SERP_DROP_TYPES.has(it.type) || /banner/i.test(it.type)) return false;
    if (it.type === "beduinV2ContentWidget" && SERP_WIDGET_NAME_RE.test(widgetName(it))) return false;
    return true;
  });
  return r.items.length !== before;
}

function favorites(o) {
  const s = o.success;
  if (!s || !Array.isArray(s.items)) return false;
  const before = s.items.length;
  s.items = s.items.filter((it) => {
    if (!it || typeof it !== "object") return true;
    const keys = Object.keys(it);
    return !(keys.length === 1 && /banner/i.test(keys[0]));
  });
  return s.items.length !== before;
}

function card(o) {
  const m = o.success && o.success.mobile;
  if (!m || typeof m !== "object") return false;
  let changed = false;
  for (const k of CARD_DROP_KEYS) {
    if (k in m) {
      delete m[k];
      changed = true;
    }
  }
  const root = m.beduin && m.beduin.main && m.beduin.main.rootComponent;
  if (root && hideBeduinNodes(root) > 0) changed = true;
  return changed;
}

function itemBanners(o) {
  const s = o.success;
  if (!s || !s.positions || typeof s.positions !== "object") return false;
  if (Object.keys(s.positions).length === 0) return false;
  s.positions = {};
  return true;
}

function internalBanners(o) {
  const s = o.success;
  if (!s || !s.banners || typeof s.banners !== "object") return false;
  if (Object.keys(s.banners).length === 0) return false;
  s.banners = {};
  return true;
}

function profileItemsBanner(o) {
  const r = o.result;
  if (!r || !("banner" in r)) return false;
  delete r.banner;
  return true;
}

// ---- router ---------------------------------------------------------------

const ROUTES = [
  [/\/api\/\d+\/main\/items(\?|$)/, mainFeed],
  [/\/api\/\d+\/items\/\d+\/banners(\?|$)/, itemBanners],
  [/\/api\/\d+\/items(\?|$)/, serp],
  [/\/api\/\d+\/favorites\/items\/list(\?|$)/, favorites],
  [/\/api\/\d+\/card\/items\/\d+(\?|$)/, card],
  [/\/api\/\d+\/internalBannerRotation\/banners(\?|$)/, internalBanners],
  [/\/api\/\d+\/serp\/profile\/items\/banner(\?|$)/, profileItemsBanner],
];

(function main() {
  try {
    const route = ROUTES.find(([re]) => re.test(url));
    if (!route || !$response.body) return $done({});
    const obj = JSON.parse($response.body);
    if (!obj || typeof obj !== "object") return $done({});
    if (route[1](obj)) return $done({ body: JSON.stringify(obj) });
    return $done({});
  } catch (e) {
    console.log("[avito] " + url.split("?")[0] + " -> " + e);
    return $done({});
  }
})();
