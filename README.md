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

## Commands

    npm run dev      # http://localhost:5173
    npm test         # parser, layout and rendering tests
    npm run build    # production build into dist/

`BASE_PATH` sets the base URL for the build (`/week/` on GitHub Pages).
