/*
 * Yandex Go — ads & annoyances cleaner (Shadowrocket http-response script)
 *
 * One script, routed by URL. Every handler is defensive: if the body is not
 * JSON or the shape is unexpected, the original response is passed through
 * untouched ($done({})), so a server-side schema change degrades to "ads
 * visible" rather than "app broken".
 *
 * Handlers:
 *   superapp layouts   tc.mobile.yandex.net/4.0/mlutp/v1/widgets/layout/*
 *   promotions list    tc.mobile.yandex.net/4.0/promotions/v1/list
 *   splash             tc.mobile.yandex.net/4.0/promotions/v1/splash
 *   launch             tc.mobile.yandex.net/3.0/launch
 *   eats main page     tc.eats.yandex.ru/.../layout-constructor/v1/layout
 *   lavka upsale feed  app.lavka.yandex.net/.../upsale/media-feed
 *   lavka informers    app.lavka.yandex.net/.../api/v1/informers
 *   products/screens   tc.mobile.yandex.net/4.0/mlutp/v1/products[/screen/*]
 *   market web view    go.integration.market.yandex.ru (HTML documents)
 *   market daily wheel go.integration.market.yandex.ru/api/web/...FortuneWheelDailyRewards...
 *   eats BDUI screens  tc.eats.yandex.ru/.../eats/v1/bdui-mobile/v1/* (department collections)
 */

const url = ($request && $request.url) || "";

// Experiments flipped off wherever typed_experiments show up.
const EXPERIMENT_OVERRIDES = {
  new_year_splash_2025: { enabled: false },
  dynamic_splash_screen_parameters: { enabled: false, splash_screens: [] },
  summary_promoblocks: { enabled: false },
  mobile_ads_sdk_options: { enabled: false },
  turboapp_business_promo: { enabled: false },
  fintech_paymentmethods_banner: { enabled: false },
  delivery_payment_promo: { enabled: false },
};

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

function patchExperiments(root) {
  let n = 0;
  walk(root, (o) => {
    const te = o.typed_experiments;
    if (!isObj(te) || !Array.isArray(te.items)) return;
    for (const it of te.items) {
      if (!it || !EXPERIMENT_OVERRIDES[it.name]) continue;
      it.value = Object.assign({}, isObj(it.value) ? it.value : {}, EXPERIMENT_OVERRIDES[it.name]);
      n++;
    }
  });
  return n;
}

// An empty DivKit block (same shape the server itself sends for an empty
// bdui_media_banners section).
function emptyDiv() {
  return {
    type: "container",
    orientation: "vertical",
    height: { type: "wrap_content", min_size: { unit: "px", value: 1 } },
    items: [],
  };
}

// Keep the component object (id/type/layout) but strip its content and every
// action, so nothing renders and nothing (e.g. next-page loading) fires.
function neuterComponent(c) {
  if (!isObj(c)) return;
  c.actions = {};
  c.divData = { log_id: (c.divData && c.divData.log_id) || c.id || "empty", states: [{ state_id: 0, div: emptyDiv() }] };
}

// -------------------------------------------------------------- handlers

// Main screen + any other flex layout (e.g. order-tracking screen feed).
// The "Go feed" is an endless Market / Eats / Lavka recommendation+ads feed
// (types generic-offer-v2, shelf, video, media-adv-banner-single). The section
// is kept (other parts of the layout reference it) but emptied, and its
// loading/error "closing snippets" are neutered so pagination never fires.
function handleLayout(body) {
  const sections = body && body.ui && body.ui.sections;
  if (!Array.isArray(sections)) return false;
  let changed = false;
  for (const s of sections) {
    if (!isObj(s)) continue;
    const isFeed = s.origType === "feed_section" || s.id === "feed";
    const isMediaBanners = s.origType === "MediaBannersRenderData" || s.id === "bdui_media_banners";
    if (isFeed) {
      s.content = [];
      if (s.loadingSnippet) neuterComponent(s.loadingSnippet);
      if (s.errorSnippet) neuterComponent(s.errorSnippet);
      changed = true;
    } else if (isMediaBanners && Array.isArray(s.content)) {
      s.content.forEach(neuterComponent);
      changed = true;
    }
  }
  if (stripActions(body, AD_ACTION_TYPES)) changed = true;
  if (clearPositionClarification(body.shared)) changed = true;
  if (patchExperiments(body)) changed = true;
  return changed;
}

