// Yandex Maps: strip UI/ad experiment flags from mapkit2/config (protobuf, binary-body-mode=1)
// and edit the JSON configs (startup, config, compliance, notifications...) (text mode).
// Structure: top-level field 32 = experiments; its field 1 = one experiment;
// inside, field 4 = {1: namespace, 2: key, 3: value}. Removing a field-4 entry = flag not set.

// ===== Chip row under the search bar (server list v1/search/categories, maps_platform=mobile_maps_search) =====
// Confirmed source of the row. An empty list makes the app fall back to its own set, so the list
// must stay non-empty but contain nothing the app can draw.
//   "unknownType" one entry with an unknown type/action (app should skip it)   <- try first
//   "noTitle"     one entry with an empty title
//   "empty"       valid empty list (known result: app falls back, row stays)
//   "canary"      first three entries renamed "ТЕСТ-3" (diagnostic)
//   "off"         leave the list alone (sponsored chips still removed)
// Other lists (search screen, navigation) are only stripped of sponsored entries.
const CATEGORY_MODE = "unknownType";
const CANARY = false; // labels the fallback lists in startup ("ТЕСТ-1") and v1/config ("ТЕСТ-2")

// ===== How to answer the showcase feed (v1/search/discovery) =====
//   "strip"     real response with the places removed (keeps paging/region info)   <- try first
//   "status404" HTTP 404, no body
//   "status204" HTTP 204, no content
//   "broken"    "{}" = what the very first module did (no bounce, but shows the error text)
//   "off"       leave the feed alone
const FEED_MODE = "strip";

// ===== Switches: set a group to false to keep those flags as Yandex sends them =====
const ON = {
  addHome:          true,  // "Добавить дом"
  whereTo:          true,  // big "Куда?" layout (false = keep big button)
  ai:               true,  // "Спросить AI"
  searchBarExtras:  true,  // Alice in search bar, rotating hints timer, personalized context  <- test first
  showcase:         true,  // "Рекомендации" sheet, its chip row, tabs, feed
  locationPrompt:   true,  // "Уточнить геолокацию"
  plus:             true,  // Plus icons in dock/menu/profile
  ads:              true,  // ad pins, promo objects, banners, sponsored suggest
  nags:             true,  // forced registration, rate-the-app
  taxiTab:          true,  // taxi tab on main screen
  bottomBar:        false, // no effect in 30.3.1: the big-icon bar is the built-in default
  jsonSearchHints:  true,  // empty hint lists in startup config
  notifications:    true   // promo banners above the search bar (goose cursor etc.)
};

const GROUPS = {
  addHome: ["suggest_add_home"],
  whereTo: ["removing_search_bar"],
  ai: ["ai_search_agent", "ai_search_agent_map", "experimental_webview_aiAssistantOnboarding"],
  searchBarExtras: ["two_alice_main_screen", "hints_in_search_bar_timeout", "use_personalized_poi_context"],
  showcase: ["discovery_shutter_title", "discovery_feed_map_enabled"],
  locationPrompt: ["pin_user_location", "pin_user_location_ttl", "pin_user_location_skip_sheet"],
  plus: ["tab_bar_benefits_icon_1", "menu_screen_config_plus_icon", "profile_config_icons", "profile_config_russpass_summer_icon"],
  ads: ["ads_promo_object_geodisplay", "ads_promo_object_geo_cpm_config", "ads_promo_object_can_show_cooldown_sec",
    "ad_bppm", "ad_korzh", "ad_korzh_cooldown_in_seconds", "ad_pins_in_freedrive_enabled",
    "ad_relevant_branded_pins_settings", "ad_special_card_rich_banner", "ad_special_pin_hints",
    "ad_special_serp_badge_click", "ad_via", "ad_zsb", "ads_free_promo_campaign",
    "ads_offer_badge_reviews_compact", "ads_special_doubloons_banner", "adsdk_in_bppm",
    "adv_filters", "advert_ChainFilter_On_Map", "direct_zsb", "two_ad_bb_pins",
    "one_ad_for_premium_pin", "pedestrian_banner_ad", "new_design_toponym", "serp_banner_redesign",
    "experimental_agent_promo", "experimental_promo_by_context", "experimental_promo_context_pos",
    "experimental_promo_prefix_pos", "experimental_promo_tags", "trx_care_config", "scooters_route_screen_promo"],
  nags: ["force_registration_frequency", "force_registration_intro_frequency", "rate_me_percentage"],
  taxiTab: ["taxi_tab_on_main_screen"]
};

