// Last edited: 2026-11-20 17:27 MSK
/*
 * Yandex Market iOS app ("Beru"): ads and promo cleaner (Shadowrocket http-response script)
 *
 * The app builds every screen from server-driven JSON on mapi.market.yandex.net:
 *   { ui: { sections: [ {id, origType, content: [ {id, type, divDataSharedId, actions} ],
 *                        tabsContent: [ {tabId, snippets: [ {type, snippet: {...}} ]} ] } ] },
 *     shared: { divData: { <id>: {log_id, states: [{state_id, div}]} }, sections, ... }, actions, ... }
 * Each section item points at its DivKit block in shared.divData. An unwanted section keeps
 * its place (other actions and triggers refer to it by id) but loses its items and their
 * DivKit blocks, so there is nothing left to draw and no ad pixel fires; unwanted feed
 * snippets are removed from their list the same way. (Until 2026-11-20 the items were kept
 * with an empty DivKit block instead; on device the hero carousel still showed.)
 *
 * Routes (host mapi.market.yandex.net):
 *   /api/screen/*                       every screen (main, feed pages, cart, profile, ...)
 *   /api/media-adv/sdk                  urban-ads banner unit (search hero), every section emptied
 *   /api/action/media-adv/market_popup  ad pop-up action, replaced by an empty action
 *
 * Every handler fails open: unexpected shape → original body ($done({})).
 * Settings are declared by the module (#!arguments); see the module file.
 */

const url = (typeof $request !== "undefined" && $request && $request.url) || "";

// ---------------------------------------------------------------- settings

// key:value pairs joined with & (never commas: Shadowrocket splits a script line on commas).
// A JSON object is accepted too. Anything not explicitly off stays on, so an unsubstituted
// {{{placeholder}}} or a cut argument falls back to the defaults.
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

const AD_BANNERS = on("ad_banners");
const AD_POPUPS = on("ad_popups");

// Sections emptied whole, by origType (or, for the extra setting, also by section id).
const SECTIONS_BY_SETTING = {
  promo_header: ["PromoHeaderRedesignSectionRenderData"],     // promo strip: prize draws, "coins for watching", live stream, 1 ₽ Plus offer, prize wheel
  fintech: ["FintechSectionRenderData"],                       // profile: Pay card, credit "до 997 000 ₽", Split and Plus offers
  referral: ["ProfileReferralPaymentSectionRenderData"],       // profile: "Рекомендуйте за награду"
  review_nags: ["ProfilePersMasterAgitationSectionRenderData"], // profile: "Получите N за отзыв"
};
const NEUTER_SECTIONS = new Set();
for (const k in SECTIONS_BY_SETTING) if (on(k)) SECTIONS_BY_SETTING[k].forEach((t) => NEUTER_SECTIONS.add(t));
const extra = S && typeof S.extra === "string" ? S.extra : "";
extra.split(/[+\s]+/).filter((t) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(t)).forEach((t) => NEUTER_SECTIONS.add(t));

// Ad sections: hero carousel (content type MediaAdvHeroCarousel), other media-adv / urban-ads units.
const AD_SECTION_RE = /MediaAdv|Madv|UrbanAds|SdkBanner|HeroCarousel/i;

// Feed snippets (main-screen feed, its next pages, the feed under an empty cart).
function feedSnippetUnwanted(id) {
  id = String(id || "");
  // "Реклама" units in the feed: feedbox-media-adv-banner-* (banner), feedbox-media-adv-shelf-*
  // (brand-paid product shelf, since Nov 2026), and any other feedbox-media-adv-* kind.
  if (AD_BANNERS && id.indexOf("feedbox-media-adv") === 0) return true;
  if (on("review_nags") && id.indexOf("agitation_id") === 0) return true;      // "Как вам товар?" rating nag
  return false;
}

// Actions that preload an ad unit (hero banner on the empty-search screen).
const AD_ACTION_TYPES = new Set(["UrbanAdsPreloadAction"]);

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

function divDataOf(body) {
  return body && isObj(body.shared) && isObj(body.shared.divData) ? body.shared.divData : null;
}

// Empty a section: drop its items and their shared DivKit blocks. The section itself stays,
// so shared.sections, sectionLabels and triggers that update it by id still find it.
function emptySection(s, body) {
  const dd = divDataOf(body);
  for (const c of s.content) {
    const key = isObj(c) ? c.divDataSharedId : null;
    if (dd && key != null) delete dd[key];
  }
  s.content = [];
}

// Drop actions of the given types from every action list, including lists encoded as JSON
// strings inside DeferredDecodingAction.actionRaw.
function stripActions(root, types) {
  let n = 0;
  const strip = (o) => {
    walk(o, (x) => {
      for (const k in x) {
        const v = x[k];
        if (Array.isArray(v)) {
          const kept = v.filter((a) => !(isObj(a) && types.has(a.type)));
          if (kept.length !== v.length) { x[k] = kept; n += v.length - kept.length; }
        }
      }
      if (x.type === "DeferredDecodingAction" && typeof x.actionRaw === "string") {
        let hit = false;
        types.forEach((t) => { if (x.actionRaw.indexOf(t) >= 0) hit = true; });
        if (!hit) return;
        try {
          const inner = JSON.parse(x.actionRaw);
          const before = n;
          strip(inner);
          if (n !== before) x.actionRaw = JSON.stringify(inner);
        } catch (e) {}
      }
    });
  };
  strip(root);
  return n;
}