// Stories and screen-bound promo pop-ups. Promotions bound to NO_SCREEN are
// only opened on demand (deeplinks, e.g. Safety Center) and are kept.
function handlePromotionsList(body) {
  if (!isObj(body)) return false;
  const onDemand = (p) => {
    const screens = Array.isArray(p && p.screens) ? p.screens : [];
    return screens.length === 0 || screens.every((x) => !x || x === "NO_SCREEN");
  };
  for (const k of ["fullscreen_banners", "notifications", "cards"]) {
    if (Array.isArray(body[k])) body[k] = body[k].filter(onDemand);
  }
  if (Array.isArray(body.stories)) body.stories = [];
  return true;
}

// Launch splash ("Доброе утро" etc., dynamic_promo).
function handleSplash(body) {
  if (!isObj(body) || !Array.isArray(body.splash_screens)) return false;
  body.splash_screens = [];
  return true;
}

function handleLaunch(body) {
  return patchExperiments(body) > 0;
}

// Eats (Еда) main page.
const EATS_DROP_TYPES = new Set([
  "madv_popup_communications", // Market ad bottom-sheet pop-up
  "madv_hero_banners",         // hero / "recommendation" ad banners
  "banners_carousel",          // growth shelf banners
  "user_goals",                // gamification goals
  "mini_feedback",             // "rate your order" nag
  "sku_upsell_promo_carousel", // brand-sponsored shelves in pharmacy/shops ("sexy_polka": Durex, TeraFlu...)
]);

function handleEatsLayout(body) {
  if (!isObj(body) || !Array.isArray(body.layout) || !isObj(body.data)) return false;
  const dropIds = new Set();
  const kept = [];
  for (const item of body.layout) {
    if (item && EATS_DROP_TYPES.has(item.type)) {
      dropIds.add(item.id);
      // Remove the section header that introduces the dropped widget.
      const prev = kept[kept.length - 1];
      if (prev && prev.type === "header") dropIds.add(kept.pop().id);
      continue;
    }
    kept.push(item);
  }
  body.layout = kept;
  for (const k of Object.keys(body.data)) {
    const v = body.data[k];
    if (Array.isArray(v)) {
      body.data[k] = v.filter((w) => !(w && dropIds.has(w.id)));
      if (body.data[k].length === 0) delete body.data[k];
    } else if (isObj(v) && dropIds.has(v.id)) {
      delete body.data[k];
    }
  }
  // Nearly every restaurant card carries an ad-tracking wrapper
  // (em.market.ya.ru view/click pixels). Strip it; the card itself stays.
  walk(body.data, (o) => {
    if (isObj(o.features) && o.features.advertisement) delete o.features.advertisement;
  });
  return true;
}

// Lavka (grocery) "Собрали для вас" upsale feed: drop sponsored creatives
// (adv_tag_info / erid), video banners and story tiles; products stay.
function handleLavkaMediaFeed(body) {
  if (!isObj(body) || !Array.isArray(body.media_items)) return false;
  const dropIds = new Set();
  body.media_items = body.media_items.filter((m) => {
    const bad = m && (m.adv_tag_info || m.type === "video_banner" || m.informer_id);
    if (bad) [m.id, m.informer_id, m.advertisement_id].forEach((x) => x && dropIds.add(String(x)));
    return !bad;
  });
  if (Array.isArray(body.layout_items)) {
    body.layout_items = body.layout_items.filter(
      (l) => l && l.type !== "banner" && l.type !== "story" && !dropIds.has(String(l.id))
    );
  }
  return true;
}

