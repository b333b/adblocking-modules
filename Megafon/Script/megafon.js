// MegaFon (iOS app): removes promo banners, stories, pop-ups, offers, loan ads, game center,
// onboarding tips, surveys, "new" badges, the VPN warning bar and first-party telemetry.
//
// The iOS app is a thin shell around the lk.megafon.ru web app (WebView). Every screen is built
// from JSON on api.megafon.ru/mlk/api/*, and the web app reads a feature switchboard
// (appConfig/wlk) whose flags default to "hidden" when they are false or missing. So most
// blocks are removed by switching a flag off and emptying the matching list; wrappers, keys and
// everything else (balance, tariff, remainders, payments, account data) are passed through.
//
// Stories and in-app pop-ups come from the InAppStory web SDK (api.inappstory.ru). Those
// requests are only edited when they come from the MegaFon web app (Origin/Referer
// lk.megafon.ru), so other apps that use InAppStory are left alone.
//
// Settings come from the module's #!arguments as one JSON object, e.g.
//   argument={"banners":true,"stories":true,...,"shortcuts":"start+megacinema+shop","extra_flags":""}
// Every switch is on unless it is false. If the argument is not valid JSON, all switches count
// as on and the defaults below are used. Unexpected response shapes are passed through untouched.

const DEFAULT_SHORTCUTS = ['start', 'megacinema', 'shop'];

const arg = typeof $argument !== 'undefined' ? String($argument) : '';
let S = null;
try { S = JSON.parse(arg); } catch (e) {}
if (!S || typeof S !== 'object' || Array.isArray(S)) S = null;

const on = (k) => (S ? S[k] !== false && S[k] !== 'false' && S[k] !== 0 : true);
const list = (k, def) => {
  if (!S || typeof S[k] !== 'string') return def;
  return S[k].split(/[+,\s]+/).filter((t) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(t));
};

// appConfig/wlk flags switched off by each setting: [section, flag].
const FLAG_GROUPS = {
  banners: [['main', 'showPromoBanner']],
  stories: [['main', 'showStories'], ['main', 'showStoriesTags'], ['services', 'showStories']],
  popups: [['main', 'showPopUpOffers'], ['main', 'showMfoAssent']],
  offers: [['loyalty', 'showPersonalOfferSection'], ['loyalty', 'showSmartshopping']],
  loans: [['finance', 'showMfo']],
  games: [['loyalty', 'showGameCenter']],
  onboarding: [['common', 'showOnboardings']],
  surveys: [['more', 'surveyAlwaysOnEnabled'], ['common', 'surveyMegaFamilyGroup']],
};

const isObj = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
const emptyList = (o, k) => {
  if (!isObj(o) || !Array.isArray(o[k]) || !o[k].length) return false;
  o[k] = [];
  return true;
};
const switchOff = (o, k) => {
  if (!isObj(o) || o[k] !== true) return false;
  o[k] = false;
  return true;
};

function header(name) {
  const h = (typeof $request !== 'undefined' && $request.headers) || {};
  const want = name.toLowerCase();
  for (const k of Object.keys(h)) if (k.toLowerCase() === want) return String(h[k]);
  return '';
}

// ---- api.megafon.ru/mlk/api/* ----

function appConfig(d) {
  let changed = false;
  for (const key of Object.keys(FLAG_GROUPS)) {
    if (!on(key)) continue;
    for (const [section, flag] of FLAG_GROUPS[key]) changed = switchOff(d[section], flag) || changed;
  }
  const extra = list('extra_flags', []);
  if (extra.length) {
    for (const section of Object.keys(d)) {
      if (!isObj(d[section])) continue;
      for (const flag of extra) changed = switchOff(d[section], flag) || changed;
    }
  }
  return changed;
}

const API = [
  [/^\/mlk\/api\/appConfig\/wlk$/, (d) => isObj(d) && appConfig(d)],

  // Promo banners on main, finance, family and promised-payment screens.
  [/^\/mlk\/api\/promoBanner\/availableBanners$/, (d) => on('banners') && emptyList(d, 'banners')],

  // Per-screen banner slot; "{}" is the normal empty reply.
  [/^\/mlk\/api\/banners$/, (d) => {
    if (!on('banners') || !isObj(d) || !Object.keys(d).length || 'code' in d || 'message' in d) return false;
    for (const k of Object.keys(d)) delete d[k];
    return true;
  }],

  // Pop-up offers shown over the main screen.
  [/^\/mlk\/api\/promoOffers$/, (d) => on('popups') && emptyList(d, 'popUpOffers')],

  // "Финансовый помощник" consent modal (personal offers from partner banks via Banki.ru).
  [/^\/mlk\/api\/mfo\/assent\/form$/, (d) => on('popups') && switchOff(d, 'availability')],

  // "Вам подарок" super-offer, personal offers list, game teaser.
  [/^\/mlk\/api\/personaloffer\/availableContent$/, (d) => {
    if (!isObj(d)) return false;
    let changed = false;
    if (on('offers')) {
      changed = switchOff(d.superOffer, 'availability') || changed;
      changed = emptyList(d, 'offersList') || changed;
    }
    if (on('games') && isObj(d.game)) {
      changed = switchOff(d.game, 'availability') || changed;
      if (typeof d.game.gameBubble === 'number' && d.game.gameBubble !== 0) { d.game.gameBubble = 0; changed = true; }
    }
    return changed;
  }],

  // Partner offers (subscriptions, retail discounts, prize draws). The reply is a bare array.
  [/^\/mlk\/api\/partnersoffer\/list$/, (d) => {
    if (!on('offers') || !Array.isArray(d) || !d.length) return false;
    d.length = 0;
    return true;
  }],

  // Promo tile at the top of the services catalog; the categories are kept.
  [/^\/mlk\/api\/services\/availableServices\/categoriesList$/, (d) => on('offers') && emptyList(d, 'promoOffers')],

  // "Добавили новые услуги…" feature-tour tooltips.
  [/^\/mlk\/api\/onboardings\/list$/, (d) => on('onboarding') && emptyList(d, 'onboardings')],

  // Red "new" bubbles on menu items: every true flag becomes false.
  [/^\/mlk\/api\/configuration\/buttonBubble$/, (d) => {
    if (!on('badges') || !isObj(d)) return false;
    let changed = false;
    for (const k of Object.keys(d)) changed = switchOff(d, k) || changed;
    return changed;
  }],

  // Shortcut row (Кинотеатр, МегаКино, Товары, …): drop the listed appIds.
  [/^\/mlk\/api\/superapp\/components$/, (d) => {
    const hide = list('shortcuts', DEFAULT_SHORTCUTS);
    if (!hide.length || !isObj(d) || !Array.isArray(d.apps)) return false;
    const kept = d.apps.filter((a) => !(isObj(a) && hide.indexOf(String(a.appId)) >= 0));
    if (kept.length === d.apps.length) return false;
    d.apps = kept;
    return true;
  }],

  // Client log shipping (batches to /api/logs/v2/accept every few seconds).
  [/^\/mlk\/api\/logs\/severities$/, (d) => on('analytics') && switchOff(d, 'enabled')],
];

