// Last edited: 2026-11-13 23:57 MSK
/*
 * Yandex Eats (Яндекс Еда) iOS app: ads and promo cleaner (Shadowrocket http-response script)
 *
 * One script, routed by URL. Every handler fails open: if the body is not JSON
 * or the shape is unexpected, the original response is passed through ($done({})).
 *
 * Handlers (host eda.yandex.ru):
 *   main page, restaurant lists, filters   /eats/v1/layout-constructor/v1/layout
 *   department screens (food, pharmacy)    /eats/v1/bdui-mobile/v1/*
 *   launch pop-up slot                     /eats/v1/eats-launch/v1/welcome-features
 *
 * Settings are declared by the module (#!arguments); see the module file.
 */

const url = (typeof $request !== "undefined" && $request && $request.url) || "";

// ---------------------------------------------------------------- settings

// Settings arrive as `key:value` pairs joined with &. Never commas: Shadowrocket
// splits a script line on commas. A JSON object is accepted too. Anything not
// explicitly switched off stays on, so an unsubstituted {{{placeholder}}} or a
// cut argument falls back to the defaults.
const arg = typeof $argument !== "undefined" && $argument !== null ? String($argument) : "";
let S = null;
try { const j = JSON.parse(arg); if (j && typeof j === "object") S = j; } catch (e) {}
if (!S && arg.indexOf(":") >= 0) {
  S = {};
  arg.split(/[&;\n]+/).forEach((pair) => {
    const i = pair.indexOf(":");
    if (i > 0) S[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
  });
}
const off = (v) => v === false || /^(false|0|no|off)$/i.test(String(v == null ? "" : v).trim());
const on = (k) => (S ? !off(S[k]) : true);

// Layout widget types dropped from layout-constructor responses, per setting.
const TYPES_BY_SETTING = {
  ad_banners: ["madv_hero_banners"],                     // hero / "recommendation" ad banner carousels
  ad_popups: ["madv_popup_communications"],              // ad bottom sheet over the restaurant list
  promo_banners: ["banners_carousel"],                   // promo-code banner shelf (growth shelf)
  sponsored_shelves: ["sku_upsell_promo_carousel"],      // brand-paid product shelves (pharmacy, shops)
  goals: ["user_goals"],                                 // gamification goals ("order N times, get …")
  feedback: ["mini_feedback"],                           // "rate your order" widget
};
const DROP_TYPES = new Set();
for (const k in TYPES_BY_SETTING) if (on(k)) TYPES_BY_SETTING[k].forEach((t) => DROP_TYPES.add(t));
const extra = S && typeof S.extra === "string" ? S.extra : "";
extra.split(/[+\s]+/).filter((t) => /^[a-z][a-z0-9_]*$/i.test(t)).forEach((t) => DROP_TYPES.add(t));

const AD_BANNERS = on("ad_banners");
const AD_POPUPS = on("ad_popups");
const AD_TRACKERS = on("ad_trackers");

// ---------------------------------------------------------------- helpers

function isObj(o) {
  return o !== null && typeof o === "object" && !Array.isArray(o);
}

function walk(o, fn) {
  if (Array.isArray(o)) {
    for (let i = 0; i < o.length; i++) walk(o[i], fn);
  } else if (isObj(o)) {
    fn(o);
    for (const k in o) walk(o[k], fn);
  }
}

// "white_inventory": ad slots the app fills itself. Templates seen:
// madv_banners_eda_recommendation(_8) (banners between the restaurant lists) and
// market_popup_communication_yellow (ad pop-up). Only items that look like ads
// are dropped, in case the type is reused for something else.
function isAdWhiteInventory(w) {
  return isObj(w) && (/madv|market_popup|adv/i.test(String(w.template_name || "")) ||
    (isObj(w.payload) && isObj(w.payload.advertisement)));
}
function whiteInventoryWanted(w) {
  const t = String((w && w.template_name) || "");
  return /popup/i.test(t) ? AD_POPUPS : AD_BANNERS;
}

// Ad tracking block on restaurant cards and discounted dishes
// ({links: {view_url, click_url, view_urls, adv_context}, icon}): em.market.ya.ru
// pixels and the ad label. The card itself stays.
function isAdTracking(a) {
  return isObj(a) && (isObj(a.links) || Array.isArray(a.view_urls) || typeof a.view_url === "string");
}

// ---------------------------------------------------------------- handlers

// layout-constructor: { layout: [{id, type, payload}], data: {<type or type+"s">: [{id, template_name, payload}]} }
function handleLayout(body) {
  if (!isObj(body) || !Array.isArray(body.layout) || !isObj(body.data)) return false;
  let changed = false;
  const wi = Array.isArray(body.data.white_inventory) ? body.data.white_inventory : [];
  const adInventory = new Set(wi.filter((w) => isAdWhiteInventory(w) && whiteInventoryWanted(w)).map((w) => w.id));
  const dropIds = new Set();
  const kept = [];
  for (const item of body.layout) {
    if (item && item.type === "white_inventory" && adInventory.has(item.id)) {
      // Inline ad slot: no header of its own, so the one before it (if any) belongs to a list.
      dropIds.add(item.id);
      continue;
    }
    if (item && DROP_TYPES.has(item.type)) {
      dropIds.add(item.id);
      // Drop the section header introducing the widget ("Ваши цели", promo shelf title…).
      const prev = kept[kept.length - 1];
      if (prev && prev.type === "header") dropIds.add(kept.pop().id);
      continue;
    }
    kept.push(item);
  }
  if (dropIds.size) {
    body.layout = kept;
    for (const k of Object.keys(body.data)) {
      const v = body.data[k];
      if (Array.isArray(v)) {
        const f = v.filter((w) => !(w && dropIds.has(w.id)));
        if (f.length !== v.length) {
          if (f.length) body.data[k] = f; else delete body.data[k];
        }
      } else if (isObj(v) && dropIds.has(v.id)) {
        delete body.data[k];
      }
    }
    changed = true;
  }
  if (AD_TRACKERS) {
    walk(body.data, (o) => {
      if (isObj(o.features) && isAdTracking(o.features.advertisement)) { delete o.features.advertisement; changed = true; }
      if (isAdTracking(o.advertisement)) { delete o.advertisement; changed = true; }
    });
  }
  return changed;
}

// Department screens (bdui-mobile/v1/collection: food_department, pharm_department).
// Flex/DivKit envelope: ui.sections[], actions. Seen in Yandex Go's Eats (same
// backend): ad carousels are sections with origType CommonBannersWidget, the ad
// bottom sheet on open is a MadvPopupCommunicationsAction in actions.onAwake.
const BDUI_AD_SECTION = /Banner|Madv|Advert/i;
const AD_ACTION_TYPES = new Set(["MadvPopupCommunicationsAction"]);

function emptyDiv() {
  return { type: "container", orientation: "vertical", height: { type: "wrap_content", min_size: { unit: "px", value: 1 } }, items: [] };
}

// Keep the component (id/type/layout) but strip its content and actions.
function neuterComponent(c, body) {
  if (!isObj(c)) return;
  c.actions = {};
  c.divData = { log_id: (c.divData && c.divData.log_id) || c.id || "empty", states: [{ state_id: 0, div: emptyDiv() }] };
  if (c.divDataSharedId != null) {
    const shared = body && isObj(body.shared) && isObj(body.shared.divData) ? body.shared.divData : null;
    if (shared && shared[c.divDataSharedId]) shared[c.divDataSharedId] = c.divData;
    delete c.divDataSharedId;
  }
}

function stripActions(root, types) {
  let n = 0;
  walk(root, (o) => {
    for (const k in o) {
      const v = o[k];
      if (!Array.isArray(v)) continue;
      const f = v.filter((a) => !(isObj(a) && types.has(a.type)));
      if (f.length !== v.length) { o[k] = f; n += v.length - f.length; }
    }
  });
  return n;
}

function handleBdui(body) {
  const sections = body && body.ui && body.ui.sections;
  if (!Array.isArray(sections)) return false;
  let changed = false;
  if (AD_BANNERS) {
    for (const s of sections) {
      if (!isObj(s) || !BDUI_AD_SECTION.test(String(s.origType || ""))) continue;
      if (Array.isArray(s.content)) s.content.forEach((c) => neuterComponent(c, body));
      changed = true;
    }
  }
  if (AD_POPUPS && stripActions(body, AD_ACTION_TYPES)) changed = true;
  return changed;
}

// welcome-features: {popup_window: {payload: {}, type: "communications"}, …} is the
// server's own "no pop-up" state. A filled marketing pop-up is reset to it; the
// rest (address, loading screen, corporate balance) is left alone.
function handleWelcome(body) {
  if (!AD_POPUPS || !isObj(body) || !isObj(body.popup_window)) return false;
  const p = body.popup_window;
  if (p.type !== "communications" || !isObj(p.payload) || !Object.keys(p.payload).length) return false;
  p.payload = {};
  return true;
}

// ---------------------------------------------------------------- router

const ROUTES = [
  [/^https:\/\/eda\.yandex\.ru\/eats\/v1\/layout-constructor\/v1\/layout(\?|$)/, handleLayout],
  [/^https:\/\/eda\.yandex\.ru\/eats\/v1\/bdui-mobile\/v1\//, handleBdui],
  [/^https:\/\/eda\.yandex\.ru\/eats\/v1\/eats-launch\/v1\/welcome-features/, handleWelcome],
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { handleLayout, handleBdui, handleWelcome };
} else {
  (function main() {
    try {
      const raw = $response && $response.body;
      if (!raw || typeof raw !== "string") return $done({});
      const route = ROUTES.find(([re]) => re.test(url));
      if (!route) return $done({});
      const body = JSON.parse(raw);
      if (!route[1](body)) return $done({});
      $done({ body: JSON.stringify(body) });
    } catch (e) {
      console.log("[yandex-eats] " + url.split("?")[0] + " : " + e);
      $done({});
    }
  })();
}