// Lavka floating promo buttons ("Новые товары каждый день / Скидки ...").
function handleLavkaInformers(body) {
  if (!isObj(body) || !Array.isArray(body.informers)) return false;
  body.informers = body.informers.filter((i) => {
    if (!i) return false;
    if (i.adv_tag_info) return false;
    const special = (i.extra && i.extra.special_informer_type) || (i.extra_data && i.extra_data.special_informer_type);
    if (special === "personal_discounts") return false;
    const s = i.informer_settings || {};
    if (s.type === "floating_button" && s.action && s.action.type === "personal_discounts") return false;
    return true;
  });
  return true;
}

// Eats department screens (bdui-mobile/v1/collection: food_department,
// pharm_department, ...). Same flex/DivKit envelope as the superapp layout.
//  - ad banner carousels: sections with origType CommonBannersWidget
//    (media-adv click/view AdvertisementAction, "Реклама" label) → neutered
//  - ad bottom sheet on open: MadvPopupCommunicationsAction in actions.onAwake
//    (madvPopupData.bottomsheets with ORD creative + media-adv pixels) → removed
const EATS_BDUI_AD_SECTION = /Banner|Madv|Advert/i;

// Remove every action object of the given types from any action list.
function stripActions(root, types) {
  let n = 0;
  walk(root, (o) => {
    for (const k in o) {
      const v = o[k];
      if (!Array.isArray(v)) continue;
      const kept = v.filter((a) => !(isObj(a) && types.has(a.type)));
      if (kept.length !== v.length) { o[k] = kept; n += v.length - kept.length; }
    }
  });
  return n;
}
const AD_ACTION_TYPES = new Set(["MadvPopupCommunicationsAction"]);

function handleEatsBdui(body) {
  const sections = body && body.ui && body.ui.sections;
  if (!Array.isArray(sections)) return false;
  let changed = false;
  for (const s of sections) {
    if (!isObj(s) || !EATS_BDUI_AD_SECTION.test(String(s.origType || ""))) continue;
    if (Array.isArray(s.content)) s.content.forEach(neuterComponent);
    changed = true;
  }
  if (stripActions(body, AD_ACTION_TYPES)) changed = true;
  return changed;
}

// Taxi / scooters product screens (mlutp/v1/products, .../products/screen/*).
//  - objects_over_map: animated campaign badges on the map ("Почему кирпич?")
//  - offers: promo tiles in the scooters sheet ("Дарим 450 баллов", "Экономьте
//    с подпиской", "Пакеты минут", story banners). Functional tiles (QR scan,
//    nearest scooter, menu items incl. "Промокоды", support, safety) stay.
const PROMO_PERSONAL_KINDS = /^(mos_ru|subscription|packages_entrypoint|plus|promo|cashback|bonus|referral|passes|energy_pass|city_sub)/;

function isPromoDeeplink(a) {
  const d = a && a.deeplink;
  return typeof d === "string" && /^yandextaxi:\/\/(story|banner)\b/.test(d);
}

function isPromoOffer(it) {
  if (!isObj(it)) return false;
  const id = String(it.shortcut_id || "");
  if (id.indexOf("personal_shortcut:") === 0) {
    return PROMO_PERSONAL_KINDS.test(id.split(":")[1] || "") || isPromoDeeplink(it.action);
  }
  if (it.type === "deeplink" && isPromoDeeplink(it.action)) return true;
  return false;
}