// ---- lk.megafon.ru ----

// VPN warning bar ("Отключите виртуальную частную сеть (VPN)…"): a lazy-loaded component whose
// root element has class "vpn-notification". It doesn't check for a VPN itself (the app decides
// before loading it), and closing it is only remembered for the session, so it comes back on every
// launch. It is removed twice over: a style injected into the page hides it, and the component's
// own chunk is patched to start in its "already closed" state, in which it renders nothing.
const PAGE_STYLE_ID = 'adblock-megafon';
const VPN_CSS = '.vpn-notification,[data-testid^="VpnNotification"]{display:none!important}';
// In the chunk: [closed, setClosed] = useState(!!storageGet(SESSION_VPN_KEY)) -> useState(true)
const VPN_STATE_INIT = /useState\)\(!!\(0,[\w$]+\.[\w$]+\)\([\w$]+\)\)/g;

const LK = [
  // Web app service settings; "track" enables the Elastic APM RUM agent (/track/intake/v2/rum/events).
  [/^\/settings\.json$/, (d) => on('analytics') && switchOff(d, 'track')],

  // The VPN warning component's chunk.
  [/^\/public\/rwlk\/vpnNotification\.[0-9a-f]+\.js$/, (js) => {
    if (!on('vpn_warning') || js.indexOf('vpn-notification') < 0) return null;
    const hits = js.match(VPN_STATE_INIT);
    if (!hits || hits.length !== 1) return null;
    return js.replace(VPN_STATE_INIT, 'useState)(!0)');
  }, 'text'],

  // The page itself (index.html, served for every app route): add the hiding style to <head>.
  [/^\/(?!track\/|public\/)[\w\/-]*$/, (html) => {
    if (!on('vpn_warning') || !/<html[\s>]/i.test(html)) return null;
    if (html.indexOf('id="' + PAGE_STYLE_ID + '"') >= 0) return null;
    const m = html.match(/<head(\s[^>]*)?>/i);
    if (!m) return null;
    const at = m.index + m[0].length;
    return html.slice(0, at) + '<style id="' + PAGE_STYLE_ID + '">' + VPN_CSS + '</style>' + html.slice(at);
  }, 'text'],
];

// ---- api.inappstory.ru (only requests from the MegaFon web app) ----

const IAS = [
  // Story feeds: "default" is the stories row on the main screen; "*onboarding*" feeds open
  // automatically the first time a screen is visited.
  [/^\/v2\/feed\/[\w-]+(\/[\w-]+)?$/, (d, path) => {
    const key = /onboarding/i.test(path) ? 'onboarding' : 'stories';
    return on(key) && emptyList(d, 'stories');
  }],
  // In-app message campaigns (full-screen pop-ups triggered by screen events).
  [/^\/v2\/inappmessaging$/, (d) => on('popups') && emptyList(d, 'messages')],
];

function route() {
  const url = String($request.url || '');
  const m = url.match(/^https?:\/\/([^\/?#:]+)(?::\d+)?([^?#]*)/);
  if (!m) return null;
  const host = m[1].toLowerCase();
  const path = m[2] || '/';
  if (host === 'api.megafon.ru') return { table: API, path };
  if (host === 'lk.megafon.ru') return { table: LK, path };
  if (host === 'api.inappstory.ru') {
    const fromLk = /^https:\/\/lk\.megafon\.ru\/?$/.test(header('Origin')) ||
      /^https:\/\/lk\.megafon\.ru\//.test(header('Referer'));
    return fromLk ? { table: IAS, path } : null;
  }
  return null;
}

let out = {};
try {
  const r = route();
  const handler = r && r.table.find(([re]) => re.test(r.path));
  const body = typeof $response !== 'undefined' && $response ? $response.body : null;
  if (handler && typeof body === 'string' && body) {
    if (handler[2] === 'text') {
      const edited = handler[1](body, r.path);
      if (typeof edited === 'string' && edited !== body) out = { body: edited };
    } else {
      const d = JSON.parse(body);
      if (handler[1](d, r.path)) out = { body: JSON.stringify(d) };
    }
  }
} catch (e) {
  out = {};
}
$done(out);
