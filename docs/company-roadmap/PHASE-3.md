# Phase 3 — one collection with recoverable ownership

Camp contains a single Founding Explorers offer at ₹199 (19,900 paise), with explicit contents: Polly's welcome cape, Pengu's navigator vest, Retsba's expedition jacket, Abster's discovery apron, an Aurora Camp background, supporter profile badge and Aurora postcard frame. All items can be previewed before purchasing. There is no currency, random reward, subscription or change to rules/learning access.

The established 24 mascot illustrations remain unchanged. Accessories are original, code-native vector overlays. Earned outfits still work; the collection can be unequipped separately from Camp/frame/badge settings. The collection preview is confined to Camp.

## Payment activation

The current APK is distributed directly. Its optional adapter uses Razorpay hosted Payment Links opened in the system browser. It refuses that checkout for an installation reported as coming from Google Play. This is not a Google Play Billing integration; a future Play release must configure compliant Play billing or an applicable enrolled regional programme before selling digital items.

Purchases stay unavailable until all merchant settings in `server/company.env.example` are configured and commerce is explicitly enabled. Test keys expose an explicit test checkout. No merchant credentials were available during implementation, so no real transaction was attempted and charging is not activated by this source release.

On a deployed backend, set DATABASE_URL, deploy the source and generated `server/companyLessons.cjs`, configure merchant name/support/terms/privacy and Razorpay keys. Configure signed webhooks at `/arctic-play/v3/razorpay/webhook` for payment_link.paid, refund.processed and payment dispute events. Switch AK_COMMERCE_MODE to live with live keys only after a merchant test purchase, restore and refund are verified. Keep API secrets and signing backup out of Git and APK assets.

Checkout prices/products/account binding are server-controlled. Pending checkout is reused across devices. A success redirect never grants ownership. Webhooks require HMAC-SHA256 over raw bytes. The server fetches the link and payment again, validates product, account, reference, amount, currency, order and captured state, then updates the account ledger. Duplicate/delayed notifications are idempotent. Any refund removes that order's ownership; a separate valid paid order can still confer ownership. Disputes suspend that order for manual review. Restore rechecks the provider and works after recovery-code login on another device.

The app caches the last server-confirmed cosmetic display for up to 30 days on the same account to support offline use. The cache has no purchase authority and is replaced on reconnection. Refund/revocation appearance changes therefore require reconnection; the server ledger remains authoritative.

## Founder measurements

`node -r dotenv/config server/scripts/company-report.js` (from the repository root), or `node -r dotenv/config scripts/company-report.js` from server, reports aggregate opt-in usage counts and purchase states without account IDs. Treat these as a selected cohort: they do not measure every guest or prove retention uplift. Usage is capped to 2,000 recent events per account. Validate first-game conversion, return visits, friend-game completion and purchase interest with a beta before building clubs, subscriptions or token economics.

## Official implementation references

- https://razorpay.com/docs/api/payments/payment-links/create-standard/
- https://razorpay.com/docs/api/payments/payment-links/fetch-id-standard/
- https://razorpay.com/docs/api/payments/fetch-with-id/
- https://razorpay.com/docs/webhooks/validate-test/
- https://support.google.com/googleplay/android-developer/answer/10281818
