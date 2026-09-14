# NoWalletConnect

Accept USDT payments without a wallet-connect popup.

The customer opens a merchant link, fills only the fields you did not lock, scans a QR or copies an address, and sends USDT. NoWalletConnect watches the chain, marks the payment received, and can send the buyer back to your site.

## How it works

```
Merchant website
        ↓
pay.html?merchant=ID[&amount=X][&network=Y]
        ↓
Locked fields stay fixed. Missing fields are filled by the customer.
        ↓
Payment page shows receive address + QR
        ↓
Customer sends exact USDT amount
        ↓
Verifier checks the chain
        ↓
Success screen + explorer link
        ↓
Redirect to merchant return URL
```

1. Each merchant has an ID, email, payout wallets, and a return URL in the database.
2. The public link always contains the merchant ID.
3. `amount` and `network` are optional. If they are in the URL, those controls are locked.
4. The customer never connects a wallet to the site.
5. Funds go directly to the merchant’s Polygon or Solana address.

## Networks

| Network | Token |
|---|---|
| Polygon | USDT (ERC-20) |
| Solana | USDT (SPL) |

Send USDT on the selected network only. The wrong network can mean a lost payment.

## Pages

| File | Role |
|---|---|
| `pay.html` | Customer amount + network screen. Requires `?merchant=YOUR_ID`. Locks any extra params in the URL. |
| Payment page | QR, receive address, 15-minute wait, success, return redirect. |
| `merchant.html` | Merchant dashboard. Sign in with **merchant ID + email**. |
| `guide.html` | Copy-paste Pay button and success-return snippet. |

## Payment links

Base:

```
https://niti.com.ng/tools/nowalletconnect/pay.html?merchant=YOUR_ID
```

| Link | Amount | Network |
|---|---|---|
| `?merchant=NWC` | Customer types it | Customer picks it |
| `?merchant=NWC&amount=49.99` | Locked at 49.99 | Customer picks it |
| `?merchant=NWC&network=solana` | Customer types it | Locked to Solana |
| `?merchant=NWC&amount=49.99&network=polygon` | Locked | Locked |

Proceed continues to the payment page with:

```
?merchant=YOUR_ID&amount=49.99&network=polygon
```

## Embed on a website

Price locked, network open:

```html
<div style="display:inline-block;text-align:center;">
  <a href="https://niti.com.ng/tools/nowalletconnect/pay.html?merchant=MERCHANT_ID&amount=49.99" style="text-decoration:none;">
    <button style="padding:12px 24px;background:linear-gradient(135deg,#00d4ff,#7c3aed);color:#0f1419;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:16px;">
      Pay 49.99 USDT
    </button>
  </a>
  <div style="margin-top:8px;font-size:11px;font-family:sans-serif;">
    <a href="https://niti.com.ng/tools/nowalletconnect/" style="color:#94a3b8;text-decoration:none;">Powered by NoWalletConnect</a>
  </div>
</div>
```

Change the button text, colors, and size if you want. Keep `merchant` in the href. Add `amount` and `network` only when you want those values locked. Keep the Powered by line.

## Success return

After a confirmed payment, checkout redirects to the **webhook / return URL** saved on the merchant row:

```
https://yoursite.com/order-complete?status=success&amount=49.99&tx_hash=0x…&merchant=NWC&network=polygon&payment_id=pay_123
```

Read it:

```js
const q = new URLSearchParams(location.search);
if (q.get("status") === "success" && q.get("merchant") === "MERCHANT_ID") {
  const paid = parseFloat(q.get("amount"));
  const tx = q.get("tx_hash");
  const network = q.get("network");
}
```

The return URL is not passed in the payment link. Set it on the merchant record.

## Merchant dashboard

Sign in with:

- merchant ID
- email on file

No password. Both values must match the same database row.

The dashboard shows:

- checkout / pay link
- wallets on file
- volume, payment count, average, largest payment
- Polygon vs Solana split
- last 7 days
- searchable history and CSV export

History only lists payments whose merchant ID matches the signed-in account.

## Database fields

**Merchants**

| Field | Used for |
|---|---|
| Merchant ID | Public payment handle and login |
| Business name | Dashboard label |
| Polygon wallet | Receive address |
| Solana wallet | Receive address |
| Email | Login (must match ID) |
| Webhook URL | Success return page |

**Payments**

| Field | Used for |
|---|---|
| Date | History and 7-day trend |
| Merchant ID | Filter dashboard rows |
| Amount | Analytics |
| Transaction hash | Explorer link |
| Network | Polygon / Solana split |

## Customer payment flow

1. Open the merchant payment link.
2. Fill any unlocked amount or network field.
3. Send **only USDT** on that network to the shown address.
4. Wait for confirmation. Use **Check again** if needed.
5. Payment window expires after 15 minutes if nothing arrives.
6. On success, the buyer is sent back to the merchant return URL.

## Pricing

- $0.25 one-time setup
- No monthly fee
- No per-transaction fee from NoWalletConnect
- Merchant keeps 100% of received USDT (network gas is paid by the sender)

## What this is not

- Not MetaMask / Phantom WalletConnect
- Not a custodian — payouts go to the merchant wallet
- Not a place to send the wrong token or the wrong chain

## Support

- Telegram: [t.me/noWalletConnect](https://t.me/noWalletConnect)
- Docs: [NoWalletConnect-Docs.pdf](https://github.com/solacediamond/nowalletconnect/blob/main/NoWalletConnect-Docs.pdf)

## License

Use with a valid merchant ID issued by NoWalletConnect.
