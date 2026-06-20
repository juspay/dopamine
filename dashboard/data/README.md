# Dashboard data

This directory holds the JSON the static dashboard reads
(`index.json`, `facets.json`, `meta.json`, `tools.json`, and `video/*.json`).

**What is committed here is a small, fully-synthetic demo dataset** so the
dashboard renders in this public repository. None of it is real scraped content.
Regenerate the demo with:

```bash
node scripts/make-demo-data.mjs
```

## Real data is local-only

When you run the pipeline, `npm run dashboard:data` overwrites the files here
with your real results. **Do not commit that** — retrieved third-party content
must never be pushed (see [`.github/SECURITY.md`](../../.github/SECURITY.md)).

- Real per-video files (`video/<account>_<id>.json`) are git-ignored.
- The four index files (`index.json`, `facets.json`, `meta.json`, `tools.json`)
  are tracked as the demo. After a real run they will show as modified. To keep
  them from showing up in `git status`, mark them skip-worktree:

  ```bash
  git update-index --skip-worktree dashboard/data/index.json \
    dashboard/data/facets.json dashboard/data/meta.json dashboard/data/tools.json
  ```

  Undo with `--no-skip-worktree`, then `node scripts/make-demo-data.mjs` to
  restore the committed demo before pushing.