function cleanOffers(holder) {
  // holder: { offers: { items }, sections: [{ shortcut_ids }] }
  const items = holder && holder.offers && holder.offers.items;
  if (!Array.isArray(items)) return false;
  const byId = {};
  items.forEach((it) => it && it.shortcut_id && (byId[it.shortcut_id] = it));
  const drop = new Set(items.filter(isPromoOffer).map((it) => it.shortcut_id));

  // Personal slider containers mirror their first nested tile; re-point them
  // at the first surviving tile, or drop them when none survive.
  for (const it of items) {
    if (!it || !Array.isArray(it.nested_offer_ids)) continue;
    const rest = it.nested_offer_ids.filter((x) => !drop.has(x));
    if (rest.length === it.nested_offer_ids.length) continue;
    if (!rest.length || !byId[rest[0]]) { drop.add(it.shortcut_id); continue; }
    const first = byId[rest[0]];
    for (const k of ["title", "subtitle", "attributed_title", "attributed_subtitle", "action", "overlays", "background", "text_style", "icon_tag", "image_struct"]) {
      if (k in first) it[k] = first[k]; else delete it[k];
    }
    it.nested_offer_ids = rest;
  }
  if (!drop.size) return false;
  holder.offers.items = items.filter((it) => !(it && drop.has(it.shortcut_id)));
  if (Array.isArray(holder.sections)) {
    for (const sec of holder.sections) {
      if (sec && Array.isArray(sec.shortcut_ids)) sec.shortcut_ids = sec.shortcut_ids.filter((x) => !drop.has(x));
    }
  }
  return true;
}

function isPromoMapObject(o) {
  return isObj(o) && ((o.analytics_payload && o.analytics_payload.campaign_id) || isPromoDeeplink(o.action));
}

function handleProducts(body) {
  if (!isObj(body)) return false;
  let changed = false;
  if (Array.isArray(body.modes)) {
    for (const m of body.modes) {
      if (!isObj(m)) continue;
      if (Array.isArray(m.objects_over_map)) {
        const n = m.objects_over_map.length;
        m.objects_over_map = m.objects_over_map.filter((o) => !isPromoMapObject(o));
        if (m.objects_over_map.length !== n) changed = true;
      }
      if (cleanOffers(m)) changed = true;
    }
  }
  if (isObj(body.screen) && cleanOffers(body.screen)) changed = true;
  if (patchExperiments(body)) changed = true;
  return changed;
}

