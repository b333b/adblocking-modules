# adblocking-modules

Shadowrocket modules that remove ads, promo and tracking from Russian iOS apps.

## Install

Shadowrocket → Config → Modules → **+** → paste a module link below.
HTTPS decryption must be on and the Shadowrocket CA certificate trusted (Settings → General → About → Certificate Trust Settings).

| App | Module (raw link) | Removes |
|---|---|---|
| Avito | [avito.sgmodule](https://raw.githubusercontent.com/b333b/adblocking-modules/main/Avito/avito.sgmodule) | Ads and promos in the home feed, search, favorites, item card and my listings; ad-tech and telemetry hosts |
| Ozon Bank | [ozon-bank.sgmodule](https://raw.githubusercontent.com/b333b/adblocking-modules/main/Ozon/ozon-bank.sgmodule) | Banner carousel, card offer, "Новый счёт или продукт", order-card section, promo sections of the "Выгода" screen |
| Ozon Marketplace | [ozon-marketplace.sgmodule](https://raw.githubusercontent.com/b333b/adblocking-modules/main/Ozon/ozon-marketplace.sgmodule) | Sponsored banners and videos, curtain pop-ups, prize-draw banners |
| Yandex Maps | [yandex-maps.sgmodule](https://raw.githubusercontent.com/b333b/adblocking-modules/main/Yandex/yandex-maps.sgmodule) | Promo objects, ad pins, showcase, search hints, Plus, audio ads in navigation, trackers |
| Yandex Go | [yandex-go.sgmodule](https://raw.githubusercontent.com/b333b/adblocking-modules/main/Yandex/yandex-go.sgmodule) | Recommendation feed, splash and promo pop-ups, map badges, Market/Eats/Lavka ads, ad-network and analytics trackers |

After an update, refresh the module in Shadowrocket, then force-quit and relaunch the app.

## Notes

- Rules and rewrites apply to all traffic while a module is on, not only to its app. The Yandex Maps
  module blocks all `yandex.ru/clck/` links, including the redirect links the Yandex Go module leaves working.
- `Ozon/Script/ozon-bank-debug.js` is for troubleshooting only and is not loaded by any module. When
  enabled, it stores captured responses (name, email, phone, card ids) in Shadowrocket's script storage
  and serves them on unauthenticated `finance.ozon.ru/__dump` pages. Turn it off when done.

Technical notes for each module are in [CLAUDE.md](CLAUDE.md).
