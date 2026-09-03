# Week

A weekly planner with no dates. Seven columns, Monday to Sunday, filled by typing
sentences into one prompt at the bottom:

```
monday bike ride 2h from 8, intervals 5x10
then shower 15min
lunch 30 min at 11
math until 17
#todo send application 1h from 19
```

Blocks appear in the grid as you type and commit on Return.

## How it works

Times are minutes from midnight and days are `0`–`6`, so the app has no dates,
no timezones and no calendar arithmetic.

Blocks are sized by duration with a readable floor, and empty stretches collapse
to a single line, so a full day and an empty one look different at a glance.

Every line is parsed locally by `src/parse.ts` — instant, free and offline.
Lines it cannot read are the only ones that need anything else.

## Sync

Off by default: the plan lives in `localStorage` and nothing is sent anywhere.
Turning it on gives every device the same week - see [SETUP.md](SETUP.md).

Devices merge rather than overwrite. Each block and todo carries the time it
last changed, deletes leave a tombstone, and both the client and the Worker
merge by newest-change-per-item, so two devices editing at once cannot lose
work. The merge is pure and lives in `src/sync.ts`, shared by both sides.

## Commands

    npm run dev      # http://localhost:5173
    npm test         # parser, layout and rendering tests
    npm run build    # production build into dist/

    npx wrangler deploy   # sync API (see SETUP.md first)

`BASE_PATH` sets the base URL for the build (`/week/` on GitHub Pages).
