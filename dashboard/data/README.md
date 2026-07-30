# Dashboard data

This directory holds the JSON the static dashboard reads (`index.json`,
`facets.json`, `briefs.json`, `meta.json`, `tools.json`, and `video/*.json`).

**Nothing in here is tracked except this file.** The whole directory is
generated, and `npm run dashboard:data` fills it with your real corpus —
retrieved third-party content that must never be pushed (see
[`.github/SECURITY.md`](../../.github/SECURITY.md)).

## Generating it

Both generators run from `dist/`, so build once first:

```bash
npm run build

# Real data, from your local pipeline state. Local-only, always ignored.
npm run dashboard:data

# Small, fully-synthetic demo dataset — no real scraped content.
node scripts/make-demo-data.mjs
```

Either command produces a directory the dashboard can serve. Run whichever
suits what you are doing; neither can be committed.

## Why none of it is tracked

The demo dataset used to be committed so the dashboard rendered in this public
repository, and the four index files were tracked as that demo. This meant a
real pipeline run left them *modified* rather than *untracked*, so the only
thing standing between a real corpus and a public push was remembering to
restore the demo first. The suggested guard was `git update-index
--skip-worktree`, which is per-clone, silently lost, and easy to undo.

That failed in practice: a routine `npm run dashboard:data` left 434 real
videos and their creator handles sitting in tracked files. Ignoring the
directory outright removes the failure mode instead of documenting it.

The cost is that the dashboard no longer renders from a fresh clone. Run
`npm run build && node scripts/make-demo-data.mjs` first — it takes a second
and needs no pipeline state, no API keys, and no corpus.
