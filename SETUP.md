# Sync

**Already deployed.** The sync API runs at
<https://week-sync.bergealpint.workers.dev> on the `bergealpint` Cloudflare
account, backed by a KV namespace. Steps 1-4 below are done; they are kept as
a record of how it was set up and what to repeat if it ever has to move.

To check it is healthy at any time:

    npm run check:sync

That exercises the real endpoint: rejecting bad codes, storing and reading a
plan, merging two devices, honouring a delete, refusing a stale resurrection,
and the CORS rules.

## What is left for you

Connect each device - steps 5 and 6.

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

- paste `https://week-sync.bergealpint.workers.dev`
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

---

# Letting Claude read the odd line

The parser handles anything with a time in it. Lines it cannot place — "gym
sometime after lunch", "squeeze in a run before dinner" — are the only ones
that go to Claude, and only when you press Return.

**Everything is built and deployed. One step left: the key.**

## 1. Make an API key

<https://console.anthropic.com/settings/keys> — create a key and copy it.

While you are there, set a spend limit at
<https://console.anthropic.com/settings/limits>. Nothing here should approach
it, but a limit is the thing that makes a mistake cheap.

## 2. Give it to the worker

    npx wrangler secret put ANTHROPIC_API_KEY

Paste the key when it asks. It is stored by Cloudflare, never in this repo and
never in the browser.

## 3. Check it

    npm run check:sync

The last line changes from `SKIP interpretation` to a placed block.

## Which model

Claude Haiku 4.5 by default. Pulling a time out of one sentence is not deep
work, and you are waiting mid-sentence for the answer, so speed is worth more
here than reasoning depth.

Cost barely enters into it. At roughly 600 tokens in and 200 out, ten lines a
week comes to about **80p a year on Haiku against £4 on Opus** — both small
enough to ignore. Latency is the real difference.

To try another:

    npx wrangler secret put MODEL      # e.g. claude-sonnet-5

And to decide on evidence rather than opinion:

    ANTHROPIC_API_KEY=sk-... npm run compare:models

That runs the same awkward lines — "gym sometime after lunch", "squeeze in a
run before dinner", and one line of nonsense that must *not* produce a block —
through Haiku, Sonnet and Opus using the worker's real prompt, and prints what
each placed and how long it took.

The worker allows 100 interpretations per sync code per day. That cap exists
because the sync code is the only lock: if it ever leaks, the worst case is
capped at about a dollar a day rather than your whole limit.

## If it goes wrong

The line you typed comes back into the prompt with the reason underneath, so
nothing you wrote is lost. Turning the key off again is
`npx wrangler secret delete ANTHROPIC_API_KEY`; the app falls back to telling
you it could not read the line.
