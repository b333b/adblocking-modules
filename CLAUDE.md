# CLAUDE.md

Context for AI assistants (Claude Code, claude.ai chats) working on this repo.
Chats and Claude Code do not share conversation history: this file is the shared
memory. Update it after any meaningful change. The repo is public, so keep
personal data out of it.

This repo merges the former `avito-adblocking-module`, `ozon-adblocking-module` and
`yandex-adblocking-module` repos (now permanently removed). Their CLAUDE.md files are combined below,
one top-level section per app.

## Contents

| Shared | [Avito](#avito) | [Ozon](#ozon) | [Yandex Maps](#yandex-maps) | [Yandex Go](#yandex-go) |
|---|---|---|---|---|
| [Git](#git) | [App facts](#avito-app-facts) | [Bank: how the main screen is delivered](#ozon-bank-how-the-app-delivers-the-main-screen) | [Target](#maps-target) | [Install](#go-install) |
| [Privacy rules](#privacy-rules) | [Ad pipeline](#avito-ad-pipeline) | [Bank: what is removed](#ozon-bank-what-is-removed-and-how) | [How the app talks to the server](#maps-how-the-app-talks-to-the-server) | [What it removes](#go-what-it-removes) |
| [Modules at a glance](#modules-at-a-glance) | [Endpoint map](#avito-endpoint-map) | [Bank debug workflow](#ozon-bank-debug-workflow) | [Caching](#maps-caching) | [Files and combining with Maps](#go-files-and-combining-with-maps) |
| [Repository layout](#repository-layout) | [Deliberately not touched](#avito-deliberately-not-touched) | [Marketplace](#ozon-marketplace) | [Response types](#maps-response-types-what-each-empty-does) | [Principles](#go-principles) |
| [Shadowrocket reference](#shadowrocket-reference) | [Third-party hosts](#avito-third-party-hosts-seen) | [Script conventions](#ozon-script-conventions) | [MapKit config](#maps-mapkit-config-the-main-ui-switchboard) | [Endpoint map](#go-endpoint-map) |
| [Cross-module overlaps](#cross-module-overlaps) | [Known risks](#avito-known-risks--to-verify-on-device) | [Why rules were not enough](#ozon-why-rules-were-not-enough) | [Endpoint map](#maps-endpoint-map) | [Experiments flipped](#go-experiments-flipped) |
| [README](README.md) | | [Testing](#ozon-testing) · [Privacy](#ozon-privacy-rules) | [Open issues](#maps-open-issues) | [Open items](#go-open-items) |
| | | [When a block comes back](#ozon-when-a-block-comes-back) | [Debugging workflow](#maps-debugging-workflow) | [Location-permission bar](#go-location-permission-bar-experimental-fix) |

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
| Ozon Bank | `ru.ozon.fintech.finance` | [`Ozon/ozon-bank.sgmodule`](Ozon/ozon-bank.sgmodule) | [`Ozon/Script/ozon-bank.js`](Ozon/Script/ozon-bank.js) (clean), [`Ozon/Script/ozon-bank-debug.js`](Ozon/Script/ozon-bank-debug.js) (debug, not loaded by default) | `ozon-banners-page`, `-main`, `-loyalty`, `-list` | `finance.ozon.ru` |
| Ozon Marketplace | — | [`Ozon/ozon-marketplace.sgmodule`](Ozon/ozon-marketplace.sgmodule) | [`Ozon/Script/ozon-marketplace.js`](Ozon/Script/ozon-marketplace.js) | `ozon-mp-composer` | `api.ozon.ru` |
| Yandex Maps | `ru.yandex.traffic` | [`Yandex/yandex-maps.sgmodule`](Yandex/yandex-maps.sgmodule) | [`Yandex/Script/yandex-maps.js`](Yandex/Script/yandex-maps.js) | `yandex-maps` (binary), `yandex-maps-json` | `proxy.mob.maps.yandex.net`, `geointernal.mob.maps.yandex.net`, `avatars.mds.yandex.net`, `yandex.ru`, `egw.home-gateway.plus.yandex.net`, `app.tanker.yandex.net`, `mobile-maps-common.s3.yandex.net` |
| Yandex Go | — | [`Yandex/yandex-go.sgmodule`](Yandex/yandex-go.sgmodule) | [`Yandex/Script/yandex-go.js`](Yandex/Script/yandex-go.js) | `yandexgo-*` (13 entries) | `tc.mobile.yandex.net`, `tc.eats.yandex.ru`, `app.lavka.yandex.net`, `go.integration.market.yandex.ru`, `yandex.ru` |

| App | Last tested on | Written | Status |
|---|---|---|---|
| Avito | 230.1 | from scratch (not a fork) | working |
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
Ozon/ozon-bank.sgmodule            Ozon Bank module, loads the clean script
Ozon/ozon-marketplace.sgmodule     Ozon Marketplace module
Ozon/Script/ozon-bank.js           Ozon Bank clean script
Ozon/Script/ozon-bank-debug.js     Ozon Bank debug script
Ozon/Script/ozon-marketplace.js    Ozon Marketplace script
Yandex/yandex-maps.sgmodule        Yandex Maps module
Yandex/yandex-go.sgmodule          Yandex Go module
Yandex/Script/yandex-maps.js       Yandex Maps script (protobuf + JSON)
Yandex/Script/yandex-go.js         Yandex Go script
```

- One folder per vendor: `<Vendor>/`. Modules (`*.sgmodule`) sit in the vendor folder; the
  scripts they load sit in `<Vendor>/Script/`.
- Module `script-path` values use the raw URL on `main`:
  `https://raw.githubusercontent.com/b333b/adblocking-modules/main/<Vendor>/Script/<file>.js`
- Every module's `#!homepage` is `https://github.com/b333b/adblocking-modules`.
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
- All scripts fail open: unexpected shape → pass the original body through (`$done({})`), never a
  half-edited body.

## Cross-module overlaps

Rules and rewrites apply globally whenever a module is enabled, not only to its app.

| Item | Avito | Yandex Maps | Yandex Go |
|---|---|---|---|
| `amc.yandex.ru` | `DOMAIN` REJECT | | `DOMAIN` REJECT |
| `report.appmetrica.yandex.net` | `DOMAIN` REJECT | `DOMAIN` REJECT | |
| `mc.yandex.ru` | | `DOMAIN-SUFFIX` REJECT | `DOMAIN-SUFFIX` REJECT |
| `app-analytics-services.com` | `DOMAIN` REJECT | | `DOMAIN-SUFFIX` REJECT |
| `yandex.ru` in MITM | no (so `yandex.ru/ads/*` is not rewritten by Avito) | yes | yes |
| `yandex.ru/an/` | | `reject-200` | `reject` |
| `yandex.ru/clck/` | | all of `clck/` → `reject-200` | only `clck/(click\|jclck)` → `reject`; `clck/redir` (real link redirects) deliberately left alone |

With Maps enabled, its broader `yandex.ru/clck/` rule also catches `clck/redir`, which Go
deliberately keeps working. Duplicate REJECT rules are harmless.

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
| [`Ozon/Script/ozon-marketplace.js`](Ozon/Script/ozon-marketplace.js) | [`Ozon/ozon-marketplace.sgmodule`](Ozon/ozon-marketplace.sgmodule) | **marketplace script** — drops ad widgets from composer pages |

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
| `curtain` | pop-up curtain banners |

Any widget whose `name` starts with `rtb.` is dropped whatever its component is.
`argument=` overrides the component list.

Deliberately not included: `banner` (`cms.dynamicBanner`), `pixel`,
`userMarketingActionsSelector`, and sponsored products inside product grids.

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
| Transport | Ad hero banner (erid) on the public-transport screen, "Когда придёт автобус" promo badge over the map | `bdui/v1/masstransit/main` ad section neutered; `inapp-communications` filtered |
| Delivery | Urban-ads banner carousel, "Переезд под ключ"-style story banners on the order form | `ads-banner` widget removed from the dashboard, `urbanads/sdk` neutered, `delivery-promotions` emptied |
| Intercity | Promo/onboarding story banner carousel ("Шаттл", "Что такое Межгород?", "Какой тариф выбрать") | Banners and carousel section removed |
| Chargers | "Как сэкономить?" pass promo and "Яндекс Движ" subscription tile | Chargers screen filtered; QR scan, passes, discounts, support kept |
| Afisha | AdFox ad slots and page branding, Yandex ad-network loader, anti-adblock script | Rules |
| Scooters | Promo tiles (points giveaways, subscription and minute-package upsells, story banners), promo block | Scooters screen filtered; nearest scooter, QR scan and menu kept |
| Market | Hero ad carousel, "Реклама" tiles, sponsored product scrollboxes, ad banners and incuts in feeds and search, banner carousels on promo pages, header promo strip, fortune wheel entries and daily-reward pop-up, coins overlay in the video feed, FOMO sale badge, ad and onboarding pop-ups, bank card / Split / credit upsells in cart and profile, referral promos, "leave a review" nags | Stylesheet injected into Market pages; daily-reward response neutralised |
| Eats | Ad pop-ups (main page, department and pharmacy screens), brand-sponsored pharmacy shelves ("Выберите свой Durex" etc.), hero/recommendation/restaurant-collection ad banners, department ad carousels (food, pharmacy), promo banner shelf, gamification goals, "rate your order" widget, per-restaurant ad trackers | `layout-constructor` and `bdui-mobile` screens rewritten; `eats-communications` answered with `{}` |
| Lavka | Sponsored video banners, advertiser stories (erid), "personal discounts" floating button | `upsale/media-feed` and `informers` filtered; products stay |
| Network | Market ad pixels and click logging, Yandex ad network (counters, loader, AdFox), Yandex anti-adblock script, Metrica (incl. counter subdomains and helpers), AppMetrica reports, video player logs, Firebase Analytics | Rules / URL rewrites |

Service tiles, ride suggestions, the wallet widget, restaurant lists, grocery products and Market's organic product listings are not touched.

### Go files and combining with Maps

- [`Yandex/Script/yandex-go.js`](Yandex/Script/yandex-go.js) — single http-response script, routed by URL (`ROUTES` at bottom)
- [`Yandex/yandex-go.sgmodule`](Yandex/yandex-go.sgmodule) — standalone Go module (rules, URL rewrites, scripts, MITM). May be folded into the Maps module instead; if so, see below and delete this file.

All Go sections append cleanly to the Maps module: `[Rule]`, `[URL Rewrite]`, `[Script]` lines go under the Maps module's matching headers. Keep a single `[MITM]` line and merge hostnames into it (`tc.mobile.yandex.net, tc.eats.yandex.ru, app.lavka.yandex.net, go.integration.market.yandex.ru, yandex.ru`). Script names are prefixed `yandexgo-` so they don't collide. Trade-off: the tracker rules (Metrica, Firebase, ad pixels) and the `yandex.ru` MITM then apply whenever the Maps module is on, and Go can't be toggled separately. See also [Cross-module overlaps](#cross-module-overlaps).

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
  - Handling: `content = []`, snippets' `actions = {}` and `divData` replaced by an empty container.
  - Same engine probably drives the in-ride feed (`superapp_order_details_feed` experiment) — pattern covers `/widgets/layout/` generally; unverified.
- `POST /4.0/promotions/v1/list` — `fullscreen_banners`, `cards`, `notifications`, `tickets`, `stories`, `missed_seen`. Items bound to a real screen (`screens: ["chargers"]`, `feed_taxi_transporting`, `delivery_order_form_ndd`, `scooters`) auto-show → dropped. `NO_SCREEN` items are opened by deeplink (Safety Center promoblock) → kept.
- `POST /4.0/promotions/v1/promotion/retrieve` — single on-demand info cards (wheelchair, pets, guide dogs). Not touched.
- `POST /4.0/promotions/v1/splash` — `splash_screens[]` (`type: dynamic_promo`) → emptied.
- `POST /3.0/launch` — account/session + `typed_experiments` (contains PII in the raw body).
- `POST /4.0/mlutp/v1/products` — taxi main-screen config per mode. `modes[].objects_over_map` = animated campaign badges on the map (e.g. "Почему кирпич?", `analytics_payload.campaign_id`, `yandextaxi://banner?id=` deeplink) → filtered. `charity` menu button left alone.
- `POST /4.0/mlutp/v1/products/screen/scooters-discovery` — scooters sheet. `screen.offers.items[]` + `screen.sections[].shortcut_ids`. Promo tiles: `personal_shortcut:<kind>:…` with kind `mos_ru` ("Дарим 450 баллов"), `subscription`, `packages_entrypoint` ("Пакеты минут"), and `type: deeplink` image banners opening `yandextaxi://story?id=`. `personal_slider` container mirrors its first `nested_offer_ids` tile → re-pointed at the first surviving tile (`nearest_scooter` = "Самокат рядом", functional). Menu list items (subscription, ignition, promocodes, support, safety) kept.
- `POST /4.0/scooters/v1/promoblock` — `{}` observed → `reject-dict`.
- `POST /4.0/mlutp/v1/products/screen/chargers-discovery` — same shape as scooters (handled by the products route). Promo tiles: `personal_shortcut:energy_pass:…` ("Как сэкономить? С выгодным предложением"), `personal_shortcut:city_sub_buy:…` ("Кое-что новое / Яндекс Движ") → dropped via `PROMO_PERSONAL_KINDS`. Kept: QR scan, `passes:id` ("Заряжайтесь выгоднее" menu item), discounts, beacons, support, legal.
- `POST /4.0/bdui/v1/masstransit/main` — Transport screen, flex/DivKit envelope. Sections: where_to, masstransit_suggests, masstransit_transport_card (Тройка), masstransit_tickets_v2, **ads** (`origType: MediaAdvHeroRenderData`, ORD/erid) → neutered by generic `handleBdui` (`AD_SECTION_TYPES`: MediaAdv|SdkBanner|MediaBanners|Madv|CommonBannersWidget) + Madv pop-up actions stripped.
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

- In-ride feed verification (capture during an active ride).
- Tile promo badges in `pager_widget` ("акция", "стирка").
- `payment_widgets` Yandex Pay promo.
- Eats restaurant-page and search ads (not in capture).
- Market search-result incuts were present only as empty `madvIncut` in the capture; sponsored product rows in search not yet observed.
- Market product card (KM) page and Eats restaurant menu page not captured yet.
- `yandex.ru/suggest-market` returns personal search history (no ads) — never paste into the repo.
- Afisha web view (`afisha.yandex.ru`, opened from the tile with `promo_mode=normal`): lazy chunks `PromoBottomSheet`, `PromoFullscreen-component`, `ChatBotWidget` loaded but their data source was not seen (not in `api/graphql` responses); likely AdFox-driven and gone with the rules — unverified. Event `promoImage*`/`promoVideo*` fields in graphql are event artwork, not ads.
- Service landings opened deliberately, not touched: `care.yandex.ru/go/home` (insurance "unique selling propositions" cards), `rentacar.yandex.ru` (own `promoBlocks`, e.g. motorcycle promo), Eats pharmacy `pharmacies-media/v1/articles` (health journal cards).
- Not blocked: `api.browser.yandex.ru/uma_proto` (browser-engine telemetry; would need an extra MITM host).
- Location-permission bar fix is experimental — see next section.

### Go location-permission bar (experimental fix)

"Включите геопозицию" / "Не видим, где вы", "Ввести адрес", "В настройки".

Shown at the top of the **main screen on launch** when iOS location access is off. The bar itself is native (strings are not in any response, see history below), but its trigger appears to be server state:
- At launch the app has no location and sends the zero-km fallback pin (`position_location_provider: zero_km`, `position_init_action: auto_location`, pin at Moscow's zero-km point). `persuggest/v1/finalsuggest` and the superapp layout's `shared.finalsuggest` copy answer `should_clarify_position: true` + `conditional_actions_v2[].actions[] {type: show_point_clarification_screen, action_reason: bad_coord_provider}` ("Куда подать машину?" screen).
- User observation (2026-09-27): opening Taxi and going back removes the bar. Capture confirms: after Taxi opens, the next finalsuggest carries the pin moved to the suggested address (no `zero_km` provider / init action) and the response has **no** `should_clarify_position` and no clarification action.
- Fix: `clearPositionClarification()` sets `should_clarify_position: false` and drops only `show_point_clarification_screen`/`bad_coord_provider` actions, in finalsuggest responses (`yandexgo-finalsuggest` script line) and in `shared.finalsuggest` of the superapp layout. This reproduces the post-Taxi state the app already reaches on its own. Kill switch: `HIDE_LOCATION_BAR` constant at the top of that block.
- Status: **unverified on device**. If the bar persists, the trigger is the `zero_km` provider on the client and nothing server-side can hide it → revert (set the constant to false or remove the script line). Side effect to watch: the Taxi "Куда подать машину?" confirmation no longer appears at launch with location off; pickup defaults to the suggested address, same as after the manual Taxi round-trip.
- History: all five earlier captures searched for the four strings (decoded JSON, HTML, i18n keysets, yastatic JS, NBSP-tolerant) — none delivered over the network. `explaining_location_permission_screen_with_agreement` experiment (GDPR permission explainer) is unrelated and left alone. Workaround if the fix fails: iOS Settings → Yandex Go → Location "While Using".