// Market (web view on go.integration.market.yandex.ru). Server-rendered
// React; ad widgets carry stable data-apiary-widget-name / data-zone-name
// attributes, so a stylesheet injected into each document hides them in the
// initial HTML, in lazily rendered chunks and after client-side navigation.
// CSP allows inline styles ('unsafe-inline' in style-src).
const MARKET_CSS = [
  // All monetization widgets: hero carousel, banners, incuts, promo streamer
  '[data-apiary-widget-name^="@monetize/"]',
  // Search incuts and promo headers
  '[data-apiary-widget-name="@light/SearchIncut"]',
  '[data-apiary-widget-name="@light/LegacySearchIncut"]',
  '[data-apiary-widget-name="@search/SoonOnSaleIncut"]',
  '[data-apiary-widget-name="@marketfront/IncutConstructor/MediaBanner"]',
  '[data-apiary-widget-name="@promo/SearchPromoHeader"]',
  // Header promo strip + fortune wheel entry
  '[data-apiary-widget-name="@marketfront/HeaderPromoBlockRedesigned"]',
  '[data-apiary-widget-name="@light/HeaderFortuneWheelBalance"]',
  '[data-auto="headerFortuneWheelMenuItem"]',
  // Pop-ups: ad bottom sheet, FOMO sale badge, promo-code pop-up
  '[data-apiary-widget-name="@marketfront/MadvPopup"]',
  '[data-apiary-widget-name="@FOMO/FOMOPopup"]',
  '[data-apiary-widget-name="@marketfront/SkidkomatPromocodesPopup"]',
  // Zones (same things, different anchor, survives widget renames)
  '[data-zone-name="heroSlideshow"]',
  '[data-zone-name="mainPromoHeader"]',
  '[data-zone-name="promoWidget"]',
  '[data-zone-name="recomMadv"]',
  '[data-zone-name="madvIncut"]',
  '[data-zone-name="madvPopup"]',
  '[data-zone-name="fomoPopup"]',
  '[data-zone-name="vezdehod"]',
  '[data-zone-name="ugcAgitationSnippet"]',
  // Sponsored product scrollboxes in recommendation rolls
  '[data-zone-name="recomMediaAdv"]',
  // CMS banner carousels on promo landing pages (/page/special, /page/ultima)
  '[data-apiary-widget-name="@light/BannerCarousel"]',
  // Content feed coin/wheel overlay
  '[data-apiary-widget-name="@marketfront/ContentFeedPromoOverlay"]',
  // Profile: bank card / Split promo, fortune wheel item, referral programme
  '[data-apiary-widget-name="@marketfront/profile/ProfileFintechPromoWidget"]',
  '[data-zone-name="bankProductPromoWidget"]',
  '[data-zone-name="wheelGiftsMenuItem"]',
  '[data-apiary-widget-name="@wishlist/ReferralEntryProfile"]',
  // Cart: bank-card discount agitation, Split and cash-credit upsells
  '[data-apiary-widget-name="@mf-online-ux/CartFintechAgitation"]',
  '[data-apiary-widget-name="@mf-online-ux/CartBnplWidget"]',
  '[data-apiary-widget-name="@mf-online-ux/CartCashCreditWidget"]',
  '[data-apiary-widget-name="@mf-online-ux/CartFintechAgitationPopup"]',
  // Profile: Pay plastic card promo, referral balance tile
  '[data-zone-name="promoProduct"]',
  '[data-zone-name="referralProgramBalanceWidget"]',
  // Promo / onboarding pop-ups and review nags
  '[data-apiary-widget-name="@segmentations/ComplimentPopup"]',
  '[data-apiary-widget-name="@wishlist/ReferralOnboardingPopupContentV2"]',
  '[data-apiary-widget-name="@mf-wishlist/WishlistEntryOnboardingPopup"]',
  '[data-apiary-widget-name="@card/RemixAgitationSnippet"]',
  // Any tile labelled as advertising (ad-law "advTagInfo"/erid in zone data)
  '[data-zone-data*="advTagInfo"]',
].join(",\n") + "{display:none!important}";

function handleMarketHtml(raw) {
  if (typeof raw !== "string" || raw.indexOf("<head") < 0) return null;
  const tag = '<style id="ygo-adblock">' + MARKET_CSS + "</style>";
  const i = raw.indexOf("</head>");
  return i >= 0 ? raw.slice(0, i) + tag + raw.slice(i) : raw.replace(/<head[^>]*>/, (m) => m + tag);
}

// Market daily sign-in / fortune wheel pop-up on opening Market.
function handleMarketDailyRewards(body) {
  const r = body && body.result;
  if (!isObj(r)) return false;
  delete r.dailyRewardFortuneWidgetBase64;
  if (isObj(r.dailySignInInfo)) r.dailySignInInfo.rewardAvailable = false;
  return true;
}

// Generic flex/DivKit screens on tc.mobile (bdui/v1/masstransit/main, ...):
// neuter ad sections (MediaAdvHeroRenderData with erid, SDK banner carousels)
// and drop Madv pop-up actions. Functional sections (where-to, suggests,
// transport card, tickets) stay.
const AD_SECTION_TYPES = /MediaAdv|SdkBanner|MediaBanners|Madv|CommonBannersWidget/i;

function handleBdui(body) {
  const sections = body && body.ui && body.ui.sections;
  if (!Array.isArray(sections)) return false;
  let changed = false;
  for (const s of sections) {
    if (!isObj(s) || !AD_SECTION_TYPES.test(String(s.origType || ""))) continue;
    if (Array.isArray(s.content)) s.content.forEach(neuterComponent);
    changed = true;
  }
  if (stripActions(body, AD_ACTION_TYPES)) changed = true;
  return changed;
}