const DROP = new Set();
for (const g in GROUPS) if (ON[g]) GROUPS[g].forEach(k => DROP.add(k));

// Flags to keep but with a different value
const SET = {};
// Bottom bar: "old"      = remove the new-design flag -> the thin bar the app shows before its config loads
//             "noTitles" = keep new design, hide the captions
const BOTTOM_BAR = "old";
if (ON.bottomBar && BOTTOM_BAR === "old") DROP.add("tab_bar_new_design");
if (ON.bottomBar && BOTTOM_BAR === "noTitles") SET["tab_bar_new_design"] = '{"tabs": ["navi", "refuel", "mt", "taxi"], "hide_titles": true}';
// "Рекомендации" sheet + its chip row ("Для вас", "Где поесть"...). Dropping the flag isn't enough:
// the app falls back to a built-in default that has it on. So keep the flag, with everything switched off.
// original: {"enabled":true,"onlyLoggedIn":false,"discoveryEntryPointForShutterOnTheMainScreen":true,"filters":true,
//   "additionalActions":true,"keepIntentOnCollapse":true,"setMapIntent":true,"contentStickingOutHeight":64,"restoreLastRegionOnStart":true}
if (ON.showcase) SET["discovery_shutter_on_the_main_screen"] = '{"enabled":false,"onlyLoggedIn":true,"discoveryEntryPointForShutterOnTheMainScreen":false,"filters":false,"additionalActions":false,"keepIntentOnCollapse":false,"setMapIntent":false,"contentStickingOutHeight":0,"restoreLastRegionOnStart":false}';
// original: {"tabs": ["navi", "refuel", "custom", "mt", "taxi"], "hide_titles": false}

function readVarint(b, i) {
  let r = 0, s = 0, c;
  do { c = b[i++]; r += (c & 0x7f) * Math.pow(2, s); s += 7; } while (c & 0x80);
  return [r, i];
}
function writeVarint(n) {
  const out = [];
  while (n > 127) { out.push((n % 128) | 0x80); n = Math.floor(n / 128); }
  out.push(n);
  return out;
}
// Split a message into fields: {num, type, start, end, dStart, dEnd}
function fields(b, from, to) {
  const res = [];
  let i = from;
  while (i < to) {
    const start = i;
    let key; [key, i] = readVarint(b, i);
    const num = Math.floor(key / 8), type = key & 7;
    let dStart = i, dEnd;
    if (type === 0) { [, i] = readVarint(b, i); dEnd = i; }
    else if (type === 1) { i += 8; dEnd = i; }
    else if (type === 5) { i += 4; dEnd = i; }
    else if (type === 2) { let len; [len, i] = readVarint(b, i); dStart = i; i += len; dEnd = i; }
    else throw new Error("wire type " + type);
    if (i > to) throw new Error("overrun");
    res.push({ num, type, start, end: i, dStart, dEnd });
  }
  return res;
}
function lenField(num, payload) {
  return [].concat(writeVarint(num * 8 + 2), writeVarint(payload.length), payload);
}
function slice(b, s, e) { return Array.prototype.slice.call(b, s, e); }
function str(b, s, e) {
  let t = ""; for (let k = s; k < e; k++) t += String.fromCharCode(b[k]); return t;
}

