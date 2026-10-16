# adblocking-modules

Shadowrocket modules that remove ads, promo and tracking from Russian iOS apps.

## Install

Shadowrocket → Config → Modules → **+** → paste a module link.
HTTPS decryption must be on and the Shadowrocket CA certificate trusted (Settings → General → About → Certificate Trust Settings).

| App | Module |
|---|---|
| Avito | [https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Avito/avito.sgmodule](https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Avito/avito.sgmodule) |
| MegaFon | [https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Megafon/megafon.sgmodule](https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Megafon/megafon.sgmodule) |
| Ozon Bank | [https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Ozon/ozon-bank.sgmodule](https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Ozon/ozon-bank.sgmodule) |
| Ozon Marketplace | [https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Ozon/ozon-marketplace.sgmodule](https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Ozon/ozon-marketplace.sgmodule) |
| Yandex Maps | [https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Yandex/yandex-maps.sgmodule](https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Yandex/yandex-maps.sgmodule) |
| Yandex Go | [https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Yandex/yandex-go.sgmodule](https://raw.githubusercontent.com/b333b/adblocking-modules/refs/heads/main/Yandex/yandex-go.sgmodule) |

After an update, refresh the module in Shadowrocket, then force-quit and relaunch the app.

## Notes

- MegaFon and Ozon Marketplace have switches in the module's settings. MegaFon changes may only show from the second launch.
- A module's rules apply to all traffic while it is on, not only to its app.
- Yandex Go doesn't remove Lavka ads: Shadowrocket can't decrypt Lavka.
- `Ozon/Script/ozon-bank-debug.js` is for troubleshooting and isn't loaded by any module. When enabled, it serves captured personal data (name, email, phone, card ids) on unauthenticated `finance.ozon.ru/__dump` pages. Turn it off when done.

Technical notes: [CLAUDE.md](CLAUDE.md).