// urbanads/sdk: the whole response is an ad unit (SdkBannerCarousel on the
// Delivery page, ORD-labelled). Every section is neutered.
function handleUrbanAds(body) {
  const sections = body && body.ui && body.ui.sections;
  if (!Array.isArray(sections)) return false;
  for (const s of sections) if (isObj(s) && Array.isArray(s.content)) s.content.forEach(neuterComponent);
  stripActions(body, AD_ACTION_TYPES);
  return true;
}

// inapp-communications (v2/communications-masstransit, v1/delivery-promotions):
// campaign badges over the map ("Когда придёт автобус"), promo blocks and
// story banner carousels.
function handleInappComms(body) {
  if (!isObj(body)) return false;
  let changed = false;
  const offers = body.offers;
  if (isObj(offers)) {
    const oom = offers.objects_over_map;
    if (isObj(oom) && Array.isArray(oom.items)) {
      const keep = oom.items.filter((o) => !isPromoMapObject(o));
      if (keep.length !== oom.items.length) {
        oom.items = keep;
        if (Array.isArray(oom.priority)) {
          const ids = new Set(keep.map((o) => o && o.id));
          oom.priority = oom.priority.filter((id) => ids.has(id));
        }
        changed = true;
      }
    }
    const pb = offers.promoblocks;
    if (isObj(pb) && Array.isArray(pb.items) && pb.items.length) {
      pb.items = [];
      pb.priority = [];
      changed = true;
    }
  }
  const bl = body.banners;
  if (isObj(bl) && Array.isArray(bl.banner_list) && bl.banner_list.length) {
    bl.banner_list = [];
    changed = true;
  }
  return changed;
}

// Delivery (cargo-c2c) dashboard: the "ads-banner" widget loads urbanads/sdk.
function handleCargoDashboard(body) {
  if (!isObj(body) || !Array.isArray(body.sections)) return false;
  let changed = false;
  for (const sec of body.sections) {
    if (!isObj(sec) || !Array.isArray(sec.widgets)) continue;
    const n = sec.widgets.length;
    sec.widgets = sec.widgets.filter((w) => !(isObj(w) && w.type === "ads-banner"));
    if (sec.widgets.length !== n) changed = true;
  }
  return changed;
}

// Intercity dashboard: promo/onboarding story banner carousel on top.
function handleIntercity(body) {
  if (!isObj(body)) return false;
  let changed = false;
  if (Array.isArray(body.banners) && body.banners.length) { body.banners = []; changed = true; }
  if (Array.isArray(body.sections)) {
    const n = body.sections.length;
    body.sections = body.sections.filter((x) => !(isObj(x) && x.type === "banner_carousel"));
    if (body.sections.length !== n) changed = true;
  }
  return changed;
}

// Location-permission bar ("Включите геопозицию / Не видим, где вы") on the
// main screen at launch. With location off the app starts from the zero-km
// fallback pin (provider "zero_km"); finalsuggest (and the superapp layout's
// shared.finalsuggest copy) answers should_clarify_position: true plus a
// show_point_clarification_screen action (reason bad_coord_provider). After
// the Taxi screen is opened the pin moves to the suggested address, the server
// stops sending both, and the bar disappears. Clearing them at launch mirrors
// that state. Set to false to restore stock behaviour.
const HIDE_LOCATION_BAR = false;

function isClarifyAction(a) {
  return isObj(a) && a.type === "show_point_clarification_screen" && a.action_reason === "bad_coord_provider";
}

function clearPositionClarification(root) {
  if (!HIDE_LOCATION_BAR) return false;
  let changed = false;
  walk(root, (o) => {
    if (o.should_clarify_position === true) { o.should_clarify_position = false; changed = true; }
    if (Array.isArray(o.conditional_actions_v2)) {
      const kept = [];
      for (const c of o.conditional_actions_v2) {
        if (isObj(c) && Array.isArray(c.actions) && c.actions.some(isClarifyAction)) {
          c.actions = c.actions.filter((a) => !isClarifyAction(a));
          changed = true;
          if (!c.actions.length) continue;
        }
        kept.push(c);
      }
      o.conditional_actions_v2 = kept;
    }
  });
  return changed;
}