function utf8(s) {
  const e = unescape(encodeURIComponent(s)), out = [];
  for (let k = 0; k < e.length; k++) out.push(e.charCodeAt(k));
  return out;
}
function rewriteKV(b, f) { // returns null to drop
  const gs = fields(b, f.dStart, f.dEnd);
  let key = null;
  for (const g of gs) if (g.num === 2 && g.type === 2) key = str(b, g.dStart, g.dEnd);
  if (key !== null && DROP.has(key)) return null;
  if (key !== null && Object.prototype.hasOwnProperty.call(SET, key)) {
    let out = [];
    for (const g of gs) if (g.num !== 3) out = out.concat(slice(b, g.start, g.end));
    out = out.concat(lenField(3, utf8(SET[key])));
    return lenField(f.num, out);
  }
  return slice(b, f.start, f.end);
}
function rewriteExperiment(b, f) {
  let out = [];
  for (const g of fields(b, f.dStart, f.dEnd)) {
    if (g.num === 4 && g.type === 2) { const kv = rewriteKV(b, g); if (kv) out = out.concat(kv); }
    else out = out.concat(slice(b, g.start, g.end));
  }
  return lenField(f.num, out);
}
function rewriteExperiments(b, f) {
  let out = [];
  for (const g of fields(b, f.dStart, f.dEnd)) {
    if (g.num === 1 && g.type === 2) out = out.concat(rewriteExperiment(b, g));
    else out = out.concat(slice(b, g.start, g.end));
  }
  return lenField(f.num, out);
}
function rewrite(b) {
  let out = [];
  for (const f of fields(b, 0, b.length)) {
    if (f.num === 32 && f.type === 2) out = out.concat(rewriteExperiments(b, f));
    else out = out.concat(slice(b, f.start, f.end));
  }
  return new Uint8Array(out);
}

// ---- JSON configs ----
function canaryList(list, label) { // keep the first entry, rename it
  if (!Array.isArray(list) || !list.length) return [];
  const c = JSON.parse(JSON.stringify(list[0]));
  c.title = { ru: label, en: label };
  return [c];
}
function editJSON(url, d) {
  if (/\/v2\/startup\//.test(url)) {
    if (d["tab-bar-custom-icons"]) d["tab-bar-custom-icons"].icons = [];
    if (ON.jsonSearchHints) {
      if (d["maps-search-hints"]) d["maps-search-hints"].hints = [];
      const h2 = d["maps-search-hints-v2"];
      if (h2) { h2.hints = []; if (h2.sets) for (const k in h2.sets) h2.sets[k] = []; }
    }
    const di = d["maps-discovery-intents-config"];
    if (di && di.configs) di.configs.forEach(c => { c.intent_sets = []; c.tab_entry_point_regions = []; c.discovery_regions = []; });
    if (d["maps-search-categories"]) d["maps-search-categories"].search_categories =
      CANARY ? canaryList(d["maps-search-categories"].search_categories, "ТЕСТ-1") : [];
    const sb = d["maps-search-results-banners"];
    if (sb) for (const k in sb) if (Array.isArray(sb[k])) sb[k] = [];
    if (d["maps-adverts-on-map-3d"]) d["maps-adverts-on-map-3d"].campaigns = [];
    const pm = d["profile-menu-icons"];
    const drop = ["minusovik", "plusovik", "svoi_plusi", "russpass_summer"];
    if (pm && pm.icons) pm.icons = pm.icons.filter(i => drop.indexOf(i.id) < 0);
  } else if (/\/v1\/config\//.test(url)) {
    d.search_categories = CANARY ? canaryList(d.search_categories, "ТЕСТ-2") : [];
    d.ad_chains = [];
  } else if (/\/v1\/compliance_config\//.test(url)) {
    const f = d.contentConfig && d.contentConfig.maps_ui_flags;
    if (f) { f.show_plus = false; f.show_routes_taxi_banner = false; f.show_delivery_food = false; f.show_help_nearby = false; }
  } else if (/by_point\/notifications/.test(url)) {
    if (!ON.notifications) return null;
    // Must look exactly like the server's own "nothing here" answer: type "empty".
    // Leaving type "rich" with no items makes the banner slot open and collapse on every map move.
    d.notifications = [];
    if (d.meta) d.meta.type = "empty";
  } else if (/discovery\/search\/intro|search\/tooltips/.test(url)) {
    d.items = [];
    if (d.meta) d.meta.type = "empty";
  } else if (/app\.tanker\.yandex\.net\/user\/profile/.test(url)) {
    if (d.settings) d.settings.isShowYandexPlusWidget = false;
  } else return null;
  return d;
}

