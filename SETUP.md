# Turning on sync

Until this is done, Week works exactly as before: the plan lives in one
browser and never touches the network. Nothing below changes the app itself.

## 1. Make a Cloudflare account

<https://dash.cloudflare.com/sign-up>

Free, and no card is needed for what this uses. Verify the email, then stop —
you do not need to add a domain or a website when it asks.

## 2. Let wrangler use the account

In this folder:

    npx wrangler login

A browser opens; approve the request, then come back to the terminal.

## 3. Make the store the plan lives in

    npx wrangler kv namespace create WEEK

It prints something like:

    id = "3f8a1c92b0e14e3f9a7d2c5b6e8f0a11"

Copy that id into `wrangler.toml`, replacing `REPLACE_WITH_KV_NAMESPACE_ID`.

## 4. Deploy the sync API

    npx wrangler deploy

It prints the address, something like:

    https://week-sync.your-name.workers.dev

Keep it.

## 5. Connect this browser

Open <https://bergebakken.github.io/week/>, click the gear in the header, and:

- paste the address from step 4
- click **New code**, which makes a long random code
- click **Connect**

The gear turns green when the plan is saved.

## 6. Connect the phone

Open the same page on the phone, gear, and enter **the same address and the
same code**. That code is what ties the two devices together.

## What to know

- **The code is the only lock on your plan.** Anyone who has it can read and
  change your week. Treat it like a password; do not put it in a screenshot.
- **Edits merge rather than overwrite.** Every block and todo carries the time
  it last changed, deletions leave a marker behind, and both the app and the
  server merge by taking the newer change per item. Ticking a todo on the phone
  while the laptop is open will not lose either change.
- **It still works offline.** Changes are kept locally and pushed when the
  connection comes back.
- **If the site ever moves** to a different address, add it to
  `ALLOWED_ORIGINS` in `worker/index.ts` and deploy again, or the browser will
  block the requests.

## Costs

Cloudflare's free tier covers 100,000 requests a day. Week checks for changes
every 20 seconds while its tab is open, which is roughly 4,000 a day per device.