// Yandex ad-network impression pixels (yandex.ru/an/rtbcount, /an/count) that the screen fires
// itself for the hero carousel. Replaced by an empty action wherever they sit. Pixels pointing
// elsewhere (em.market.ya.ru billing on ordinary products) are left to the host rules.
const AD_PIXEL_RE = /^https?:\/\/(?:[\w-]+\.)*yandex\.ru\/an\//;
function isAdNetworkPixel(a) {
  return isObj(a) && a.type === "AdvertisementPixelBillingAction" && AD_PIXEL_RE.test(String(a.impression || a.url || ""));
}
function stripAdNetworkPixels(root) {
  let n = 0;
  walk(root, (x) => {
    for (const k in x) {
      const v = x[k];
      if (Array.isArray(v)) {
        const kept = v.filter((a) => !isAdNetworkPixel(a));
        if (kept.length !== v.length) { x[k] = kept; n += v.length - kept.length; }
      } else if (isAdNetworkPixel(v)) {
        x[k] = { type: "ListAction", actions: [] };
        n++;
      }
    }
  });
  return n;
}

function sectionIsAd(s) {
  if (AD_SECTION_RE.test(String(s.origType || ""))) return true;
  return Array.isArray(s.content) && s.content.some((c) => isObj(c) && AD_SECTION_RE.test(String(c.type || "")));
}

function filterSnippets(list, body) {
  if (!Array.isArray(list)) return list;
  const dd = divDataOf(body);
  return list.filter((sn) => {
    const x = isObj(sn) && isObj(sn.snippet) ? sn.snippet : sn;
    if (!isObj(x) || !feedSnippetUnwanted(x.id)) return true;
    const key = x.divDataSharedId || x.id;
    if (dd && key != null) delete dd[key];
    return false;
  });
}

// ---------------------------------------------------------------- handlers

function handleScreen(body) {
  if (/\/api\/screen\/media-adv\//.test(url)) return false; // "hide this ad" feedback screen
  const sections = body && isObj(body.ui) && body.ui.sections;
  if (!Array.isArray(sections)) return false;
  let changed = false;
  for (const s of sections) {
    if (!isObj(s)) continue;
    const unwanted = (AD_BANNERS && sectionIsAd(s)) ||
      NEUTER_SECTIONS.has(String(s.origType || "")) || NEUTER_SECTIONS.has(String(s.id || ""));
    if (unwanted && Array.isArray(s.content) && s.content.length) {
      emptySection(s, body);
      changed = true;
      continue;
    }
    if (Array.isArray(s.tabsContent)) {
      for (const tab of s.tabsContent) {
        if (!isObj(tab) || !Array.isArray(tab.snippets)) continue;
        const kept = filterSnippets(tab.snippets, body);
        if (kept.length !== tab.snippets.length) { tab.snippets = kept; changed = true; }
      }
    }
    if (Array.isArray(s.content) && s.content.some((c) => isObj(c) && isObj(c.snippet))) {
      const kept = filterSnippets(s.content, body);
      if (kept.length !== s.content.length) { s.content = kept; changed = true; }
    }
  }
  if (AD_BANNERS && stripActions(body, AD_ACTION_TYPES)) changed = true;
  if (AD_BANNERS && stripAdNetworkPixels(body)) changed = true;
  return changed;
}

// Urban-ads unit (seen only as a preload target in this capture): empty whatever sections it has.
function handleMediaAdvSdk(body) {
  if (!AD_BANNERS) return false;
  const sections = body && isObj(body.ui) && body.ui.sections;
  if (!Array.isArray(sections)) return false;
  let changed = false;
  for (const s of sections) {
    if (isObj(s) && Array.isArray(s.content) && s.content.length) {
      emptySection(s, body);
      changed = true;
    }
  }
  return changed;
}

// Ad pop-up: action endpoints answer {action, shared}; an empty ListAction does nothing.
function handleMarketPopup(body) {
  if (!AD_POPUPS || !isObj(body) || !isObj(body.action)) return false;
  body.action = { type: "ListAction", actions: [] };
  return true;
}

// ---------------------------------------------------------------- router

const ROUTES = [
  [/^https:\/\/mapi\.market\.yandex\.net\/api\/screen\//, handleScreen],
  [/^https:\/\/mapi\.market\.yandex\.net\/api\/media-adv\/sdk/, handleMediaAdvSdk],
  [/^https:\/\/mapi\.market\.yandex\.net\/api\/action\/media-adv\/market_popup/, handleMarketPopup],
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { handleScreen, handleMediaAdvSdk, handleMarketPopup };
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
      console.log("[yandex-market] " + url.split("?")[0] + " : " + e);
      $done({});
    }
  })();
}
