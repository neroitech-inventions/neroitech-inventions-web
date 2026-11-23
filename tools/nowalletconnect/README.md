# NoWalletConnect BAOBAO frontend update

## Included files
- `config.js` — adds the BAOBAO Solana mint constant.
- `index.html` — adds a USDT/BAOBAO selector for Solana payments, passes `asset` to `/verify`, labels payment confirmations with the selected asset, and stores BAOBAO history as `solana:baobao` in the existing network field.
- `checkout.html` — lets payers choose USDT or BAOBAO on Solana and carries the selection into the payment URL.
- `merchant.html` — adds asset choice to payment-link generation and displays the asset in payment history.
- `return.html` — displays the correct token symbol on the merchant return page.
- `WORKER-BAOBAO-CHANGE-NOTES.md` — required Cloudflare Worker changes and test matrix.

## Install
Back up the live files first, then upload these files to the same directory, replacing the corresponding files. Keep the existing image assets and other project files.

## Important behavior
- BAOBAO payments are on Solana only. Polygon remains USDT-only.
- Merchants continue to use their existing Solana wallet. The Worker must resolve the BAOBAO token account for that wallet.
- Amounts are token-denominated. A fixed amount of `250` with BAOBAO selected means 250 BAOBAO, not $250 and not 250 USDT converted at market price.
- The Cloudflare Worker was not included in the uploads, so the `/verify` endpoint still needs its separate server-side implementation before BAOBAO payments can be automatically confirmed. The frontend fails closed unless the Worker explicitly echoes `asset: "baobao"` and the exact BAOBAO mint. Do not advertise BAOBAO as live until that Worker is deployed and tested.
- The frontend currently uses 6 decimal places for BAOBAO. Confirm the mint's actual on-chain decimals and align the UI precision before launch.

## Validation performed
All inline JavaScript blocks in the modified HTML files and `config.js` passed `node --check`. This is a syntax check only; it does not replace browser, RPC, or end-to-end payment testing.