function handleFinalSuggest(body) {
  return clearPositionClarification(body);
}

// ---------------------------------------------------------------- router

const ROUTES = [
  [/^https:\/\/tc\.mobile\.yandex\.net\/4\.0\/mlutp\/v1\/widgets\/layout\//, handleLayout],
  [/^https:\/\/tc\.mobile\.yandex\.net\/4\.0\/promotions\/v1\/list/, handlePromotionsList],
  [/^https:\/\/tc\.mobile\.yandex\.net\/4\.0\/promotions\/v1\/splash/, handleSplash],
  [/^https:\/\/tc\.mobile\.yandex\.net\/3\.0\/launch/, handleLaunch],
  [/^https:\/\/tc\.eats\.yandex\.ru\/4\.0\/eda-superapp\/eats\/v1\/layout-constructor\/v1\/layout/, handleEatsLayout],
  [/^https:\/\/app\.lavka\.yandex\.net\/4\.0\/eda-superapp\/lavka\/v1\/api\/v1\/upsale\/media-feed/, handleLavkaMediaFeed],
  [/^https:\/\/app\.lavka\.yandex\.net\/4\.0\/eda-superapp\/lavka\/v1\/api\/v1\/informers/, handleLavkaInformers],
  [/^https:\/\/tc\.mobile\.yandex\.net\/4\.0\/mlutp\/v1\/products(\/screen\/|\?|$)/, handleProducts],
  [/^https:\/\/tc\.eats\.yandex\.ru\/4\.0\/eda-superapp\/eats\/v1\/bdui-mobile\/v1\//, handleEatsBdui],
  [/^https:\/\/go\.integration\.market\.yandex\.ru\/api\/web\/.*FortuneWheelDailyRewards/, handleMarketDailyRewards],
  [/^https:\/\/tc\.mobile\.yandex\.net\/4\.0\/bdui\/v1\//, handleBdui],
  [/^https:\/\/tc\.mobile\.yandex\.net\/4\.0\/urbanads\/sdk/, handleUrbanAds],
  [/^https:\/\/tc\.mobile\.yandex\.net\/4\.0\/inapp-communications\//, handleInappComms],
  [/^https:\/\/tc\.mobile\.yandex\.net\/4\.0\/cargo-c2c\/v1\/dashboard\/content/, handleCargoDashboard],
  [/^https:\/\/tc\.mobile\.yandex\.net\/4\.0\/intercity\/v1\/dashboard\/content/, handleIntercity],
  [/^https:\/\/tc\.mobile\.yandex\.net\/4\.0\/persuggest\/v1\/finalsuggest/, handleFinalSuggest],
];

// Routes whose body is HTML rather than JSON.
const HTML_ROUTES = [
  [/^https:\/\/go\.integration\.market\.yandex\.ru\/(?!api\/)/, handleMarketHtml],
];

function headerValue(headers, name) {
  if (!headers) return "";
  for (const k in headers) if (k.toLowerCase() === name) return String(headers[k]);
  return "";
}

(function main() {
  try {
    const raw = $response && $response.body;
    if (!raw) return $done({});
    const htmlRoute = HTML_ROUTES.find(([re]) => re.test(url));
    if (htmlRoute) {
      if (headerValue($response.headers, "content-type").indexOf("text/html") < 0) return $done({});
      const out = htmlRoute[1](raw);
      return $done(out ? { body: out } : {});
    }
    const route = ROUTES.find(([re]) => re.test(url));
    if (!route) return $done({});
    const body = JSON.parse(raw);
    if (!route[1](body)) return $done({});
    $done({ body: JSON.stringify(body) });
  } catch (e) {
    console.log("[yandex-go] " + url.split("?")[0] + " : " + e);
    $done({});
  }
})();