// Server category list (protobuf): repeated field 1 = category
//   {1: title, 2: search text, 3: type (regular|special), 4: id, 5: icon style, 6: image, 8: action (search_query|link), 9: uri}
// top-level field 4 = sponsored chips
function categories(b, mainRow) {
  const mode = mainRow ? CATEGORY_MODE : "off";
  if (mode === "empty") return new Uint8Array(0);
  let out = [], n = 0;
  for (const f of fields(b, 0, b.length)) {
    if (f.num === 4) continue;                                   // sponsored chips, always removed
    if (f.num === 1 && f.type === 2) {
      if (mode === "off") { out = out.concat(slice(b, f.start, f.end)); continue; }
      const limit = mode === "canary" ? 3 : 1;
      if (n++ >= limit) continue;
      let item = [];
      for (const g of fields(b, f.dStart, f.dEnd)) {
        if (mode === "canary" && g.num === 1) item = item.concat(lenField(1, utf8("ТЕСТ-3")));
        else if (mode === "noTitle" && (g.num === 1 || g.num === 2)) item = item.concat(lenField(g.num, []));
        else if (mode === "unknownType" && g.num === 3) item = item.concat(lenField(3, utf8("hidden")));
        else if (mode === "unknownType" && g.num === 8) item = item.concat(lenField(8, utf8("none")));
        else item = item.concat(slice(b, g.start, g.end));
      }
      out = out.concat(lenField(1, item));
    } else out = out.concat(slice(b, f.start, f.end));
  }
  return new Uint8Array(out);
}

function stripFeed(b) { // drop top-level field 1 (the place cards), keep everything else
  let out = [];
  for (const f of fields(b, 0, b.length)) if (f.num !== 1) out = out.concat(slice(b, f.start, f.end));
  return new Uint8Array(out);
}

(function main() {
  if (typeof $response === "undefined") return;
  const url = (typeof $request !== "undefined" && $request.url) || "";
  try {
    if (/\/v1\/search\/categories/.test(url)) {
      let src = $response.bodyBytes || $response.body;
      if (src instanceof ArrayBuffer) src = new Uint8Array(src);
      if (!src || typeof src === "string" || (src.length > 1 && src[0] === 0x1f && src[1] === 0x8b)) { $done({}); return; }
      $done({ body: categories(src, /maps_platform=mobile_maps_search(&|$)/.test(url)) });
    } else if (/\/v1\/search\/discovery/.test(url)) {
      if (FEED_MODE === "status404") { $done({ status: 404, headers: { "Content-Type": "text/plain" }, body: "" }); return; }
      if (FEED_MODE === "status204") { $done({ status: 204, headers: { "Content-Type": "text/plain" }, body: "" }); return; }
      if (FEED_MODE === "broken") { $done({ body: "{}" }); return; }
      if (FEED_MODE !== "strip") { $done({}); return; }
      let src = $response.bodyBytes || $response.body;
      if (src instanceof ArrayBuffer) src = new Uint8Array(src);
      if (!src || !src.length || typeof src === "string" || (src[0] === 0x1f && src[1] === 0x8b)) { $done({}); return; }
      $done({ body: stripFeed(src) });
    } else if (/\/mapkit2\/config\//.test(url)) {
      let src = $response.bodyBytes || $response.body;
      if (src instanceof ArrayBuffer) src = new Uint8Array(src);
      if (!src || !src.length || typeof src === "string" || (src[0] === 0x1f && src[1] === 0x8b)) { $done({}); return; }
      $done({ body: rewrite(src) });
    } else {
      const body = $response.body;
      if (!body || typeof body !== "string") { $done({}); return; }
      const d = editJSON(url, JSON.parse(body));
      $done(d ? { body: JSON.stringify(d) } : {});
    }
  } catch (e) {
    console.log("yandex-maps: " + e);
    $done({});
  }
})();

if (typeof module !== "undefined") module.exports = { rewrite, editJSON, stripFeed, categories, DROP, SET, ON };
