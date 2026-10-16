# CLAUDE.md

Context for AI assistants (Claude Code, claude.ai chats) working on this repo.
Chats and Claude Code do not share conversation history: this file is the shared
memory. Update it after any meaningful change. The repo is public, so keep
personal data out of it.

This repo merges the former `avito-adblocking-module`, `ozon-adblocking-module` and
`yandex-adblocking-module` repos (now permanently removed). Their CLAUDE.md files are combined below,
one top-level section per app.

## Contents

| Shared | [Avito](#avito) | [MegaFon](#megafon) | [Ozon](#ozon) | [Yandex Maps](#yandex-maps) | [Yandex Go](#yandex-go) |
|---|---|---|---|---|---|
| [Git](#git) | [App facts](#avito-app-facts) | [App facts](#megafon-app-facts) | [Bank: how the main screen is delivered](#ozon-bank-how-the-app-delivers-the-main-screen) | [Target](#maps-target) | [Install](#go-install) |
| [Privacy rules](#privacy-rules) | [Ad pipeline](#avito-ad-pipeline) | [The appConfig switchboard](#megafon-the-appconfig-switchboard) | [Bank: what is removed](#ozon-bank-what-is-removed-and-how) | [How the app talks to the server](#maps-how-the-app-talks-to-the-server) | [What it removes](#go-what-it-removes) |
| [Modules at a glance](#modules-at-a-glance) | [Endpoint map](#avito-endpoint-map) | [Endpoint map](#megafon-endpoint-map) | [Bank debug workflow](#ozon-bank-debug-workflow) | [Caching](#maps-caching) | [Files and combining with Maps](#go-files-and-combining-with-maps) |
| [Repository layout](#repository-layout) | [Deliberately not touched](#avito-deliberately-not-touched) | [Main screen and bottom menu](#megafon-main-screen-and-bottom-menu) · [Module settings](#megafon-module-settings) | [Marketplace](#ozon-marketplace) | [Response types](#maps-response-types-what-each-empty-does) | [Principles](#go-principles) |
| [Shadowrocket reference](#shadowrocket-reference) | [Third-party hosts](#avito-third-party-hosts-seen) | [Deliberately not touched](#megafon-deliberately-not-touched) | [Script conventions](#ozon-script-conventions) | [MapKit config](#maps-mapkit-config-the-main-ui-switchboard) | [Endpoint map](#go-endpoint-map) |
| [Cross-module overlaps](#cross-module-overlaps) | [Known risks](#avito-known-risks--to-verify-on-device) | [Third-party hosts](#megafon-third-party-hosts-seen) | [Why rules were not enough](#ozon-why-rules-were-not-enough) | [Endpoint map](#maps-endpoint-map) | [Experiments flipped](#go-experiments-flipped) |
| [README](README.md) | | [Known risks](#megafon-known-risks--to-verify-on-device) | [Testing](#ozon-testing) · [Privacy](#ozon-privacy-rules) | [Open issues](#maps-open-issues) | [Open items](#go-open-items) |
| | | [Testing](#megafon-testing) · [Privacy](#megafon-privacy) | [When a block comes back](#ozon-when-a-block-comes-back) | [Debugging workflow](#maps-debugging-workflow) | [Location-permission bar](#go-location-permission-bar-experimental-fix) |

---

## Git

- Always commit and push directly to `main`. Do not use feature branches or open pull requests.
- Modules load scripts by their raw GitHub URL on `main`, so **a push to `main` is a release**.

## Privacy rules

Public repo: never commit personal data (user IDs, device IDs, IPs, location IDs, session tokens).

Never commit traffic captures (Shadowrocket .db logs, HAR files) or anything copied out of them: they
contain device IDs, UUIDs, coordinates, auth tokens and cookies. When quoting a request, strip the
query string or replace values with placeholders. Keep example payloads synthetic.

App-specific notes: [Ozon](#ozon-privacy-rules), [Yandex Go captures](#go-captures).

## Modules at a glance

Install in Shadowrocket → Config → Modules → + → paste the module URL (HTTPS decryption on,
Shadowrocket CA trusted). [README.md](README.md) lists every module's raw URL as a link; add new modules there too. Install links use the form `https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/<Vendor>/<module>.sgmodule`

| App | iOS bundle | Module | Script(s) | Script entries | MITM hosts |
|---|---|---|---|---|---|
| Avito | `online.anero.app` | [`Avito/avito.sgmodule`](Avito/avito.sgmodule) | [`Avito/Script/avito.js`](Avito/Script/avito.js) | `avito-ads` | `app.avito.ru`, `www.avito.ru`, `stats.avito.ru` |
| MegaFon | — | [`Megafon/megafon.sgmodule`](Megafon/megafon.sgmodule) | [`Megafon/Script/megafon.js`](Megafon/Script/megafon.js); rule set [`Megafon/Rules/analytics-true.list`](Megafon/Rules/analytics-true.list) | `megafon` (API JSON), `megafon-page` (page + VPN chunk) | `api.megafon.ru`, `lk.megafon.ru`, `api.inappstory.ru` |
| Ozon Bank | `ru.ozon.fintech.finance` | [`Ozon/ozon-bank.sgmodule`](Ozon/ozon-bank.sgmodule) | [`Ozon/Script/ozon-bank.js`](Ozon/Script/ozon-bank.js) (clean), [`Ozon/Script/ozon-bank-debug.js`](Ozon/Script/ozon-bank-debug.js) (debug, not loaded by default) | `ozon-banners-page`, `-main`, `-loyalty`, `-list` | `finance.ozon.ru` |
| Ozon Marketplace | — | [`Ozon/ozon-marketplace.sgmodule`](Ozon/ozon-marketplace.sgmodule) | [`Ozon/Script/ozon-marketplace.js`](Ozon/Script/ozon-marketplace.js) | `ozon-mp-composer` | `api.ozon.ru` |
| Yandex Maps | `ru.yandex.traffic` | [`Yandex/yandex-maps.sgmodule`](Yandex/yandex-maps.sgmodule) | [`Yandex/Script/yandex-maps.js`](Yandex/Script/yandex-maps.js) | `yandex-maps` (binary), `yandex-maps-json` | `proxy.mob.maps.yandex.net`, `geointernal.mob.maps.yandex.net`, `avatars.mds.yandex.net`, `yandex.ru`, `egw.home-gateway.plus.yandex.net`, `app.tanker.yandex.net`, `mobile-maps-common.s3.yandex.net` |
| Yandex Go | — | [`Yandex/yandex-go.sgmodule`](Yandex/yandex-go.sgmodule) | [`Yandex/Script/yandex-go.js`](Yandex/Script/yandex-go.js) | `yandexgo-*` (12 entries) | `tc.mobile.yandex.net`, `tc.eats.yandex.ru`, `go.integration.market.yandex.ru`, `yandex.ru` (`app.lavka.yandex.net` deliberately left out: Lavka answers with a captcha when Shadowrocket MITMs it, so Lavka is [not handled](#go-applavkayandexnet-lavka-web-app)) |

| App | Last tested on | Written | Status |
|---|---|---|---|
| Avito | 230.1 | from scratch (not a fork) | working |
| MegaFon | 4.66.1, web app v2.158.1 (capture, October 2026) | from scratch | new, not yet tested on device, see [known risks](#megafon-known-risks--to-verify-on-device) |
| Ozon Bank | — | from scratch | working |
| Ozon Marketplace | — | from scratch | new |
| Yandex Maps | 30.3.1 | from scratch | working, see [open issues](#maps-open-issues) |
| Yandex Go | 4.19 (September 2026) | from scratch | working, see [open items](#go-open-items) |

## Repository layout

```
CLAUDE.md                          this file
README.md                          install links (raw .sgmodule URLs) for every module
Avito/avito.sgmodule               Avito module
Avito/Script/avito.js              Avito response script
Megafon/megafon.sgmodule           MegaFon module (settings in #!arguments)
Megafon/Script/megafon.js          MegaFon response script
Megafon/Rules/analytics-true.list  MegaFon analytics hosts (always loaded)
Megafon/Rules/analytics-false.list unused (kept; from the switchable rule-set attempt)
Ozon/ozon-bank.sgmodule            Ozon Bank module, loads the clean script
Ozon/ozon-marketplace.sgmodule     Ozon Marketplace module
Ozon/Script/ozon-bank.js           Ozon Bank clean script
Ozon/Script/ozon-bank-debug.js     Ozon Bank debug script
Ozon/Script/ozon-marketplace.js    Ozon Marketplace script
Yandex/yandex-maps.sgmodule        Yandex Maps module
Yandex/yandex-go.sgmodule          Yandex Go module
Yandex/Script/yandex-maps.js       Yandex Maps script (protobuf + JSON)
Yandex/Script/yandex-go.js         Yandex Go script
Dixy/Script/                       Dixy (no module yet; .gitkeep only)
```

- Empty folders hold a `.gitkeep` (git doesn't track empty folders); delete it once real files land there.

- One folder per vendor: `<Vendor>/`. Modules (`*.sgmodule`) sit in the vendor folder; the
  scripts they load sit in `<Vendor>/Script/`, and rule sets they load sit in `<Vendor>/Rules/`
  (`*.list`, one rule per line without a policy; the policy is on the module's `RULE-SET` line).
- Module `script-path` values use the raw URL on `main`:
  `https://raw.githubusercontent.com/b333b/adblocking-modules/main/<Vendor>/Script/<file>.js`
- Every module's name is `#!name=[AdBlock] <App name>` (e.g. `#!name=[AdBlock] Ozon Marketplace`),
  `#!category=AdBlock`, and `#!homepage` is `https://github.com/b333b/adblocking-modules`.
  Uploaded modules often carry other names ("— no ads", "— no banners"): rename them on import.
- Uploaded modules come with `PASTE_RAW_URL_OF_<file>.js` placeholders: replace them with the raw URL.
- Module files use the `.sgmodule` extension (rename `.module` uploads).
- New apps are added the same way (e.g. `Ozon/ozon-marketplace.sgmodule` + `Ozon/Script/ozon-marketplace.js`),
  plus a line in [README.md](README.md) and in [Modules at a glance](#modules-at-a-glance).
- Check the actual paths in the repo before writing a module line; they have moved before
  (most recently in the merge into this repo).

## Shadowrocket reference

Facts that apply to every module.

| Policy / action | What the app receives | Notes |
|---|---|---|
| `REJECT` | 404 | A missing microfrontend can be fatal ([Ozon](#ozon-why-rules-were-not-enough)) |
| `REJECT-DICT` / `reject-dict` | 200 `{}` | Parse error for protobuf; may lack required fields for JSON / GraphQL-shaped responses |
| `REJECT-ARRAY` | 200 `[]` | |
| `REJECT-200` / `reject-200` | empty 200 | Valid empty message for protobuf; parse error for JSON |
| `REJECT-IMG` / `reject-img` | 1×1 GIF | |
| Script that empties lists in the real body | original response, edited | Best option; keep the wrapper/metadata |

- **Shadowrocket runs one script per request**: keep only one module/script matching a given URL,
  a leftover one wins silently.
- Shadowrocket caches scripts fetched by URL: after pushing a script change, refresh the
  module/script in Shadowrocket before testing.
- `$notification.post` does nothing in Shadowrocket. Report through a page instead (see
  [Ozon Bank debug workflow](#ozon-bank-debug-workflow)).
- Scripts can't decompress. Modules force `Accept-Encoding: gzip` (Avito) or delete
  `Accept-Encoding` (Yandex Maps) on scripted endpoints; bodies that still arrive compressed are passed through.
- `[Body Rewrite] http-response-jq` did not visibly apply to a large (~470 KB) JSON body in
  testing; do JSON edits in JS scripts instead.
- Settings belong in the module line (`argument=`), not in the JS file: editing JS on a phone
  introduces curly quotes and breaks the script silently.
- `#!arguments` placeholders (`{{{name}}}`) work in `[Script]` `argument=` values. They do **not**
  work in a `[Rule]` `RULE-SET` URL (tested on device with MegaFon's
  `analytics-{{{analytics}}}.list`: the rule set didn't load). Rules can't be switched by a
  module setting; keep them always on.
- `#!arguments` must not end with an empty value (`…,extra_flags:`): Shadowrocket mishandles it
  (seen on device with MegaFon). Give the last argument a non-empty default (Ozon Marketplace uses the placeholder
  `extra:Add_components_here`).
- All scripts fail open: unexpected shape → pass the original body through (`$done({})`), never a
  half-edited body.

## Cross-module overlaps

Rules and rewrites apply globally whenever a module is enabled, not only to its app.

| Item | Avito | MegaFon | Yandex Maps | Yandex Go |
|---|---|---|---|---|
| `amc.yandex.ru` | `DOMAIN` REJECT | | | `DOMAIN` REJECT |
| `report.appmetrica.yandex.net` | `DOMAIN` REJECT | | `DOMAIN` REJECT | |
| `mc.yandex.ru` | | `DOMAIN-SUFFIX` in rule set | `DOMAIN-SUFFIX` REJECT | `DOMAIN-SUFFIX` REJECT |
| `tracker-api.vk-analytics.ru` (MyTracker) | `DOMAIN-SUFFIX` REJECT | `DOMAIN-SUFFIX` in rule set | | |
| `app-analytics-services.com` | `DOMAIN` REJECT | | | `DOMAIN-SUFFIX` REJECT |
| `api.inappstory.ru` in MITM | | yes (script edits only requests from `lk.megafon.ru`) | | |
| `yandex.ru` in MITM | no (so `yandex.ru/ads/*` is not rewritten by Avito) | | yes | yes |
| `yandex.ru/an/` | | | `reject-200` | `reject` |
| `yandex.ru/clck/` | | | all of `clck/` → `reject-200` | only `clck/(click\|jclck)` → `reject`; `clck/redir` (real link redirects) deliberately left alone |

With Maps enabled, its broader `yandex.ru/clck/` rule also catches `clck/redir`, which Go
deliberately keeps working. Duplicate REJECT rules are harmless.

MegaFon's analytics rule set is always on (MegaFon's `analytics` switch only covers the app's
own telemetry), so with MegaFon enabled Metrica and MyTracker are blocked for every app.

---

## Avito

Shadowrocket module that strips ads/promo from the Avito iOS app. Written from scratch (not a fork).

Files:
- [`Avito/avito.sgmodule`](Avito/avito.sgmodule) — rules, URL rewrites, header rewrite, script hook, MITM hosts
- [`Avito/Script/avito.js`](Avito/Script/avito.js) — single http-response script, routed by URL; every handler fails safe (passes original body through)

### Avito app facts

From a capture of Avito iOS 230.1:
- Bundle / X-App-Id: `online.anero.app`; deep-link scheme `online.anero.app://`
- API host `app.avito.ru`, web/pixel host `www.avito.ru`; no cert pinning on either (MITM works)
- Responses are zstd (`Accept-Encoding: zstd;q=1.0, br, gzip`). ProxyPin stores bodies still zstd-compressed
  as latin-1 text — decode with libzstd before reading. The module forces `Accept-Encoding: gzip` on scripted endpoints.

### Avito ad pipeline

Feeds carry placeholder entries (`banner` with a list of `yandex` + `avito` sources). The client then calls
`POST /api/1/adv/network/banner` (Avito network, form body with targeting segments) and the Yandex Mobile Ads SDK
(`yandex.ru/ads/v4/ad`). Removing the placeholders stops both. Empty ad-server reply is
`{"no-content":{"message":"No available banner"}}`.

Banner codes seen: `promo_root_poster_ios` (home), `serp_4/10/17/24/30_ios` (search), `fav_mid_ios` (favorites), `item_btf_ios` (item card).

### Avito endpoint map

| Endpoint | Ad content | Handling |
|---|---|---|
| `/api/N/main/items` | `items[]` single-key objects: `embeddedAdvBanner` (pre-rendered creative), `banner`, `searchPromoHeaderWidget` | script drops them |
| `/api/N/items?` (search) | `result.items[]` `{type,value}`: `banner`, `promoWidget`, `actionPromoBanner`, `beduinV2ContentWidget` w/ widget_name ~ banner/promo | script drops them |
| `/api/N/favorites/items/list` | `success.items[]` `banner` | script drops |
| `/api/N/card/items/<id>` | top-level `salesBanner`, `beduinTeasers` (installment teaser slides); `beduin` layout nodes `commercial`, `commercialProfilePromoGallery`, `salesAdvertPromoBanner`, `salesBanner`, `rewardsBanner`, `fmpBanner`, `alfa_bank_banner_*` | script deletes keys / sets `visible` + `layout_visible` false |
| `/api/N/items/<id>/banners` | `success.positions.item_btf_ios` | script empties `positions` |
| `/api/N/internalBannerRotation/banners` | `success.banners` | script empties |
| `/api/N/serp/profile/items/banner` | My listings upsell ("discount on promotion", review nag) | script deletes `result.banner` |
| `/api/N/adv/network/banner` | ad server | reject-dict |
| `www.avito.ru/web/N/adv/network/(view\|click)` | pixels | reject-200 |

### Avito deliberately not touched

`/api/2/toggles` (185 feature flags, blocking breaks things), `clickstream/events` (first-party analytics,
expects `{"result":true}`), `itemReviews` entries of `type: banner` (info notice, not an ad), `itemsCarouselWidget` in search
(recommendations), `creditInfo` / `installments` on item card (functional), profile menu rows (`referral`, `promotions`, `rewards`).

Candidates if more cleanup is wanted on the item card: `fmpOffer`, `fmpCalculator`, `сashLoansCalculator` (first letter is Cyrillic С),
`autoCredit`, `avitoForBusiness`, `item_tires_banner_*`, `pets_insurance_item_block_*` — add to `CARD_HIDE_IDS` / prefixes.

### Avito third-party hosts seen

| Kind | Hosts |
|---|---|
| Ad-tech | exchange.buzzoola.com, ad/ev.adriver.ru, wcm.weborama-tech.ru, amc.yandex.ru, yandex.ru/ads/* (not MITM'd by this module — would need yandex.ru in MITM) |
| Telemetry | sentry-mobile.avito.ru, *.tracker-api.vk-analytics.ru (MyTracker), analytics.adjust.com/.io, report.appmetrica.yandex.net, firebaselogging-pa.googleapis.com, app-analytics-services.com, public-api.uxfeedback.ru (in-app surveys) |
| Left alone | startup.mobile.yandex.net (AppMetrica config, other Yandex apps depend on it) |
| Ad creatives | kinescopecdn.net video (generic video CDN — not blocked) |

### Avito known risks / to verify on device

- Home feed pagination: next page uses `offset` + `showedPageCount`; if the client derives offset from item count, dropping entries could cause an occasional duplicate item.
- `searchPromoHeaderWidget` also carries `toolbarConfig` (dark toolbar theme); removing it should fall back to the default toolbar.

---

## MegaFon

Shadowrocket module that strips promo, pop-ups, upsell and analytics from the MegaFon iOS app
(personal account, «МегаФон»). Written from scratch (not a fork). Every content switch is a
module argument, like [Ozon Marketplace](#ozon-marketplace-module-settings).

Files:
- [`Megafon/megafon.sgmodule`](Megafon/megafon.sgmodule) — `#!arguments`, analytics rule set, header rewrites, two script entries with the same script and argument (`megafon` for API JSON, `megafon-page` for the page and the VPN chunk), MITM hosts
- [`Megafon/Script/megafon.js`](Megafon/Script/megafon.js) — single http-response script, routed by host + path; JSON handlers and text handlers (HTML/JS); every handler fails open (original body passed through)
- [`Megafon/Rules/analytics-true.list`](Megafon/Rules/analytics-true.list) — analytics hosts, always loaded (the name is historical: its `analytics-false.list` twin is no longer loaded since placeholder URLs in `[Rule]` turned out not to work; the file is kept in `Megafon/Rules/` but unused)

### MegaFon app facts

From a capture of the iOS app 4.66.1 (web app v2.158.1), October 2026:

- The app is a thin native shell around the `lk.megafon.ru` web app (React, rspack chunks under
  `/public/rwlk/`) in a WebView. Nearly all traffic is the WebView's (Safari user agent, `Origin:
  https://lk.megafon.ru`, extra header `X-Cabinet-User-Agent: NLK iOS Phone <version>`). The
  native shell itself (`User-Agent: Megafon/2 CFNetwork/…`) only does auth refresh, the Who Calls
  antispam database (`whocalls.megafon.ru`) and MyTracker.
- Screens are built from JSON on `https://api.megafon.ru/mlk/api/*` (gzip; the server ignores
  `br`/`zstd`). The module still forces `Accept-Encoding: gzip` on scripted endpoints.
- Stories and in-app pop-up campaigns come from the InAppStory JS SDK (`api.inappstory.ru`,
  `X-User-Agent: InAppStoryJSSDK/…`); its requests carry `Origin: https://lk.megafon.ru`.
- No certificate pinning on `api.megafon.ru`, `lk.megafon.ru`, `api.inappstory.ru` (the MITM
  capture worked, login included).
- Caching: API replies are `Cache-Control: no-store` but also carry
  `X-Cabinet-Cache-Control: max-age=300, …, stale-while-revalidate=7776000`, and the page
  registers a service worker. Expect the web app to show its stored copy first and refresh it in
  the background: judge every change over **two launches**.
- `index.html` throws on any `/public/rwlk/*.js` chunk that fails to load, then refetches it and
  reports a `white_screen` crash. Never block `lk.megafon.ru` chunks (`metrika.*.js` included);
  block the hosts they call instead.
- VPN warning bar ("Отключите виртуальную частную сеть (VPN), чтобы в приложении всё работало
  хорошо", link to `megafon.ru/go/s_vn`): shown twice on every launch with Shadowrocket on, first
  over the web app's loading screen, then again on the main screen. It is the lazy chunk
  `public/rwlk/vpnNotification.<hash>.js` (rspack chunk 8521, module 62891 in the October 2026
  build, ~1.8 KB), root class `vpn-notification` (`cnCreate`), test ids from
  `nestingNameGenerator("VpnNotification")`. The component never checks for a VPN: the app decides
  before loading it (no API call or header carries the result; the native shell most likely
  passes it to the page). It starts as `useState(!!storageGet(SESSION_VPN_KEY))` and returns
  `null` when that is true; closing it (button or a >170 px swipe) writes `SESSION_VPN_KEY = "true"`
  through the storage helpers in module 19666, which only lasts for the session.
- The page's CSP has `'unsafe-inline'` in both `script-src` and `style-src` (no nonce), so an
  injected `<style>` in `index.html` applies.

### MegaFon: the appConfig switchboard

`GET /mlk/api/appConfig/wlk` returns feature flags in sections `main`, `services`, `finance`,
`loyalty`, `more`, `common`, `tariff`. The web app reads them as `{showX: v = false}`, so a flag
that is `false` or missing hides its block. That makes switching flags off the cleanest way to
remove a whole block; the matching lists are emptied as well, in case a component skips the flag.
The script only turns `true` into `false`; it never adds or removes keys.

| Setting | Flags switched off |
|---|---|
| `banners` | `main.showPromoBanner` |
| `stories` | `main.showStories`, `main.showStoriesTags`, `services.showStories` |
| `popups` | `main.showPopUpOffers`, `main.showMfoAssent` |
| `offers` | `loyalty.showPersonalOfferSection`, `loyalty.showSmartshopping` |
| `loans` | `finance.showMfo` (hides the "Платежи / Деньги" tabs in Finance; the "Деньги" tab is the loans/credit-card marketplace) |
| `games` | `loyalty.showGameCenter` |
| `onboarding` | `common.showOnboardings` |
| `surveys` | `more.surveyAlwaysOnEnabled`, `common.surveyMegaFamilyGroup` |
| `sections` → `megafamily` | `main.showMyNumbers` (the `main-my-numbers` block), `main.showFamily` (its МегаСемья tile) |
| `sections` → `cashback` | `main.showCashbackWidget` |
| `extra_flags` | any listed flag, in any section (default `showVacancies`) |

All other flags that were `true` in the capture are listed for `extra_flags` in the module's
`#!arguments-desc`, grouped by section, including `main.isEsimExchangeOtpEnabled` (the SMS-code
step of eSIM exchange). Flags not set by default are, or may be, features someone uses.

### MegaFon endpoint map

All paths under `https://api.megafon.ru/mlk/api/` unless a host is given.

| Endpoint | What it delivers | Handling | Setting |
|---|---|---|---|
| `appConfig/wlk` | feature switchboard (above) | flags `true` → `false` | per table above |
| `promoBanner/availableBanners` | promo banners by `screenId`/`place` (MAIN above stories, FINANCE credit market and partner deposit links, FAMILY, PROMISED) | `banners` → `[]` | `banners` |
| `banners?screen=<SCREEN>` | per-screen banner slot; `{}` in the capture | any non-empty object → `{}` | `banners` |
| `promoOffers` | `popUpOffers` over the main screen | `popUpOffers` → `[]` | `popups` |
| `mfo/assent/form` | "Финансовый помощник" consent pop-up (personal offers from partner banks via Banki.ru); `{"availability":false}` when not shown | `availability` → `false` | `popups` |
| `personaloffer/availableContent` | `superOffer` ("Вам подарок"), `offersList` (personal offers), `stubBanner`, `game` | `superOffer.availability` → `false`, `offersList` → `[]`; `game.availability` → `false`, `game.gameBubble` → `0` | `offers`; `games` |
| `partnersoffer/list` | partner offers (bare array: subscriptions, retail discounts, prize draws) | → `[]` | `offers` |
| `services/availableServices/categoriesList` | `promoOffers` tile on top of the services catalog, then `categoriesList` | `promoOffers` → `[]`, categories kept | `offers` |
| `onboardings/list?screenId=<id>` | "Добавили новые услуги…" feature tours | `onboardings` → `[]` | `onboarding` |
| `configuration/buttonBubble` | flat map of "new" bubbles on menu items | every `true` → `false` | `badges` |
| `superapp/components` | shortcut row `apps[]` (`appId`: `start` Кинотеатр, `money` Деньги, `eve` Ева, `shop` Товары, `additionalNumbers` Доп. номер, `megacinema` МегаКино, `homeInternet` Домашний Интернет) | listed `appId`s dropped | `shortcuts` |
| `stories/tags` | `tags[]` (account tags, e.g. `mega5g_available`, campaign tags) and `placeholders` (usage numbers for personalised stories) | tags starting with `mega5g` dropped: the Мега5G widget renders only while `mega5g_available` is present and `mega5g_ison` is not | `sections` → `mega5g` |
| `logs/severities` | client log shipping config (`enabled`, `activeSendPeriod: 10`, `batchSize`) | `enabled` → `false` | `analytics` |
| `lk.megafon.ru/settings.json` | `{app_version, app_environment, track, api_url}`; `track` turns on the Elastic APM RUM agent (`lk.megafon.ru/track/intake/v2/rum/events`) | `track` → `false` | `analytics` |
| `api.inappstory.ru/v2/feed/<feed>[/<sub>]` (POST) | story feeds: `default` = stories row on the main screen; `*onboarding*` feeds open by themselves on first visit of a screen | `stories` → `[]` (feeds with "onboarding" in the path follow `onboarding`, the rest `stories`) | `stories` / `onboarding` |
| `api.inappstory.ru/v2/inappmessaging` (POST) | in-app pop-up campaigns, triggered by screen events (seen: "Скидка 10% на тариф" for Умный автоплатёж, event `screen_plusmoney_iam`) | `messages` → `[]` | `popups` |
| `lk.megafon.ru/` and every other app route (`index.html`) | the page | `<style id="adblock-megafon">` (and, when `sections` has `roaming`, `<script id="adblock-megafon-js">`) added right after `<head>`, see [main screen and bottom menu](#megafon-main-screen-and-bottom-menu); nothing is added when no page setting is on; `If-None-Match` / `If-Modified-Since` removed from the request so the server always sends a full copy to edit | `vpn_warning`, `for_me_tab`, `sections` |
| `lk.megafon.ru/public/rwlk/vpnNotification.<hash>.js` | VPN warning component | its state init `useState)(!!(0,X.Y)(Z))` → `useState)(!0)` (starts "closed", renders `null`); only if the file contains `vpn-notification` and the pattern matches exactly once; same conditional headers removed | `vpn_warning` |

InAppStory requests are edited only when `Origin` is `https://lk.megafon.ru` or `Referer` starts
with it, so other apps that use InAppStory keep their stories even though the host is MITM'd.

Rule set (always on): `DOMAIN-SUFFIX,mc.yandex.ru` (Metrica with Webvisor/clickmap: 528
requests in a two-minute capture), `DOMAIN,abt.s3.yandex.net` (Varioqub script),
`DOMAIN-SUFFIX,tracker-api.vk-analytics.ru` (MyTracker, native), and
`URL-REGEX,^https:\/\/lk\.megafon\.ru\/track\/intake\/` (RUM; `settings.json` is the main switch).

### MegaFon: main screen and bottom menu

The main screen ("Связь") is the `main` chunk (`main.<hash>.js`). Its sections are components
with BEM root classes from `cnCreate` (October 2026 build): `main-balance-widget`,
`main-cashback-widget`, `main-expenses-widget`, `main-mega-internet-widget` (Мега5G),
`main-mfo-assent`, `main-my-numbers` (block titled from `devices/widgetTile`, "МегаСемья": tiles
Дели тариф, Плати за близких, Семейная безопасность, Контроль аккаунтов), `main-page-promo-banner`,
`main-remainders-megafamily`, `main-remainders-megapowers`, `main-remainders-mega-stub`,
`main-remainders-my-numbers`, `main-remainders-promo-banner`, `main-business-tiles` (B2B only).
The roaming section is past the part of the bundle that could be read (fetch tools cut it off at
~60 KB and the capture only has a 304), so its class name is unknown.

The service shelf (shortcut row) is `superapp/components`; `mainServiceShelfReorder` saves its
order (`MAIN / POST_SUPERAPP_ORDER`, `{appsOrder:[{appId, appOrder}]}`) and the web app skips the
`money` item unless `finance.showMfo` is true.

The bottom menu is web, not native: `cnCreate("bottom-menu")` in `user-layout.<hash>.js`, items
Связь (`MAIN`), Финансы (`FINANCE`, hidden for corporate accounts), Услуги, Для меня
(`PERSONAL`, route `/personal`: Game Center banner, personal and partner offers), Поддержка. Each
item is a link with class `bottom-menu__item` and `data-ym-title="<title>"`.

What the page injection does, by setting:

| Setting | Injected CSS (`display:none!important`) | Also |
|---|---|---|
| `vpn_warning` | `.vpn-notification`, `[data-testid^="VpnNotification"]` | chunk patch (endpoint map) |
| `for_me_tab` | `.bottom-menu [data-ym-title="Для меня"]` | |
| `sections` → `mega5g` | `.main-mega-internet-widget` | `mega5g*` tags dropped from `stories/tags` |
| `sections` → `megafamily` | `.main-my-numbers`, `.main-remainders-megafamily` | `main.showMyNumbers`, `main.showFamily` off |
| `sections` → `cashback` | `.main-cashback-widget` | `main.showCashbackWidget` off |
| `sections` → `roaming` | `[class^="main-roaming"]`, `[class*=" main-roaming"]` (a guess) | heading rule below |

Heading rule (`<script id="adblock-megafon-js">`, only added when `roaming` is listed; the page's
CSP allows inline scripts): a `MutationObserver` looks for `h1`–`h6` whose text starts with
"Роуминг", walks up to the nearest ancestor with a `main-…` block class (not `main-page`,
`main-layout`, `main-content`, `main-container`), and marks it with `data-adblock-megafon-hide`,
which the injected style hides. A block is only marked when that heading is the only heading inside
it, so a container holding several sections is never hidden. Tested in Chromium on a mock page:
hides a roaming block with an unknown class, including one rendered after load; leaves the balance
widget (which mentions "Кешбэк"), a two-heading container and the other tabs alone. Once the real
class is known, add it to `SECTION_CSS.roaming` in the script and drop the heading rule.

### MegaFon module settings

The module declares `#!arguments` (with `#!arguments-desc`). Both `[Script]` lines (`megafon`, `megafon-page`) pass them to the
script as the same JSON object; keep the two `argument=` values identical:

```
argument={"banners":{{{banners}}},"stories":{{{stories}}},"popups":{{{popups}}},"offers":{{{offers}}},"loans":{{{loans}}},"games":{{{games}}},"onboarding":{{{onboarding}}},"surveys":{{{surveys}}},"badges":{{{badges}}},"vpn_warning":{{{vpn_warning}}},"for_me_tab":{{{for_me_tab}}},"analytics":{{{analytics}}},"sections":"{{{sections}}}","shortcuts":"{{{shortcuts}}}","extra_flags":"{{{extra_flags}}}"}
```

The analytics rule set is not switchable (placeholders don't work in `[Rule]`, see
[Shadowrocket reference](#shadowrocket-reference)):

```
RULE-SET,https://raw.githubusercontent.com/b333b/adblocking-modules/main/Megafon/Rules/analytics-true.list,REJECT
```

| Setting | Default | Effect when `true` |
|---|---|---|
| `banners` | `true` | promo banners on main, finance, family and promised-payment screens |
| `stories` | `true` | stories row and stories inside screens (МегаСилы, services) |
| `popups` | `true` | pop-up offers, InAppStory pop-up campaigns, "Финансовый помощник" consent pop-up |
| `offers` | `true` | "Вам подарок", personal offers, partner offers, SmartShopping, services-catalog promo tile |
| `loans` | `true` | "Деньги" tab (loans and credit cards) in Finance. Turn off if you have a loan taken through MegaFon and need to see it there |
| `games` | `true` | Game Center and game teaser |
| `onboarding` | `true` | feature tours and onboarding story feeds |
| `surveys` | `true` | in-app surveys |
| `badges` | `true` | red "new" bubbles on menu items |
| `vpn_warning` | `true` | "Отключите виртуальную частную сеть (VPN)…" bar shown on every launch |
| `for_me_tab` | `true` | "Для меня" tab in the bottom menu |
| `analytics` | `true` | RUM telemetry and log shipping (script). Metrica, MyTracker and Varioqub are blocked by the rule set regardless |
| `sections` | `mega5g+megafamily+cashback+roaming` | main-screen ("Связь") sections to hide; available: `mega5g`, `megafamily`, `cashback`, `roaming` |
| `shortcuts` | `start+megacinema+shop` | service-shelf `appId`s to drop; available: `start`, `megacinema`, `shop`, `money`, `eve`, `additionalNumbers`, `homeInternet` (`money` is already hidden by the web app while `finance.showMfo` is false, i.e. while `loans` is on) |
| `extra_flags` | `showVacancies` | extra `appConfig/wlk` flags to switch off; the full list is in `#!arguments-desc` |

- Lists use `+` because `#!arguments` itself is split on commas; the script also accepts commas
  and spaces in a value typed in the app.
- If the argument isn't valid JSON (`True`/`False` with a capital, a stray quote, placeholders not
  filled), every switch counts as on and the lists fall back to their defaults. Check this first
  if turning a switch off has no effect.
- Every `#!arguments` default is non-empty (see [Shadowrocket reference](#shadowrocket-reference));
  a list can still be emptied in the app's module settings.

### MegaFon deliberately not touched

- `alerts?screen=<SCREEN>` — service notices (blocked number, roaming…), not promo.
- `tariff/<id>/current`, `preconstructor/megapowers` (МегаСилы tariff constructor), `options/v2/remainders/mini`,
  balance, payments, autopayments, transfers, expenses — the account itself.
- `mfo/credits/market` (contents of the "Деньги" marketplace page), `mfo/api/loans/v1/widget`,
  `mfo/api/installment/limit`, `mfo/credits/v2/info` (existing loan contracts) — `loans` hides the
  entry points instead.
- `gameCenter/banner` — hidden through `showGameCenter`; its empty shape is unknown.
- `personaloffer/availableContent` → `stubBanner` ("Посмотрите, что ещё у нас есть!") — kept so the
  offers section's empty state renders normally.
- `devices/widgetTile` (МегаСемья tile data), `cashback/v1/history/widget` — those blocks are hidden
  by flags and the page style instead; `stories/tags` placeholders, `user-profile/welcomeInfo/profile`, `push/token`.
- `logs/v2/accept` is not rejected: log shipping is turned off through `logs/severities`, and the
  same endpoint receives `index.html`'s white-screen crash reports.
- `uaas.yandex.ru` (Varioqub experiments for the Metrica counter, 30 calls in the same capture): a shared
  Yandex host, left out of the rule set. It is called by Metrica's `tag.js`, which no longer loads
  once `mc.yandex.ru` is blocked.
- InAppStory `session/open`, `session/update`, `inappmessaging/message-context`, `story?tags=…&favorite=1`.

### MegaFon third-party hosts seen

| Kind | Hosts |
|---|---|
| Analytics | `mc.yandex.ru` and numbered `*.mc.yandex.ru` (Metrica, Webvisor, clickmap, `tag_phono.js` call tracking), `abt.s3.yandex.net` + `uaas.yandex.ru` (Varioqub), `tracker-api.vk-analytics.ru`, `ts.` / `ip4.` subdomains (MyTracker) |
| First-party telemetry | `lk.megafon.ru/track/intake/v2/rum/events` (Elastic APM RUM), `api.megafon.ru/mlk/api/logs/v2/accept` |
| Stories / pop-ups | `api.inappstory.ru`, `cdn.inappstory.ru` (story covers and fonts) |
| Promo images | `i.megafon.ru/b/<id>/<id>.jpg`, `moscow.megafon.ru/download/~federal/…` (also serve ordinary icons — not blocked) |
| Partner links in banners/offers | affiliate click URLs with a per-subscriber `subscriberId` (loan marketplace, deposit offers) |

### MegaFon known risks / to verify on device

1. Main-screen sections and the "Для меня" tab: not yet confirmed on device. `roaming` relies on
   the heading rule (class name unknown), see [main screen and bottom menu](#megafon-main-screen-and-bottom-menu).
2. `URL-REGEX` for `lk.megafon.ru/track/intake/` only works if Shadowrocket applies rule-set URL rules
   to decrypted requests. `settings.json` `track: false` is the main switch either way.
3. `banners?screen=<SCREEN>` was `{}` everywhere in the capture; the shape of a non-empty reply is
   unknown, so the script replies `{}` whenever it isn't empty (unless it looks like an error).
4. "Вам подарок" is assumed to hide on `superOffer.availability: false`; the component lives in the
   main bundle, which the capture only has as a cached 304.
5. Not seen in the capture, chunks loaded: `promoSnackBar`, `headerNotifyCenter`. If one of them
   shows up, capture with the module on and find the endpoint that feeds it.
6. `promoOffers.popUpOffers` was empty in the capture: item shape unknown, the list is emptied as a whole.
7. VPN bar (`vpn_warning`), not yet confirmed on device:
   - If a bar is still drawn on the loading screen but not on the main screen, that one is native
     (the shell sees Shadowrocket's tunnel on the phone itself) and no network module can remove it.
   - The service worker could answer the page from its own cache; the chunk patch is the second
     layer for that case (the chunk was fetched from the network in the capture).
   - The chunk patch depends on the minified state init; after a MegaFon release the hash and the
     variable names change. The script then passes the chunk through and the injected style still
     hides the bar. Check with `curl` that `useState)(!!(0,` still occurs exactly once.
8. First launch after enabling (or after changing a switch) may still show the stored copy
   (see caching above).

### MegaFon testing

Throwaway Node harness outside the repo (as for [Ozon](#ozon-testing)): it reads the module, fills
the `#!arguments` defaults into the `argument=` template, checks that the result is valid JSON and
that both rule-set files exist, runs the script on every captured response the pattern matches,
and prints the changed JSON paths. On the 4.66.1 capture: 47 responses matched, 26 edited with the
defaults and only at the paths in the endpoint map; 0 edited with every switch off; InAppStory
replies with a non-MegaFon `Origin` untouched; empty, non-JSON, `null` and error bodies passed
through. Also run it after any pattern change: `inappmessaging/message-context`,
`mfo/assent/sign` and `tariff/*/current` must not match.

A second harness covers `megafon-page`: both script lines carry the same argument and script path,
the header rewrites use the same pattern, routes like `/`, `/main`, `/inapp/...` and the chunk
match while `settings.json`, `/track/`, other chunks, the chunk's `.css` and the service worker don't.
On the captured `index.html`, the style (and heading rule) is injected once right after `<head>`
and the rest is byte-identical; with every page setting off, or an already-injected page, nothing
changes; without `roaming` no script is added. The injected style and script were then run in
Chromium (Playwright) on a mock main screen, see [main screen and bottom menu](#megafon-main-screen-and-bottom-menu). The chunk
patch was run on a stand-in built from the real chunk's code (the capture only has a 304 for it)
and evaluated with stub React: the original renders the bar, the patched one renders `null`. On the
live file, `useState)(!!(0,c.Hd)(u))` occurs exactly once.

### MegaFon privacy

Captures of this app contain the account's and linked accounts' phone numbers and names, balance,
device id (`X-mlk-Device-Id`), cabinet/session ids, CSRF and refresh tokens in cookies, the
InAppStory user id and a per-subscriber `subscriberId` in partner links. Never commit captures or
anything copied from them; keep examples synthetic.

---

## Ozon

Shadowrocket modules and response scripts that remove promotional content from two Ozon iOS apps:

- **Ozon Bank** (`ru.ozon.fintech.finance`) — main screen and "Выгода" screen are a WebView
  on `finance.ozon.ru`, so their content can be edited in flight.
- **Ozon Marketplace** — native app whose screens are assembled from composer responses on
  `api.ozon.ru`, so ad widgets can be dropped from the layout before the app sees them.

Nothing here is a plain URL-REGEX rule list. Rules were tried first and abandoned; see
[Why rules were not enough](#ozon-why-rules-were-not-enough).

| Script | Loaded by | What it does |
|---|---|---|
| [`Ozon/Script/ozon-bank.js`](Ozon/Script/ozon-bank.js) | [`Ozon/ozon-bank.sgmodule`](Ozon/ozon-bank.sgmodule) | **bank script** — carousel, card offers and promo sections; no logging, no stored state (formerly `ozon-carousel.js`) |
| [`Ozon/Script/ozon-bank-debug.js`](Ozon/Script/ozon-bank-debug.js) | nothing by default (see [debug workflow](#ozon-bank-debug-workflow)) | **bank debug script** — capture pages, used when something breaks. Predates the current bank script: it does not know the `MFBonuses`, `api/mainPage`/`updateMainPage` routes or the `mfe-card-state` / `plastic-in-cart` / `banners-on-main` CSS selectors |
| [`Ozon/Script/ozon-marketplace.js`](Ozon/Script/ozon-marketplace.js) | [`Ozon/ozon-marketplace.sgmodule`](Ozon/ozon-marketplace.sgmodule) | **marketplace script** — drops ad widgets from composer pages and ad tiles / sponsored products from result grids |

A stale raw link is the single most common cause of "my change did nothing": check the real
paths before writing a module line.

### Ozon Bank: how the app delivers the main screen

| What | Where it comes from |
| --- | --- |
| Page shell **and server-rendered markup for every module** | `GET /m/lk/main` (~600 KB HTML) |
| Widget tree at load | `GET /apps/main/_mf/info/MFEMainMobile` |
| Widget tree on in-app navigation back to main | `POST /apps/main/api/mainPage` |
| Partial refresh (account block) | `POST /apps/main/api/updateMainPage` |
| Promo banner query (GraphQL-shaped) | `/apps/promo/api/banners/list` → `data.bannersV2.getHighestPriorityBanners.banners` |
| "Выгода" screen data | `GET /apps/loyalty/_mf/info/MFBonuses` → `ctx.frontendFacade.<Operation>` |
| Card-offer module data | `/apps/ca-traffic/api/{bannerV2,cardDeliveryWidget,frk/widget,loyalty/loyaltyState}` |
| Banner images | `cdn1.ozone.ru/s3/ob-banner-manager/…` |
| Module JS/CSS chunks | `cdn2.ozone.ru/s3/bozon-fe-<app>/…` |

The same widget can arrive filled in one response and empty in another: `MAIN_ACCOUNT_ACTIONS`
carried `{loyaltyType: "STARS", type: "ORDER_CARD"}` in `api/mainPage` while `MFEMainMobile`
had nulls. Check every endpoint before concluding a block has no data source.

Key structures:

- The page embeds each microfrontend's rendered HTML under
  `pageContext.__widget_data__["<MFName>@<app>"].data.body`, **percent-encoded, and the whole
  blob appears twice in the page** (an encoded copy and a plain copy). Missing the second copy
  looks like "the fix does nothing".
- The widget tree is a list of `{ id, type, status, version, data, error, widgets }`. Types seen:
  `USER_HEADER`, `MAIN_ACCOUNT`, `MAIN_ACCOUNT_CARDS`, `MAIN_ACCOUNT_ACTIONS`, `QUICK_ACTIONS`,
  `CREDIT_ACCOUNT_CARDS`, `TRUSTED_PERSONS_BANNERS`, `LAST_OPERATIONS`, `ORDER_CARD`,
  `MARKETING_BANNER_SLIDER`, `MARKETING_LAST_OPERATIONS_BANNER`, `NEW_PRODUCT_BUTTON`.
- `data: null` with `status: "READY"` is the app's own "nothing to show" state, which is why
  nulling a widget's `data` is safe, while a missing widget or a 404 is not.
- Each banner's content sits in a `config` **JSON string**:
  `{ id, link, image, imageDark, title, description, buttonText, buttonTheme, hasClose }`.
- On the "Выгода" screen the promo collections live in `ctx.frontendFacade`:
  `GetBannersList` → `getHighestPriorityBanners`, `GetCashbackProgram` → `promotionCellBanners`,
  `GetLoyaltyPromotionFilter` → `getPromotionFiltersV2`, `GetFRKBonusStateV2` →
  `activeLotteries` / `availableLotteries`. Everything else in that payload (cashback balance,
  monthly categories, stars, profile) must be left alone.

### Ozon Bank: what is removed and how

| Block | Handled by |
| --- | --- |
| Banner carousel | page: empty the `MFPromoBanners*@promo` rendered body + `banners`/`creatives` in the page data + CSS `[data-testid="banners-on-main"]` (the carousel container); widget tree: `MARKETING_BANNER_SLIDER` → `data: null`; `banners/list` → empty arrays |
| Banner in operations history | `MARKETING_LAST_OPERATIONS_BANNER` → `data: null` |
| "Карта с выгодой…" / "Заказать бесплатно" | page: empty `MFCardState@ca-traffic` body in **both** copies + CSS `[data-testid="order-plastic-v1"]` |
| "Ozon Карта в корзине" | same module: CSS `[data-testid="plastic-in-cart"]` |
| "Новый счёт или продукт" next to the balance | `NEW_PRODUCT_BUTTON` → `data: null` |
| "Новый счёт или продукт" card in the wallet row | CSS `[data-testid="new-product-block"]` |
| Order-card prompts / the whole card-state slot | CSS `[data-testid="mfe-card-state"]` (the ca-traffic slot holding the card offer, "Ozon Карта в корзине" and order-card prompts). `MAIN_ACCOUNT_ACTIONS` (its `actionButton.type` is `ORDER_CARD`) is no longer nulled by default; see below |
| "Выгода от партнёров", "Розыгрыши и акции" | `MFBonuses`: empty the promo collections above + CSS `[data-testid="priority-banner"]` |

Rendered by the main module (which also carries the balance) → hide with CSS.
Rendered by a module of its own → empty that module's body.
Delivered as widget data → null the widget.

Module script entries: `ozon-banners-page` (`/m/lk/main`), `ozon-banners-main`
(`MFEMainMobile`, `api/mainPage`, `api/updateMainPage`), `ozon-banners-loyalty` (`MFBonuses`),
`ozon-banners-list` (`banners/list`). Widget types are configured on the `ozon-banners-main` line, joined with `+`:

```
argument=MARKETING_BANNER_SLIDER+MARKETING_LAST_OPERATIONS_BANNER+NEW_PRODUCT_BUTTON
```

`MAIN_ACCOUNT_ACTIONS` was in this list before and has been dropped: the order-card section is
now hidden with the `mfe-card-state` CSS instead. To null it again, append `+MAIN_ACCOUNT_ACTIONS`.
It is named for actions in general; if Ozon ever puts something useful there, narrow the script
to clear `actionButton` only when its `type` is `ORDER_CARD`.

### Ozon Bank debug workflow

1. Point the module's `script-path` at `Ozon/Script/ozon-bank-debug.js`, and add an
   `http-request` line for `^https?://finance\.ozon\.ru/__dump` using the same script so the
   capture pages are served. Keep only one module matching a given URL —
   **Shadowrocket runs one script per request**, and a leftover module wins silently.
2. Launch the app, then open the pages in Safari (pull to refresh; Safari caches them):

   | Page | Shows |
   |---|---|
   | `/__dump` | runs, settings, what changed, before/after of the target widget |
   | `/__dump/full` | privacy-filtered outline of recent JSON responses |
   | `/__dump/html`, `/__dump/html2`, `/__dump/find` | decoded page windows |
   | `/__dump/raw` | the response as-is |
3. Compare the newest entry's timestamp with the launch. Older means nothing was fetched.

The debug script lags behind the bank script (see the table above); while debugging, the
"Выгода" screen and in-app navigation back to main are not cleaned.

### Ozon Marketplace

Every screen is built from `api.ozon.ru/api/composer-api.bx/page/json/v2`
(and `widget/json/v2`):

```
{ layout: [ { component, name, stateId, vertical, placeholders: [ { widgets: [...] } ] } ],
  widgetStates: { "<stateId>": "<json string>" },
  pageInfo, pageToken, userToken, requestID, shared, browser }
```

The script (module entry `ozon-mp-composer`) drops ad widgets from `layout`, at top level or
nested inside another widget's `placeholders`, and deletes their `widgetStates` entries. Defaults:

| Component | What it is |
| --- | --- |
| `advBanner`, `advVideoBannerMobile` | `rtb.*` sponsored banner and video |
| `advRefreshWithDelay` | `rtb.*` timer that reloads the page for fresh ads |
| `adBanner` | `skeeter.*` bank and product banners |
| `entryBannerWidget` | `regulardraw.*` prize-draw entry banner |
| `curtain` | pop-up curtain banners (separate `curtains` switch) |

Any widget whose `name` starts with `rtb.` is dropped whatever its component is.

#### Ozon Marketplace: ads inside result grids

Search ads don't live in `layout`, which is why layout pruning alone missed them. They sit inside
the `catalog.searchResultsV2` grid, as tiles in its `widgetStates` entry (a JSON string):

| Tile | How it is recognised |
| --- | --- |
| Ad banner tile | `tile.type === "banner"` with a `banner.badges[]` entry whose `text` is "Реклама"; each carries its own `pixel` and `impressionTrackingInfo` |
| Sponsored product | ordinary `type: "product"` tile whose add-to-cart action carries an `advert` token under `extendMap` |

The script parses every `widgetStates` string that contains `"tiles"`, drops both kinds of tile,
and writes the state back as a string. States it can't parse, and grids with nothing to drop, are
left byte-for-byte as they were. On two real captures: 12 and 22 ad tiles removed (on top of the
layout widgets), with 70 and 142 ordinary products left in place, no broken states and no paging
fields changed.

#### Ozon Marketplace: module settings

The module declares `#!arguments` (with `#!arguments-desc`), so each switch can be changed in the
module's settings in Shadowrocket. The `[Script]` line passes them to the script as one JSON object:

```
argument={"ad_widgets":{{{ad_widgets}}},"curtains":{{{curtains}}},"grid_ad_banners":{{{grid_ad_banners}}},"sponsored_products":{{{sponsored_products}}},"extra":"{{{extra}}}"}
```

| Setting | Default | Effect when `true` |
| --- | --- | --- |
| `ad_widgets` | `true` | drop the default layout widgets above, except `curtain` |
| `curtains` | `true` | drop `curtain` pop-up banners |
| `grid_ad_banners` | `true` | drop "Реклама" banner tiles inside result grids |
| `sponsored_products` | `true` | drop sponsored product tiles inside result grids |
| `extra` | `Add_components_here` (placeholder; matches no widget, so it drops nothing) | extra component names to drop, comma, `+` or space separated. `#!arguments-desc` lists the component names seen in captures (`banner`, `textBlock`, `cellList`, `twoCards`, `installment`, `bigPromoPDP`, `feedbackTile`, …) with the widget names they appear under. Don't add `tileGrid2`, `tileGridMedium`, `tileGridMini` or `tileScroll` (real products), and be careful with `pixel` (can drive cart alerts) |

- Widgets whose `name` starts with `rtb.` are dropped even with `ad_widgets: false`.
- With both grid switches off, result grids are not parsed at all.
- If the argument isn't valid JSON (for example the placeholders weren't filled in, or the value
  was cut at a comma), every switch counts as on: the module behaves as with the defaults and the
  settings are silently ignored. Check this first if turning a switch off has no effect.
- A legacy `+`-joined list of component names still works and replaces the component list
  (`argument=advBanner+curtain`). The earlier `tiles:keep` / `sponsored:keep` tokens are gone:
  use `grid_ad_banners` / `sponsored_products` instead.

Deliberately not included: `banner` (`cms.dynamicBanner`), `pixel`,
`userMarketingActionsSelector`.

`_action/v2/setBannerAction`, `_action/v2/regulardraw/markLkBannerAsSeen` and the
`xapi.ozon.ru` logging endpoints are pure tracking and can be handled with plain rules
(not in the module yet).

### Ozon script conventions

- One script file per app handles every pattern; it branches on `$request.url`.
- **Settings live in the module line, never in the file.** Editing JS on a phone introduces
  curly quotes and breaks the script silently.
- For the bank, always strip `Cache-Control`, `ETag`, `Expires`, `Last-Modified`, `Age`,
  `Pragma` and `Content-Length`, then send `Cache-Control: no-store, no-cache, must-revalidate`.
  Without this the app reuses a stored copy and every test result is meaningless.
- Return the original body untouched when nothing matched. Never fail closed.
- Edit surgically: null one field, empty one array, empty one module body, drop one widget.
  Never rewrite or reorder a response, and never touch account, card, balance, auth, cart,
  order or transfer data.
- Text edits on the page must handle both the percent-encoded form (`%22`, `%5C`, `%5B`) and
  the plain form, count brackets, and respect escapes.
- `$notification.post` does nothing in Shadowrocket. Report through a page instead.

### Ozon: why rules were not enough

- A URL-REGEX `REJECT` returns **404**, and a missing microfrontend is fatal: rejecting
  `/apps/promo/_mf/context` put the main screen in a reload loop (4 retries → 4 error reports
  to `/e` → full reload).
- `REJECT-DICT` answers with a bare `{}`, which does not match a GraphQL-shaped response, so
  the client treats it as an error and falls back to what it already had.
- Blocking `api/v4/{creditCard,installment,consumerCredit,autoCredit}/widget`,
  `/mobile/obank/features` or `creditProductsV5` breaks real functionality.
- Shadowrocket policies: see [Shadowrocket reference](#shadowrocket-reference).

Rules are still right for telemetry: `metrixa`, `load-metrics`, `logs-shredder`,
`logs-gateway`, `dlte`, `perf-metrics-collector`, `sentry.ozon.ru`,
`DOMAIN-SUFFIX,appsflyersdk.com`.

### Ozon testing

Run scripts under Node before committing. No framework: a throwaway harness defining
`$request`, `$response`, `$argument`, `$done` and `$persistentStore` that `eval`s the file is
enough. Test against bodies shaped like the real ones (rebuilt from a dump outline or a HAR
export kept outside the repo), asserting both that the target is gone **and** that everything
else is byte-identical — for the bank the account widget, balance and other modules; for the
marketplace the remaining layout, `widgetStates`, paging tokens and page info.

### Ozon privacy rules

The app's responses are not public.

- **Never commit dumps, HAR files, `.db` proxy exports, logs or screenshots of them.**
  `/__dump/raw` and `/__dump/find` are unfiltered and contain name, email, phone, Ozon id,
  session id and internal card ids. HAR captures hold the same plus balances and card data.
- Keep example payloads synthetic, with placeholder ids.
- The debug script stores captured responses in Shadowrocket's script storage and serves them
  over unauthenticated `__dump` pages. Say so in its header and in the README.

### Ozon: when a block comes back

1. Debug module on, one launch, read `/__dump`. The `widgets:` line names every widget type in
   the response, and `changes:` says what was applied.
2. If the entry is missing, the request never happened: caching, or another module ran.
3. If the block is visible while the response was modified, it has a second source. Check, in
   order: the rendered body in the page, the page's embedded data, a fetch by the module
   itself, and in-app navigation (`api/mainPage` was found exactly this way).
4. Prefer, in order: null the widget `data`, empty the list in place keeping the wrapper, empty
   the module's rendered body, hide with CSS by `data-testid`.
5. Judge over two launches, and for navigation bugs also leave the screen and come back.

---

## Yandex Maps

Shadowrocket module that removes ads, promo and UI clutter from Yandex Maps for iOS: blocking rules,
URL/header rewrites, MITM hosts, plus a script that edits server responses (protobuf experiment
flags and JSON configs).

### Maps target

- App: Yandex Maps for iOS, bundle `ru.yandex.traffic`, last tested on **30.3.1**.
- Client: Shadowrocket (modules, `[URL Rewrite]`, `[Header Rewrite]`, `[Script]`, MITM).
- Files:
  - [`Yandex/yandex-maps.sgmodule`](Yandex/yandex-maps.sgmodule): rules, rewrites, header edits, script wiring, MITM hosts.
  - [`Yandex/Script/yandex-maps.js`](Yandex/Script/yandex-maps.js): one script used by two `[Script]` entries:
    - `yandex-maps`: `binary-body-mode=1`, protobuf endpoints (MapKit config,
      discovery feed, category lists);
    - `yandex-maps-json`: text mode, JSON configs.
    The script dispatches on `$request.url`.
- Shadowrocket caches scripts fetched by URL: after pushing a script change, the
  module/script must be refreshed in Shadowrocket before testing.
- Test changes to the app with: force-quit, launch twice. Some changes only show
  after a delete + reinstall (see [Caching](#maps-caching)).

### Maps: how the app talks to the server

- Hosts: `proxy.mob.maps.yandex.net` normally, but the **first launch after install uses
  `geointernal.mob.maps.yandex.net`** for the same paths. Every rule must match both:
  `^https?://(proxy|geointernal)\.mob\.maps\.yandex\.net/...`
- `mapkit2/...` endpoints and `v1/search/discovery`, `v1/search/categories` are
  **protobuf**, usually gzipped. `v2/startup`, `v1/config`, `v1/compliance_config`,
  `v1/showcase/...`, `v1/discovery/search/intro` are **JSON**.
- The script can't gunzip, so the module strips `Accept-Encoding` on the endpoints the
  binary script edits. If a body still arrives gzipped, the script passes it through untouched.

### Maps caching

The cause of most "nothing changed" results.

- The app caches server configs and lists, and keeps showing the cached copy when a
  later response is empty, unparseable or blocked. A block only works if nothing got
  cached first, or if the response is a *valid* answer that overwrites the cache.
- Configs use ETag/`304 Not Modified`: the module deletes `If-None-Match` /
  `If-Modified-Since` so the app always gets a full body for the script to edit.
- `v2/startup` has `cache_time` 43200 (12 h).
- `v2/startup`, `v1/config`, `tooltips`, `notifications` are only reliably fetched on a
  fresh install, so a HAR from a warm launch won't contain them.

### Maps response types: what each "empty" does

| Answer | Protobuf endpoint | JSON endpoint |
|---|---|---|
| `reject-200` (empty body) | valid empty message | parse error |
| `reject-dict` (`{}`) | parse error → app keeps cache / shows error UI | valid but may miss required fields |
| emptying lists in the real body (script) | best | best: keep `meta`, set `meta.type = "empty"` where the server uses it |

- **Empty is not the same as hidden.** Some UIs fall back to built-in defaults when a list is
  empty, show "Что-то пошло не так", or resize on every map move.
- Never 302-redirect MapKit tile requests: MapKit does not follow redirects and the map
  stops rendering (tried `ads=enabled → ads=disabled` on `vmap3/tiles`).
- Shadowrocket `[Body Rewrite] http-response-jq` did not visibly apply to `v2/startup`
  (~470 KB uncompressed). All JSON edits are done in the JS script instead.

### Maps: MapKit config (the main UI switchboard)

`mapkit2/config/2.x/` carries about 600 experiment flags; the app shows many features only when a flag is present.
Protobuf layout (edited by `rewrite()` in the script):

```
top-level field 32 = experiments
  field 1 = one experiment { 1: test id, ..., 4: flag {1: namespace, 2: key, 3: value} }
```

The script removes flags listed in `GROUPS` (toggled by the `ON` block) and overrides values
listed in `SET`. Everything else is copied byte-for-byte. Namespaces seen: `MAPS_UI`,
`MAPS_RENDERER`, `MAPS_SUGGEST`, `MAPS_ADVERT`, ...

Removing a flag = the app's **built-in default**, which is sometimes "on". Confirmed cases:

| Flag | Effect of removing / overriding |
|---|---|
| `suggest_add_home` | «Добавить дом» button gone ✅ |
| `removing_search_bar` (`combo2`) | big «Куда?» button becomes a small icon ✅ |
| `ai_search_agent`, `ai_search_agent_map` | «Спросить AI» gone ✅ |
| `tab_bar_benefits_icon_1` + `tab-bar-custom-icons` (startup) + `show_plus` (compliance) | «Свои Плюсы» dock button gone ✅ |
| `tab_bar_new_design` | removing or setting `{"tabs": []}` changes nothing: the big-icon bottom bar is the built-in default in 30.3.1 ❌ |
| `discovery_shutter_on_the_main_screen` | removing or setting `"enabled": false` (with all its sub-options off) has no visible effect ❌ |

Other flags the script drops: `hints_in_search_bar_timeout`, `two_alice_main_screen`,
`pin_user_location*` (contains `clarify_location_screen` = «Уточнить геолокацию»),
`ads_promo_object_*`, about 30 `ad_*`/`advert*` flags, `experimental_promo_*` (suggest), `trx_care_config`
(insurance), `force_registration_*`, `rate_me_percentage`, `taxi_tab_on_main_screen`.

### Maps endpoint map

| UI element | Source | Handling |
|---|---|---|
| Promo objects fixed on screen (cars, animals) | `mapkit2/search/2.x/banner/promo_object`, images `avatars.mds.yandex.net/get-geoadv-ext/` | `reject-200`, `reject-img` ✅ |
| Ad pins | `mapkit2/search/2.x/poi/direct_ads`, events `.../events/advert` | `reject-200` ✅ |
| Photo POIs "for discovery" | `mapkit2/layers/2.x/personalized_poi_v3/` | `reject-200` |
| «Уточнить геолокацию» | `mapkit2/coverage/2.x/locjam`, `locspoof` (jamming/spoofing zones) + flag `pin_user_location` | `reject-200` + flag drop |
| Search bar hints («Рестораны с видом»...) | startup `maps-search-hints`, `maps-search-hints-v2` + flag `hints_in_search_bar_timeout` | lists emptied + flag drop ✅ |
| Showcase sheet / tabs («Для вас», «🍁 осень»...) | startup `maps-discovery-intents-config`, `v1/discovery/search/intro` | lists emptied |
| Showcase feed | `v1/search/discovery` (protobuf, re-requested on every map move) | script, `FEED_MODE` (see [Open issues](#maps-open-issues)) |
| Banners above search (promo cursors etc.) | `v1/showcase/v3/search/by_point/notifications` (re-requested on map moves) | `notifications: []`, `meta.type: "empty"` |
| Chip row («Где поесть», «АЗС с топливом», sponsored chips) | `v1/search/categories` with `maps_platform=mobile_maps_search` (**confirmed** by canary). Protobuf; field 4 = sponsored. Other origins (`mobile_maps_suggest`, `mobile_maps_automobile_guidance`) feed the search screen and navigation | script, `CATEGORY_MODE` (see [Open issues](#maps-open-issues)); other origins only lose sponsored entries |
| «Для вас» chip at the start of the row | not in any server response: built into the app (entry to recommendations) | none found |
| Plus | `egw.home-gateway.plus.yandex.net`, `app.tanker.yandex.net/user/profile` (`settings.isShowYandexPlusWidget`), compliance `show_plus` | `reject-dict`, script |
| Feature switches | `v1/compliance_config/...` → `contentConfig.maps_ui_flags` | script sets `show_plus`, `show_routes_taxi_banner`, `show_delivery_food`, `show_help_nearby` to false |
| Other startup promo | `maps-search-results-banners`, `maps-adverts-on-map-3d`, `profile-menu-icons` (`minusovik`, `plusovik`, `svoi_plusi`, `russpass_summer`) | emptied / filtered |
| Chain ads in navigation | `v1/config` → `ad_chains` | emptied |
| Navigation audio ads | `mobile-maps-common.s3.yandex.net/v1/audio_ads/` | `reject` |
| Ad counters / trackers | `yandex.ru/an/`, `yandex.ru/clck/`, `verify.yandex.ru`, `mc.yandex.ru`, `report.appmetrica.yandex.net`, `appsflyersdk.com` | rejected |

Not touched on purpose: insurance banners (`guidance-insurance-banner`, `care-*` in startup),
because removing whole startup sections risks breaking app launch; ads mixed into normal
search results (same response as real results).

### Maps open issues

1. **Chip row**: the server list `v1/search/categories` (`mobile_maps_search`) is the confirmed
   source: with the canary, the chips showed `ТЕСТ-3`. An empty list (`reject-200`) makes the app
   fall back to its own set, so `CATEGORY_MODE` keeps one entry the app shouldn't be able to draw:
   `unknownType` (type `hidden`, action `none`), else `noTitle` (empty title). Result pending.
   The startup / `v1/config` `search_categories` fallbacks are emptied too (`CANARY` labels them
   `ТЕСТ-1`/`ТЕСТ-2`; keep `CANARY = false`). «Для вас» stays either way: it's built in.
2. **Search bar bouncing** on every map move. It appeared once `v1/search/discovery` got a
   valid empty answer (`reject-200`); `{}` didn't bounce but showed the error text. Deleting
   the discovery rule entirely stopped it. With the script handling discovery, it bounces with
   every `FEED_MODE` value, including `off`, so the header edit (`Accept-Encoding` removal) or
   script routing on that endpoint may be involved. Next test: remove `v1/search/discovery`
   from both the script pattern and the header rewrite.
3. **Bottom bar** (Навигатор, Заправки, Транспорт, Такси): no network lever found in 30.3.1.

### Maps debugging workflow

- Shadowrocket log export (`proxy-*.db`, SQLite): table `logging_content`, columns
  `c0url`, `c1ua`, `c2result` (matched rule/policy), `c3type`, `c4created`. It has URLs and rule
  matches, no bodies, and doesn't show whether a script or body rewrite ran.
- Bodies: capture with ProxyPin (HAR) **with Shadowrocket off** (one VPN at a time). Start
  recording **before** installing and opening the app, or first-launch requests are missed. In
  ProxyPin's HAR, binary bodies are stored as latin-1 characters (`text.encode('latin-1')`),
  often gzipped.
- Decode protobuf with a raw decoder (no `.proto` files); strings are readable.
- Test script changes in Node against captured bodies before shipping (the script exports
  `rewrite`, `editJSON`, `stripFeed`, `categories` when `module` exists). Don't commit the test data.

---

## Yandex Go

Shadowrocket module removing ads and annoyances from the Yandex Go iOS app (built against app 4.19, September 2026). This section is the only documentation for Go (the repo has no README): user-facing summary first, then implementation notes.

### Go install

Standalone: Shadowrocket → Config → Modules → + →
`https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Yandex/yandex-go.sgmodule` (HTTPS decryption on, Shadowrocket CA trusted).

### Go: what it removes

| Area | Removed | How |
|---|---|---|
| Main screen | Endless recommendation feed below the service tiles (Market products, Eats places, Lavka shelves, Market video, `media-adv` banners) and the media-banner slot | Feed section emptied, its pagination trigger neutered |
| Launch | "Доброе утро"-style splash, New Year splash; location-permission bar (experimental) | `promotions/v1/splash` emptied, splash experiments off; position-clarification flags cleared in finalsuggest |
| Promotions | Stories, screen-bound promo pop-ups and notifications (e.g. chargers, delivery form, in-ride) | `promotions/v1/list` filtered; on-demand cards (safety centre, pets, wheelchair info) kept |
| Order summary | Promo blocks | `summary_promoblocks` experiment off |
| Taxi map | Animated campaign badges over the map | `mlutp/v1/products` filtered |
| Taxi ride | Market/Eats/ad feed under the ride card while the taxi is on its way (product cards, shelves, `media-adv` banners) | `bdui/v1/taxi/tracking` feed emptied, its pagination trigger neutered, `need_to_hide_feed_container` set to true; ride card untouched |
| Transport | Ad hero banner (erid) on the public-transport screen, "Когда придёт автобус" promo badge over the map | `bdui/v1/masstransit/main` ad section neutered; `inapp-communications` filtered |
| Delivery | Urban-ads banner carousel, "Переезд под ключ"-style story banners on the order form | `ads-banner` widget removed from the dashboard, `urbanads/sdk` neutered, `delivery-promotions` emptied |
| Intercity | Promo/onboarding story banner carousel ("Шаттл", "Что такое Межгород?", "Какой тариф выбрать") | Banners and carousel section removed |
| Chargers | "Как сэкономить?" pass promo and "Яндекс Движ" subscription tile | Chargers screen filtered; QR scan, passes, discounts, support kept |
| Afisha | AdFox ad slots and page branding, Yandex ad-network loader, anti-adblock script | Rules |
| Scooters | Promo tiles (points giveaways, subscription and minute-package upsells, story banners), promo block | Scooters screen filtered; nearest scooter, QR scan and menu kept |
| Market | Hero ad carousel, "Реклама" tiles, sponsored product scrollboxes, ad banners and incuts in feeds and search, banner carousels on promo pages, header promo strip, fortune wheel entries and daily-reward pop-up, coins overlay in the video feed, FOMO sale badge, ad and onboarding pop-ups, bank card / Split / credit upsells in cart and profile, referral promos, "leave a review" nags | Stylesheet injected into Market pages; daily-reward response neutralised |
| Eats | Ad pop-ups (main page, department and pharmacy screens), brand-sponsored pharmacy shelves ("Выберите свой Durex" etc.), hero/recommendation/restaurant-collection ad banners, department ad carousels (food, pharmacy), promo banner shelf, gamification goals, "rate your order" widget, per-restaurant ad trackers | `layout-constructor` and `bdui-mobile` screens rewritten; `eats-communications` answered with `{}` |
| Lavka | **Nothing**: Shadowrocket can't MITM Lavka (it answers with a captcha), so its ads stay: in-order hero carousel, Market hero banners, sponsored tiles, video banners, advertiser stories, "personal discounts" button | No MITM host, no script line; the `upsale/media-feed` and `informers` handlers in the script are inactive. See [Lavka](#go-applavkayandexnet-lavka-web-app) |
| Network | Market ad pixels and click logging, Yandex ad network (counters, loader, AdFox), Yandex anti-adblock script, Metrica (incl. counter subdomains and helpers), AppMetrica reports, video player logs, Firebase Analytics | Rules / URL rewrites |

Service tiles, ride suggestions, the wallet widget, restaurant lists, grocery products and Market's organic product listings are not touched.

### Go files and combining with Maps

- [`Yandex/Script/yandex-go.js`](Yandex/Script/yandex-go.js) — single http-response script, routed by URL (`ROUTES` at bottom)
- [`Yandex/yandex-go.sgmodule`](Yandex/yandex-go.sgmodule) — standalone Go module (rules, URL rewrites, scripts, MITM). May be folded into the Maps module instead; if so, see below and delete this file.

All Go sections append cleanly to the Maps module: `[Rule]`, `[URL Rewrite]`, `[Script]` lines go under the Maps module's matching headers. Keep a single `[MITM]` line and merge hostnames into it (`tc.mobile.yandex.net, tc.eats.yandex.ru, go.integration.market.yandex.ru, yandex.ru`). Script names are prefixed `yandexgo-` so they don't collide. Trade-off: the tracker rules (Metrica, Firebase, ad pixels) and the `yandex.ru` MITM then apply whenever the Maps module is on, and Go can't be toggled separately. See also [Cross-module overlaps](#cross-module-overlaps).

### Go principles

- Fail open: unexpected shape → `$done({})`, never a half-edited body. If Yandex changes a format, ads come back but the app keeps working.
- Neuter rather than delete when other parts of a payload reference a node (superapp feed section is kept but emptied).
- Keep functional/informational content (service tiles, suggestions, wallet, on-demand promo cards, products).

### Go captures

HAR captures (ProxyPin) contain personal data: phone number, home/work addresses, account and device IDs, Market search history. They are analysed in chat only; never commit captures, derived dumps or test harnesses that read them, and never paste their contents here. The repo intentionally has no local tooling for this.

### Go endpoint map

Captures 2026-09-27, app 4.19, ProxyPin: main screen/Eats/Lavka; Market/scooters/taxi; Market deep dive; Eats deep dive; location bar; Transport/Delivery/Intercity/Chargers/Afisha/pharmacy.

Hosts: [tc.mobile.yandex.net](#go-tcmobileyandexnet-main-app-backend) · [go.integration.market.yandex.ru](#go-gointegrationmarketyandexru-market-web-view-inside-go) · [tc.eats.yandex.ru](#go-tceatsyandexru-eats-web-app-inside-go) · [app.lavka.yandex.net](#go-applavkayandexnet-lavka-web-app) · [Trackers](#go-trackers-rules)

#### Go: tc.mobile.yandex.net (main app backend)

- `POST /4.0/mlutp/v1/widgets/layout/superapp` — main screen, flex/DivKit layout. `ui.sections[]`: payment_widgets, orders_widgets, navigation_divkit (big tiles), pager_widget (small tiles), taxi_block (search + suggestions), empty_products, bdui_media_banners, feed_onboarding_scroll_anchor, **feed**.
  - Feed section: `origType: feed_section`, `content[]` items of type `generic-offer-v2` (Market cards, Eats places, Lavka goods, Afisha), `shelf`, `video`, `media-adv-banner-single` (ad). Snippet ids in `shared.analytics` show sources: RETARGETING, EATS_PLACE, LAVKA, GCRM, recom_program `sdk_go_main`.
  - Pagination: `loadingSnippet`/`errorSnippet` (`closing_snippet`) fire a `MergeSectionAction` with `pagination_token`; the page request is the same endpoint with a top-level `sections` key in the body and the response contains only the `feed` section.
  - Oct 2026: the layout gained a second feed section, `feed_tab` (`origType: feed_tab_section`): empty `content` plus a `closing_snippet` that shows FeedSDK shimmers and fires a `MergeSectionAction` with `pagination_token` / `active_tab`. Follow-up responses contain only `feed_tab`, with `generic-offer-v2`, `shelf` and `media-adv-banner-single` items. `feed` itself now arrives without a `loadingSnippet`.
  - Handling: `isFeedSection()` matches `origType` `feed[_*]_section` or `id` `feed` / `feed_tab`. Each match gets `content = []`, and its snippets' `actions = {}` and `divData` replaced by an empty container.
  - The in-ride feed uses the same feed section but arrives on a different endpoint, `bdui/v1/taxi/tracking` (see below).
- `POST /4.0/promotions/v1/list` — `fullscreen_banners`, `cards`, `notifications`, `tickets`, `stories`, `missed_seen`. Items bound to a real screen (`screens: ["chargers"]`, `feed_taxi_transporting`, `delivery_order_form_ndd`, `scooters`) auto-show → dropped. `NO_SCREEN` items are opened by deeplink (Safety Center promoblock) → kept.
- `POST /4.0/promotions/v1/promotion/retrieve` — single on-demand info cards (wheelchair, pets, guide dogs). Not touched.
- `POST /4.0/promotions/v1/splash` — `splash_screens[]` (`type: dynamic_promo`) → emptied.
- `POST /3.0/launch` — account/session + `typed_experiments` (contains PII in the raw body).
- `POST /4.0/mlutp/v1/products` — taxi main-screen config per mode. `modes[].objects_over_map` = animated campaign badges on the map (e.g. "Почему кирпич?", `analytics_payload.campaign_id`, `yandextaxi://banner?id=` deeplink) → filtered. `charity` menu button left alone.
- `POST /4.0/mlutp/v1/products/screen/scooters-discovery` — scooters sheet. `screen.offers.items[]` + `screen.sections[].shortcut_ids`. Promo tiles: `personal_shortcut:<kind>:…` with kind `mos_ru` ("Дарим 450 баллов"), `subscription`, `packages_entrypoint` ("Пакеты минут"), and `type: deeplink` image banners opening `yandextaxi://story?id=`. `personal_slider` container mirrors its first `nested_offer_ids` tile → re-pointed at the first surviving tile (`nearest_scooter` = "Самокат рядом", functional). Menu list items (subscription, ignition, promocodes, support, safety) kept.
- `POST /4.0/scooters/v1/promoblock` — `{}` observed → `reject-dict`.
- `POST /4.0/mlutp/v1/products/screen/chargers-discovery` — same shape as scooters (handled by the products route). Promo tiles: `personal_shortcut:energy_pass:…` ("Как сэкономить? С выгодным предложением"), `personal_shortcut:city_sub_buy:…` ("Кое-что новое / Яндекс Движ") → dropped via `PROMO_PERSONAL_KINDS`. Kept: QR scan, `passes:id` ("Заряжайтесь выгоднее" menu item), discounts, beacons, support, legal.
- `POST /4.0/bdui/v1/masstransit/main` — Transport screen, flex/DivKit envelope. Sections: where_to, masstransit_suggests, masstransit_transport_card (Тройка), masstransit_tickets_v2, **ads** (`origType: MediaAdvHeroRenderData`, ORD/erid) → neutered by generic `handleBdui` (`AD_SECTION_TYPES`: MediaAdv|SdkBanner|MediaBanners|Madv|CommonBannersWidget) + Madv pop-up actions stripped.
- `POST /4.0/bdui/v1/taxi/tracking` — sheet under the ride card during an active order (seen Oct 2026, status `driving`). Request body: `order_status`, `order_tariff_class`, `userLocations`, `payment_info`, `media_size_info`; pages 2..n add a top-level `sections: [{raw: {id: feed}, refreshParams: {pagination_token}}]`. Response: flex/DivKit envelope, `scaffold.type: TrackedScrollScaffold`, and **one** section, `feed` (`feed_section`, 17–19 items: `generic-offer-v2` Market cards mostly carrying ad markers/erid, `shelf`, `media-adv-banner-single`/`-double`). `actions.onApply` sets the global div variable `need_to_hide_feed_container: false`. Handling (generic `handleBdui`): feed sections emptied and snippets neutered like the main screen; `need_to_hide_feed_container` set to `true` (kill switch `HIDE_TRACKING_FEED_CONTAINER`). The ride card (driver, car, status, cancel) is native, from `3.0/taxiontheway`; its `promotions`/`brandings` were empty and it is not touched. Sheet heights per status come from the `superapp_order_details_feed` experiment (left alone; disabling it is the fallback if the empty sheet looks wrong). Related, not touched: `mlutp/v1/inapp-widgets` (order widget), `3.0/orderchat`, `4.0/orderperformerinfo`.
- `POST /4.0/urbanads/sdk` — body `{format: hero|popup, page: DostavkaMainPage|feedback}`; response is an ad unit (`SdkBannerRenderData` → `SdkBannerCarousel`, ORD legal info, "why this ad" kebab popup) → every section neutered.
- `POST /4.0/inapp-communications/v2/communications-masstransit` — `offers.objects_over_map.items[]` (campaign badge "Когда придёт автобус", `analytics_payload.campaign_id`, `yandextaxi://banner?id=`) → filtered with `isPromoMapObject`, `priority` synced; `offers.promoblocks.items` → emptied. Same handler covers any `inapp-communications/*`.
- `POST /4.0/inapp-communications/v1/delivery-promotions` — `banners.banner_list[]` story banners on the Delivery form → emptied.
- `POST /4.0/cargo-c2c/v1/dashboard/content` — Delivery dashboard `sections[].widgets[]`; widget `type: ads-banner` (`ads_banner_settings: {type: urban-ads, page: DostavkaMainPage}`) → removed. Courier/PVZ/cargo tiles kept.
- `POST /4.0/intercity/v1/dashboard/content` — top-level `banners[]` (story/onboarding/promo) + section `type: banner_carousel` → both removed. `popups` left (only opened from the removed banners).
- `POST /4.0/persuggest/v1/finalsuggest` — pin → address resolution for the main screen and Taxi (`results`, `points`, `zones`, `typed_experiments`). Position clarification flags cleared (see [location-bar section](#go-location-permission-bar-experimental-fix)).
- `POST /3.0/routestats` — tariffs/prices; nothing ad-like found. Not touched.
- `POST /3.0/zoneinfo` — 640 KB zone config; nothing ad-like found. Not touched.

#### Go: go.integration.market.yandex.ru (Market web view inside Go)

Server-rendered React (apiary). Documents (`/`, `/catalog--…`, `/navigation`, `/special/…`, `/kolesoprizov`) are HTML; `/api/render-lazy` returns HTML fragments, `/api/resolve/` JSON. CSP `style-src` has `'unsafe-inline'` → the script injects `<style id="ygo-adblock">` before `</head>` of every HTML document (route `/(?!api/)`, content-type checked). Selectors (see `MARKET_CSS`):
- widget roots: `data-apiary-widget-name` — all `@monetize/*` (HeroContentCarousel, Banner, *Incut, PromoStreamer, MadvHeaderPromoManager, ShowDaemon), `@light/SearchIncut`, `@light/LegacySearchIncut`, `@search/SoonOnSaleIncut`, `@marketfront/IncutConstructor/MediaBanner`, `@promo/SearchPromoHeader`, `@marketfront/HeaderPromoBlockRedesigned` (header promo strip: "Колесо призов", "Скидки на сегодня", "Прямой эфир"), `@light/HeaderFortuneWheelBalance`, `@marketfront/MadvPopup`, `@FOMO/FOMOPopup`, `@marketfront/SkidkomatPromocodesPopup`
- zones: `data-zone-name` heroSlideshow, mainPromoHeader, promoWidget, recomMadv, madvIncut, madvPopup, fomoPopup, vezdehod, ugcAgitationSnippet
- any `data-zone-data` containing `advTagInfo` (ad-law label / erid) — covers every "Реклама" tile
- Added after the Market deep-dive capture: `[data-zone-name="recomMediaAdv"]` (sponsored product scrollboxes in recommendation rolls), `@light/BannerCarousel` (CMS banner carousels on promo landings `/page/special`, `/page/ultima`), `@marketfront/ContentFeedPromoOverlay` (coins-for-watching overlay on `/feed`), profile: `@marketfront/profile/ProfileFintechPromoWidget` + zone `bankProductPromoWidget` + zone `promoProduct` (Pay plastic card, Super Split promos), zone `wheelGiftsMenuItem`, `@wishlist/ReferralEntryProfile` + zone `referralProgramBalanceWidget`; cart: `@mf-online-ux/CartFintechAgitation`, `CartFintechAgitationPopup` (VTB card discount), `CartBnplWidget`, `CartCashCreditWidget` (client-rendered, empty in SSR); pop-ups: `@segmentations/ComplimentPopup`, `@wishlist/ReferralOnboardingPopupContentV2`, `@mf-wishlist/WishlistEntryOnboardingPopup`; `@card/RemixAgitationSnippet`.
- Deliberately kept: Split balance (`splitBalanceWidget`, `ProfileFintechWidget`), "Промокоды и акции" menu item, promo-code form in cart, Ultima/"Спешл" section headers (navigation), `ecomAssistant`.
- Verified with bs4 on all captures (home, catalogue ×3, feed, profile, cart, wishlist, navigation, special, ultima, ecom-assistant + render-lazy fragments): every rendered "Реклама" label hidden, 0 organic product snippets hidden (the one hidden in render-lazy is a `madvIncut`/`recomMediaAdv` sponsored scrollbox). The only unhidden "Реклама" string is ad-law disclaimer text inside the cart's VTB pop-up JSON config (widget hidden). Earlier result: all 13 "Реклама" labels on the home page hidden, 0 of 17 organic product snippets hidden, 0 of 6 on the catalogue page.
- `POST /api/web/market.front.mfPromoLoyalty.MfPromoLoyalty/resolveFortuneWheelDailyRewardsScreenData` — daily sign-in / fortune wheel pop-up → `dailyRewardFortuneWidgetBase64` removed, `rewardAvailable: false`.
- Unknown: whether the web view uses a service worker that could serve cached HTML without the injected style (none seen registering in the capture).
- Not hidden: `ecomAssistant` (AI assistant button), fortune wheel page itself (only reachable via the hidden entries).

#### Go experiments flipped

In any `typed_experiments.items`: `new_year_splash_2025`, `dynamic_splash_screen_parameters`, `summary_promoblocks`, `mobile_ads_sdk_options`, `turboapp_business_promo`, `fintech_paymentmethods_banner`, `delivery_payment_promo` → `enabled: false`. Candidates not touched (could break UI): `superapp_main_feed_client_features`, `superapp_feed_configuration`, `superapp_order_details_feed`, `plus_sdk_widget`, `scooters_client_upsale_*`.

#### Go: tc.eats.yandex.ru (Eats web app inside Go)

- `POST .../eats/v1/layout-constructor/v1/layout` — `layout[]` (order: `{id, type}`) + `data{type: [widgets]}`. Dropped types: `madv_popup_communications`, `madv_hero_banners`, `banners_carousel`, `user_goals`, `mini_feedback` (+ the `header` directly before each). Almost every place has `features.advertisement` (em.market.ya.ru pixels, `adv_context`) → stripped, place kept. Removing all "ad" places would empty the catalogue.
  - Pharmacy (`sku_apteka`) page on the same endpoint: `madv_popup_communications` (`market_popup_communication_apteki`), `madv_hero_banners` (`…_hero_apteki`) dropped as before; `sku_upsell_promo_carousel` (template `sexy_polka`, collection slugs like `…_durex_polka_YA`, `…_TeraFlyu_polka_YA`: brand-paid shelves) → dropped. Plain `sku_upsell` shelves ("Всегда пригодится", collections) kept.
  - Same endpoint serves restaurant collections (`view: {type: collection, slug: restaurants}`) and quick filters (`filters_v2`); extra ad templates seen there: `madv_banners_hero_eda_rest` (type `madv_hero_banners`, dropped), `Place_list_with_ads`, `you_ordered_with_ads_first_cpa_podm` (places kept, trackers stripped). 21 responses in the Eats capture: 0 "Реклама"/media-adv/em.market/erid left after rewrite.
- `POST .../eats/v1/bdui-mobile/v1/collection?collection=<slug>` — department screens (`food_department`, `pharm_department`). Flex/DivKit envelope like the superapp layout (`ui.sections[]`, `actions`). Ads: section `origType: CommonBannersWidget` (banner carousel with "Реклама", `AdvertisementAction`, media-adv pixels) → neutered; `actions.onAwake.actions[]` item `type: MadvPopupCommunicationsAction` (`madvPopupData.bottomsheets[]`, ORD creative + media-adv pixels; e.g. pharmacy promo sheet) → removed (generic `stripActions`, also applied to superapp layouts). Remaining sections: ViewHeaderRenderData, SearchBarRenderData, HotlinksWidgetRendererData, PlaceMultilineRenderData — kept.
- `POST .../eats-communications/v1/communications` — `{}` observed as a valid response → `reject-dict`.
- `welcome-features`, `notifications-center` — empty in capture; not touched.

#### Go: app.lavka.yandex.net (Lavka web app)

Not handled: Shadowrocket can't MITM Lavka (confirmed 2026-10-16).

- With only `app.lavka.yandex.net` added to `[MITM]` (no wildcards, no Lavka script), Lavka answers with Yandex SmartCaptcha (`/showcaptcha`, `/checkcaptcha`, `/captchaimage` on `app.lavka.yandex.net`). It triggers on data endpoints such as `api/v1/layout` and `upsale/media-feed`, and solving it doesn't stick. Removing the host fixes it.
- The request headers Shadowrocket forwards are identical to ProxyPin's, and ProxyPin-decrypted Lavka never got a captcha. The likely trigger is Shadowrocket's outbound TLS fingerprint, which a module can't change.
- So the host stays out of `[MITM]` and the module has no `yandexgo-lavka` script line. The Lavka handlers in the script (`handleLavkaMediaFeed`, `handleLavkaInformers`) stay inactive: nothing routes to them. Rules can't help either: an HTTPS path is only visible once decrypted, and rejecting the whole host breaks Lavka.

Consequence: Lavka ads stay. Among them:

| Ad | Endpoint | Client on error |
|---|---|---|
| In-order hero carousel: about 10 auction-sold banners, images from `avatars.mds.yandex.net/get-market-adv/` and `/get-direct/`, rendered by the lazy chunk `yandex-urbanads-sdk-carousel` from `yastatic.net/s3/grocery-superapp/` | `POST /lavka/v1/adv/v1/banners` (body `source: tracking`, `block: LavkaTracking`) | `load_urban_ads_creatives_error` → `{result: []}`, no ads |
| Market hero banners | `adv/v1/get-banners` | `load_market_hero_banners_error` → `{marketBanners: []}`, no ads |
| Sponsored tiles | `orders-tracking/v1/informers` | |
| Sponsored video banners, advertiser stories, "personal discounts" button | `upsale/media-feed`, `informers` (below) | |

Since the client falls back to no ads when `adv/v1/banners` or `adv/v1/get-banners` fails, a MITM-capable client would only need a plain reject on those two paths.

Notes on the inactive handlers, kept in case Lavka can be MITM'd again (that needs both the MITM host and a `yandexgo-lavka` line for `.../lavka/v1/api/v1/(upsale/media-feed|informers)`):

- `POST .../lavka/v1/api/v1/upsale/media-feed` — `items[]` (goods), `media_items[]`, `layout_items[]` (`{type, id}`). Sponsored: `adv_tag_info` (erid, advertiser), `type: video_banner` (linked via `advertisement_id` ↔ layout `banner`), story informers (`informer_id` ↔ layout `story`).
- `POST .../lavka/v1/api/v1/informers` — floating "personal_discounts" button → dropped.
- Gamification (`rewards-hub`, `goals/v1/list`) — not touched.

#### Go trackers (rules)

| Group | Hosts / paths |
|---|---|
| Ad network / AdFox / anti-adblock | `an.yandex.ru` (ad network meta/mapuid), `*.adfox.ru` (AdFox; Afisha `adfoxBrandingId` page skins and slots), `yandex.ru/ads/…` (`ads/system/context.js`, 430 KB ad-network loader on Afisha), `static-mon.yandex.net` (`static/main.js`/`optional.js?pid=yandex_afisha`, obfuscated `eval` anti-adblock loader) |
| Ad pixels / click logging | `media-adv.market.yandex.ru/events`, `em.market.ya.ru/<id>`, `yandex.ru/an/rtbcount/...`, `amc.yandex.ru/show`, `yandex.ru/clck/click` (POST, ~95/session), `yandex.ru/clck/jclck`, `adfstat.yandex.ru/image/market`, `market-baobab.yandex.ru/safeclick/json` (~70/session) |
| Analytics | `mc.yandex.ru`, `*.mc.yandex.ru` (numbered counter subdomains, `solid.ws` websocket, `metrika/advert.gif`), `mdd.yandex.net`/`hdrc.yandex.net` (Metrica helpers), `report.appmetrica.yango.com`, `log.strm.yandex.ru`, `app-analytics-services.com` (Firebase), `icmp0.ru` (network probe from Market page), `csp.yandex.net` (CSP reports) |
| Seen, not blocked | `graph.facebook.com` (global rule would break FB login elsewhere), `api.browser.yandex.ru/uma_proto` |

### Go open items

- Ride-screen feed (`bdui/v1/taxi/tracking`): handled since Oct 2026, verified on a capture only. On device, check whether `need_to_hide_feed_container: true` collapses the empty sheet area; if it leaves a blank or broken sheet, set `HIDE_TRACKING_FEED_CONTAINER` to false. Statuses other than `driving` (waiting, transporting) not captured yet.
- Tile promo badges in `pager_widget` ("акция", "стирка").
- `payment_widgets` Yandex Pay promo.
- Eats restaurant-page and search ads (not in capture).
- Market search-result incuts were present only as empty `madvIncut` in the capture; sponsored product rows in search not yet observed.
- Market product card (KM) page and Eats restaurant menu page not captured yet.
- `yandex.ru/suggest-market` returns personal search history (no ads) — never paste into the repo.
- Afisha web view (`afisha.yandex.ru`, opened from the tile with `promo_mode=normal`): lazy chunks `PromoBottomSheet`, `PromoFullscreen-component`, `ChatBotWidget` loaded but their data source was not seen (not in `api/graphql` responses); likely AdFox-driven and gone with the rules — unverified. Event `promoImage*`/`promoVideo*` fields in graphql are event artwork, not ads.
- Service landings opened deliberately, not touched: `care.yandex.ru/go/home` (insurance "unique selling propositions" cards), `rentacar.yandex.ru` (own `promoBlocks`, e.g. motorcycle promo), Eats pharmacy `pharmacies-media/v1/articles` (health journal cards).
- Not blocked: `api.browser.yandex.ru/uma_proto` (browser-engine telemetry; would need an extra MITM host).
- Lavka: not handled, because Shadowrocket's MITM triggers a captcha (see the Lavka section). If that ever changes, a reject on `adv/v1/banners` and `adv/v1/get-banners` covers the hero carousels; otherwise the unused Lavka handlers could be dropped from the script.
- Location-permission bar fix is experimental (on since Oct 2026) — see next section.

### Go location-permission bar (experimental fix)

"Включите геопозицию" / "Не видим, где вы", "Ввести адрес", "В настройки".

Shown at the top of the **main screen on launch** when iOS location access is off. The bar itself is native (strings are not in any response, see history below), but its trigger appears to be server state:
- At launch the app has no location and sends the zero-km fallback pin (`position_location_provider: zero_km`, `position_init_action: auto_location`, pin at Moscow's zero-km point). `persuggest/v1/finalsuggest` and the superapp layout's `shared.finalsuggest` copy answer `should_clarify_position: true` + `conditional_actions_v2[].actions[] {type: show_point_clarification_screen, action_reason: bad_coord_provider}` ("Куда подать машину?" screen).
- User observation (2026-09-27): opening Taxi and going back removes the bar. Capture confirms: after Taxi opens, the next finalsuggest carries the pin moved to the suggested address (no `zero_km` provider / init action) and the response has **no** `should_clarify_position` and no clarification action.
- Fix: `clearPositionClarification()` sets `should_clarify_position: false` and drops only `show_point_clarification_screen`/`bad_coord_provider` actions, in finalsuggest responses (`yandexgo-finalsuggest` script line) and in `shared.finalsuggest` of the superapp layout. This reproduces the post-Taxi state the app already reaches on its own. Kill switch: `HIDE_LOCATION_BAR` constant at the top of that block — currently `true` (turned on in Oct 2026; it was `false` before).
- Status: **unverified on device**. If the bar persists, the trigger is the `zero_km` provider on the client and nothing server-side can hide it → revert (set the constant to false or remove the script line). Side effect to watch: the Taxi "Куда подать машину?" confirmation no longer appears at launch with location off; pickup defaults to the suggested address, same as after the manual Taxi round-trip.
- History: all five earlier captures searched for the four strings (decoded JSON, HTML, i18n keysets, yastatic JS, NBSP-tolerant) — none delivered over the network. `explaining_location_permission_screen_with_agreement` experiment (GDPR permission explainer) is unrelated and left alone. Workaround if the fix fails: iOS Settings → Yandex Go → Location "While Using".
