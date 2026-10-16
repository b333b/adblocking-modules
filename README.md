# adblocking-modules

Shadowrocket modules that remove ads, promo and tracking from Russian iOS apps.

## Install

Shadowrocket → Config → Modules → **+** → paste a module link below.
HTTPS decryption must be on and the Shadowrocket CA certificate trusted (Settings → General → About → Certificate Trust Settings).

| App | Module (raw link) | Removes |
|---|---|---|
| Avito | [https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Avito/avito.sgmodule](https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Avito/avito.sgmodule) | Ads and promos in the home feed, search, favorites, item card and my listings; ad-tech and telemetry hosts |
| MegaFon | [https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Megafon/megafon.sgmodule](https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Megafon/megafon.sgmodule) | Promo banners, stories, pop-ups ("Финансовый помощник", in-app campaigns, pop-up offers), "Вам подарок" and partner offers, loan marketplace tab, Game Center, "what's new" tips, surveys, "new" badges, promo shortcuts, the "turn off VPN" bar, chosen main-screen sections (Мега5G, МегаСемья, Кешбэк, Роуминг) and the "Для меня" tab; Yandex Metrica, MyTracker and app telemetry |
| Ozon Bank | [https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Ozon/ozon-bank.sgmodule](https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Ozon/ozon-bank.sgmodule) | Banner carousel, card offers ("Карта с выгодой", "Ozon Карта в корзине"), "Новый счёт или продукт", order-card prompts, promo sections of the "Выгода" screen |
| Ozon Marketplace | [https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Ozon/ozon-marketplace.sgmodule](https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Ozon/ozon-marketplace.sgmodule) | Sponsored banners and videos, curtain pop-ups, prize-draw banners, "Реклама" tiles and sponsored products in search results |
| Yandex Maps | [https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Yandex/yandex-maps.sgmodule](https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Yandex/yandex-maps.sgmodule) | Promo objects, ad pins, showcase, search hints, Plus, audio ads in navigation, trackers |
| Yandex Go | [https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Yandex/yandex-go.sgmodule](https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Yandex/yandex-go.sgmodule) | Recommendation feed, splash and promo pop-ups, map badges, Market and Eats ads (not Lavka's), ad-network and analytics trackers |

After an update, refresh the module in Shadowrocket, then force-quit and relaunch the app.

## Notes

- MegaFon has on/off switches for each kind of block (banners, stories, popups, offers, loans, games,
  onboarding, surveys, badges, vpn_warning, for_me_tab, analytics) and lists of main-screen sections,
  shortcuts and extra feature flags to hide, in the module's settings in Shadowrocket; the settings
  description lists every available value. A change may only show up from the second launch of the
  app (it shows its stored copy first).
- Ozon Marketplace has on/off switches (ad widgets, curtains, ad tiles and sponsored products in search) in the module's settings in Shadowrocket. All are on by default.
- Rules and rewrites apply to all traffic while a module is on, not only to its app. The Yandex Maps
  module blocks all `yandex.ru/clck/` links, including the redirect links the Yandex Go module leaves working.
- `Ozon/Script/ozon-bank-debug.js` is for troubleshooting only and is not loaded by any module. When
  enabled, it stores captured responses (name, email, phone, card ids) in Shadowrocket's script storage
  and serves them on unauthenticated `finance.ozon.ru/__dump` pages. Turn it off when done.

Technical notes for each module are in [CLAUDE.md](CLAUDE.md).
