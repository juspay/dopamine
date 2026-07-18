# Daily Learnings Digest

After each pipeline run, the final step pushes a short digest of the **top new
learnings** to a push-notification endpoint — so the day's actionable knowledge
reaches you instead of waiting in the dashboard.

## How it works

1. **Select** — videos in `videos/search.db` not yet digested (tracked in
   `videos/digest_state.json`), ranked by verification × implementability ×
   usefulness. Top `DIGEST_TOP_N` (default 5). Zero new videos → **no push**.
2. **Compose** — one Gemini call writes a headline plus one punchy line per
   item. If the model call fails, a mechanical fallback (title + first
   takeaway) is used — the digest never dies from an LLM hiccup. Reel URLs are
   attached by position, never taken from the model.
3. **Deliver** — `POST $DIGEST_PUSH_URL` (default
   `http://localhost:$SHOOTER_LOCAL_PORT/api/notify`, a Shooter-compatible
   notify endpoint) with a bearer token from `DIGEST_PUSH_KEY` or
   `~/.shooter/.env` (`API_KEY=`).
4. **Roll-forward** — items are marked digested **only after a 2xx response**.
   If the push service is down, today's items simply appear in tomorrow's
   digest.

## Bootstrap

On the very first run (no state file), the entire existing corpus is seeded as
already-digested and nothing is sent — the digest covers videos that arrive
*after* the feature lands, never the historical backlog.

## Manual run

```bash
npm run build && npm run digest
```

## Configuration

| Env | Default | Purpose |
|---|---|---|
| `DIGEST_TOP_N` | `5` | Max learnings per push |
| `DIGEST_PUSH_URL` | `http://localhost:54006/api/notify` | Notify endpoint (respects `SHOOTER_LOCAL_PORT`) |
| `DIGEST_PUSH_KEY` | — | Bearer token; falls back to `API_KEY` in `~/.shooter/.env` |

No key and no reachable endpoint → the step logs a skip and the pipeline
continues; nothing is lost.
