# Flisk Grow

**[grow.flisk.si](https://grow.flisk.si)**: paste a link to what you made and get a plan to find its first customers.

One page, free, no sign-in:

- **Can AI search find it**: a Citable score and the top fixes.
- **Who would buy it**: a narrow first group, a one-line pitch, and one step to take today.
- **Where to find them**: 5 to 8 real places those buyers already talk.
- **Emails to send**: 5 drafts that open in Gmail or your mail app. You press Send; nothing is sent for you.
- **Posts to write**: drafts for X, Reddit and Hacker News that open the post box filled in.
- **Where to list it**: Show HN, Product Hunt, SaaSHub, AlternativeTo, BetaList, Toolradar, Uneed, DevHunt.

A plan is kept for 30 days at `/p/<id>`. The same link gets the same plan for 24 hours.

## API

```bash
curl -s https://grow.flisk.si/api/plan -H 'content-type: application/json' -d '{"url": "https://your-site.com"}'
```

Answers `{"id", "created", "plan"}`. `GET /api/plan/<id>` reads a saved plan.

## Limits

Each plan is one call to the free model on [inference.flisk.si](https://inference.flisk.si), which shares a daily budget
with chat.flisk.si. So there are 3 plans a day per visitor and 20 a day in all (`PLANS_PER_VISITOR`, `PLANS_PER_DAY`
in `wrangler.toml`).

## Run it

```bash
bun test          # 15 tests, D1 runs on bun:sqlite
bun scripts/dev.mjs   # http://localhost:8819 with a stand-in model, no key needed
```

## Deploy

A Cloudflare Worker (`flisk-grow`) with D1 (`flisk-grow`) and service bindings to `flisk-inference` and `citable`.

```bash
bunx wrangler@4 d1 create flisk-grow          # once; put the id in wrangler.toml
bunx wrangler@4 d1 execute flisk-grow --remote --file schema.sql
bunx wrangler@4 secret put INFERENCE_KEY      # a key from inference.flisk.si
bunx wrangler@4 deploy
```

MIT license.

## Git hooks

`bun install` (or `bun run prepare`) turns on the hooks in `.githooks/`: pre-commit checks syntax and runs `bun test`, commit-msg needs a sign-off, and pre-push builds the Worker with `wrangler deploy --dry-run`.
